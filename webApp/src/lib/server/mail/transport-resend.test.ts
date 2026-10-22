import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAddress } from "@/lib/mail/address.mjs";
import { HARD_CAP_MS } from "./limits";
import { MailTransportError, type MailMessage } from "./transport";
import { ResendTransport } from "./transport-resend";

const KEY = "re_test";

interface Seen {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}

const servers: http.Server[] = [];

async function startFake(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  const requests: Seen[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      let body: unknown = raw;
      try {
        body = JSON.parse(raw);
      } catch {}
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });
      handler(req, res);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${port}`, port, requests };
}

const json = (status: number, body: unknown) => (_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

afterEach(async () => {
  vi.restoreAllMocks();
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    await new Promise((resolve) => s.close(resolve));
  }
});

const MESSAGE: MailMessage = {
  to: { email: "alumna@test.local", name: "Doe, Jane" },
  from: { email: "hola@humano.test", name: "Escuela, Humano" },
  subject: "Tu inscripción en Tarot ☽",
  html: "<p>Hola ñandú</p>",
  text: "Hola ñandú",
  idempotencyKey: "localhost:3000/welcome/d0000000-0000-4000-8000-000000000003/account",
};

async function rejection(promise: Promise<unknown>): Promise<MailTransportError> {
  const err = await promise.then(
    () => {
      throw new Error("resolvió y tenía que rechazar");
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(MailTransportError);
  const mte = err as MailTransportError;
  // La clave no viaja en ningún error (c.13).
  expect(String(mte)).not.toContain(KEY);
  expect(JSON.stringify(mte)).not.toContain(KEY);
  expect(mte.message).not.toContain(KEY);
  return mte;
}

describe("ResendTransport contra un Resend falso (ADR-014)", () => {
  it("200: un POST /emails con Bearer, Idempotency-Key y el body exacto en UTF-8", async () => {
    const fake = await startFake(json(200, { id: "em_1" }));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE);

    expect(fake.requests).toHaveLength(1);
    const [req] = fake.requests;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("/emails");
    expect(req.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(req.headers["content-type"]).toMatch(/^application\/json/);
    expect(req.headers["idempotency-key"]).toBe(MESSAGE.idempotencyKey);
    expect(req.body).toEqual({
      from: formatAddress(MESSAGE.from),
      to: ["alumna@test.local"],
      subject: MESSAGE.subject,
      html: MESSAGE.html,
      text: MESSAGE.text,
    });
    expect((req.body as { from: string }).from).toBe('"Escuela, Humano" <hola@humano.test>');
    expect(JSON.stringify(req.body)).not.toContain("=?UTF-8?");
    // Se loguea el id del proveedor, nunca el destinatario.
    expect(info).toHaveBeenCalledWith("mail_sent", { provider: "resend", provider_id: "em_1" });
    expect(JSON.stringify(info.mock.calls)).not.toContain("alumna@test.local");
  });

  it("sin idempotencyKey el header no existe", async () => {
    const fake = await startFake(json(200, { id: "em_2" }));
    vi.spyOn(console, "info").mockImplementation(() => {});
    await new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send({ ...MESSAGE, idempotencyKey: undefined });
    expect("idempotency-key" in fake.requests[0].headers).toBe(false);
  });

  it("422 validation_error: permanente, con name y message", async () => {
    const fake = await startFake(json(422, { statusCode: 422, name: "validation_error", message: "Invalid `to` field" }));
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(true);
    expect(err.status).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.message).toContain("validation_error");
    expect(err.message).toContain("Invalid");
  });

  it("401: permanente, clave rechazada", async () => {
    const fake = await startFake(json(401, { name: "missing_api_key", message: "Missing API key" }));
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(true);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Resend: RESEND_API_KEY rechazada (401)");
  });

  it("403: permanente y conserva el motivo de Resend (dominio no verificado)", async () => {
    const fake = await startFake(
      json(403, { name: "validation_error", message: "The x.com domain is not verified. Please add and verify it." }),
    );
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(true);
    expect(err.status).toBe(403);
    expect(err.message).toContain("domain is not verified");
  });

  it("409 invalid_idempotent_request es permanente; concurrent_idempotent_requests no", async () => {
    const invalid = await startFake(json(409, { name: "invalid_idempotent_request", message: "x" }));
    const a = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: invalid.baseUrl }).send(MESSAGE));
    expect(a.permanent).toBe(true);
    expect(a.code).toBe("invalid_idempotent_request");

    const concurrent = await startFake(json(409, { name: "concurrent_idempotent_requests", message: "x" }));
    const b = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: concurrent.baseUrl }).send(MESSAGE));
    expect(b.permanent).toBe(false);
  });

  it("429: reintentable", async () => {
    const fake = await startFake(json(429, { name: "rate_limit_exceeded", message: "Too many requests" }));
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(false);
    expect(err.status).toBe(429);
  });

  it("500 JSON y 502 con HTML de proxy: reintentables, sin SyntaxError", async () => {
    const app = await startFake(json(500, { name: "application_error", message: "boom" }));
    expect((await rejection(new ResendTransport({ apiKey: KEY, baseUrl: app.baseUrl }).send(MESSAGE))).permanent).toBe(false);

    const proxy = await startFake((_req, res) => {
      res.writeHead(502, { "content-type": "text/html" });
      res.end("<html><body>Bad Gateway</body></html>");
    });
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: proxy.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(false);
    expect(err.status).toBe(502);
    expect(err.message).toContain("502");
  });

  it("acepta y nunca contesta: rechaza a los timeoutMs, reintentable", async () => {
    const fake = await startFake(() => {});
    const t0 = performance.now();
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl, timeoutMs: 400 }).send(MESSAGE));
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(390);
    expect(elapsed).toBeLessThan(600);
    expect(err.permanent).toBe(false);
    expect(err.message).toBe("Resend: sin respuesta en 400ms");
  });

  it("manda cabeceras 200 y nunca termina el body: la señal también corta la lectura", async () => {
    const fake = await startFake((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.write("{");
    });
    const t0 = performance.now();
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl, timeoutMs: 400 }).send(MESSAGE));
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(390);
    expect(elapsed).toBeLessThan(600);
    expect(err.permanent).toBe(false);
  });

  it("conexión rechazada: reintentable", async () => {
    const fake = await startFake(() => {});
    const closed = servers.pop()!;
    closed.closeAllConnections();
    await new Promise((resolve) => closed.close(resolve));
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(false);
  });

  it("no sigue redirects: la clave no llega a otro host", async () => {
    const other = await startFake(json(200, { id: "robado" }));
    const fake = await startFake((_req, res) => {
      res.writeHead(307, { location: `${other.baseUrl}/emails` });
      res.end();
    });
    const err = await rejection(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE));
    expect(err.permanent).toBe(false);
    expect(fake.requests).toHaveLength(1);
    expect(other.requests).toHaveLength(0);
  });

  it("200 con body no-JSON: resuelve (aceptado) y avisa", async () => {
    const fake = await startFake((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(new ResendTransport({ apiKey: KEY, baseUrl: fake.baseUrl }).send(MESSAGE)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("mail_provider_unparsed_response", expect.objectContaining({ provider: "resend" }));
  });

  it("constructor: clave vacía o timeout fuera de (0, HARD_CAP_MS) no se aceptan (E1)", () => {
    expect(() => new ResendTransport({ apiKey: "" })).toThrow();
    expect(() => new ResendTransport({ apiKey: "  " })).toThrow();
    expect(() => new ResendTransport({ apiKey: KEY, timeoutMs: HARD_CAP_MS })).toThrow();
    expect(() => new ResendTransport({ apiKey: KEY, timeoutMs: 0 })).toThrow();
    expect(() => new ResendTransport({ apiKey: KEY, timeoutMs: -1 })).toThrow();
    expect(() => new ResendTransport({ apiKey: KEY })).not.toThrow();
  });
});

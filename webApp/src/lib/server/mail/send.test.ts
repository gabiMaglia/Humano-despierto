import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HARD_CAP_MS } from "./limits";
import { __setTransportForTests, sendMail } from "./send";
import { MailTransportError, type MailMessage, type MailTransport } from "./transport";

const INPUT = {
  to: { email: "alumna@test.local", name: "Alumna" },
  subject: "Hola",
  html: "<p>Hola</p>",
  text: "Hola",
};

function fakeTransport(impl: (m: MailMessage) => Promise<void>): MailTransport & { calls: MailMessage[] } {
  const calls: MailMessage[] = [];
  return {
    calls,
    send: (m) => {
      calls.push(m);
      return impl(m);
    },
  };
}

async function closedPort(): Promise<number> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

beforeEach(() => {
  __setTransportForTests(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setTransportForTests(null);
});

describe("sendMail elige el transporte por MAIL_TRANSPORT (ADR-014)", () => {
  it("resend: POST a https://api.resend.com/emails, el default de producción", async () => {
    vi.stubEnv("MAIL_TRANSPORT", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("MAIL_FROM_ADDRESS", "a@b.test");
    vi.stubEnv("MAIL_FROM_NAME", "Humano");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));

    await expect(sendMail(INPUT)).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)).from).toBe("Humano <a@b.test>");
  });

  it("sin MAIL_TRANSPORT usa SMTP: no hay fetch", async () => {
    vi.stubEnv("MAIL_TRANSPORT", "");
    vi.stubEnv("SMTP_HOST", "127.0.0.1");
    vi.stubEnv("SMTP_PORT", String(await closedPort()));
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await sendMail(INPUT);
    expect(result.ok).toBe(false);
    expect(result.permanent).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("config inválida al enviar: ok:false, no lanza", async () => {
    vi.stubEnv("MAIL_TRANSPORT", "resend");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendMail(INPUT)).resolves.toMatchObject({ ok: false });
  });
});

describe("sendMail propaga si la falla es permanente", () => {
  it("MailTransportError permanente: ok:false con permanent, status y code", async () => {
    __setTransportForTests(fakeTransport(async () => {
      throw new MailTransportError("x", true, 403, "validation_error");
    }));
    await expect(sendMail(INPUT)).resolves.toEqual({
      ok: false,
      error: "x",
      permanent: true,
      status: 403,
      code: "validation_error",
    });
  });

  it("MailTransportError reintentable o Error común: ok:false sin permanent", async () => {
    __setTransportForTests(fakeTransport(async () => {
      throw new MailTransportError("y", false, 429);
    }));
    const a = await sendMail(INPUT);
    expect(a.ok).toBe(false);
    expect(a.permanent).toBeUndefined();

    __setTransportForTests(fakeTransport(async () => {
      throw new Error("z");
    }));
    const b = await sendMail(INPUT);
    expect(b).toEqual({ ok: false, error: "z" });
  });

  it("la idempotencyKey llega intacta al transporte", async () => {
    const t = fakeTransport(async () => {});
    __setTransportForTests(t);
    await sendMail({ ...INPUT, idempotencyKey: "localhost:3000/welcome/u/account" });
    expect(t.calls[0].idempotencyKey).toBe("localhost:3000/welcome/u/account");
  });

  it("nunca loguea la dirección del destinatario", async () => {
    __setTransportForTests(fakeTransport(async () => {
      throw new Error("boom");
    }));
    await sendMail(INPUT);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("alumna@test.local");
  });

  it("un transporte que nunca resuelve no cuelga: el tope sigue vivo", async () => {
    vi.useFakeTimers();
    __setTransportForTests(fakeTransport(() => new Promise<void>(() => {})));
    const pending = sendMail(INPUT);
    await vi.advanceTimersByTimeAsync(HARD_CAP_MS);
    await expect(pending).resolves.toMatchObject({ ok: false });
  });
});

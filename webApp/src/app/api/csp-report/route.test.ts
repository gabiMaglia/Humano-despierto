import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { MAX_CSP_REPORT_BYTES } from "@/lib/security/csp-report";
import * as route from "./route";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

const VALID = JSON.stringify({
  "csp-report": {
    "document-uri": "http://localhost:3000/entrar/nueva-clave?code=secreto",
    "blocked-uri": "http://127.0.0.1:54321/storage/v1/object/sign/uploads/a.jpg?token=eyJ.x.y",
    "violated-directive": "img-src",
    disposition: "report",
  },
});

function post(body: string, headers: Record<string, string> = {}): Promise<Response> {
  return route.POST(
    new Request("http://localhost:3000/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report", "x-forwarded-for": "203.0.113.7", ...headers },
      body,
    }),
  );
}

let logSpy: MockInstance;

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    logSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetRateLimiterForTests();
  });

  it("valido: 204 sin cuerpo y UNA linea csp_violation sin query strings", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(line).toMatchObject({
      level: "warn",
      event: "csp_violation",
      blocked_uri: "http://127.0.0.1:54321/storage/v1/object/sign/uploads/a.jpg",
      violated_directive: "img-src",
      document_uri: "http://localhost:3000/entrar/nueva-clave",
      disposition: "report",
    });
    expect(String(logSpy.mock.calls[0][0])).not.toMatch(/secreto|token=/);
  });

  it("acepta tambien application/json y application/reports+json", async () => {
    for (const ct of ["application/json", "application/reports+json; charset=utf-8"]) {
      expect((await post(VALID, { "content-type": ct })).status).toBe(204);
    }
  });

  it("otro content-type: 415 y nada al log", async () => {
    expect((await post(VALID, { "content-type": "text/plain" })).status).toBe(415);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("cuerpo no-JSON: 400 y nada al log", async () => {
    expect((await post("{no es json")).status).toBe(400);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("JSON con forma desconocida: 400 y nada al log", async () => {
    expect((await post(JSON.stringify({ hola: 1 }))).status).toBe(400);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("cuerpo mas grande que el tope: 413 aunque content-length mienta", async () => {
    const big = JSON.stringify({ "csp-report": { "violated-directive": "img-src", x: "a".repeat(MAX_CSP_REPORT_BYTES) } });
    expect((await post(big)).status).toBe(413);
    expect((await post(VALID, { "content-length": String(MAX_CSP_REPORT_BYTES + 1) })).status).toBe(413);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("D-46 · sin content-length, deja de leer apenas pasa el tope: 413", async () => {
    let pulled = 0;
    const chunk = new TextEncoder().encode("a".repeat(1024));
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 1000) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const res = await route.POST(
      new Request("http://localhost:3000/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/csp-report", "x-forwarded-for": "203.0.113.7" },
        body,
        duplex: "half",
      } as RequestInit),
    );
    expect(res.status).toBe(413);
    // 16 KiB de tope en trozos de 1 KiB: unos 17 leídos, nunca los 1000 (el stream puede adelantar uno o dos).
    expect(pulled).toBeLessThan(25);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("T-050 · 20 por minuto por IP: el 21 es 429 con Retry-After y no se loguea; otra IP sigue", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:30Z"), toFake: ["Date"] });
    for (let i = 0; i < 20; i++) expect((await post(VALID)).status).toBe(204);
    const res = await post(VALID);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(logSpy).toHaveBeenCalledTimes(20);
    expect((await post(VALID, { "x-forwarded-for": "198.51.100.2" })).status).toBe(204);
    vi.useRealTimers();
  });

  it("solo exporta POST: cualquier otro metodo es 405 de Next", () => {
    expect(Object.keys(route).sort()).toEqual(["POST"]);
  });
});

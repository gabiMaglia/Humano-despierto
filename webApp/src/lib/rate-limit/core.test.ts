import { describe, expect, it } from "vitest";
import {
  MemoryRateLimiter,
  RATE_LIMITED,
  clientIpFrom,
  limitedState,
  rateLimitKey,
  rateLimitMessage,
  windowBounds,
} from "./core";

const RULE = { max: 5, windowSeconds: 600 };
// Mitad de una ventana de 600 s: ninguna llamada de abajo cruza el borde por accidente.
const T0 = Date.UTC(2026, 9, 22, 12, 5, 0);

function clock(start: number) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe("windowBounds", () => {
  it("alinea la ventana al epoch", () => {
    expect(windowBounds(T0, 600)).toEqual({ start: Date.UTC(2026, 9, 22, 12, 0, 0), end: Date.UTC(2026, 9, 22, 12, 10, 0) });
  });
});

describe("MemoryRateLimiter", () => {
  it("cinco pasan con remaining 4..0 y la sexta se rechaza con el tiempo hasta el borde", async () => {
    const c = clock(T0);
    const rl = new MemoryRateLimiter(c.now);
    const r = [];
    for (let i = 0; i < 6; i++) r.push(await rl.hit("k", RULE));
    expect(r.slice(0, 5).map((x) => x.remaining)).toEqual([4, 3, 2, 1, 0]);
    expect(r[5]).toEqual({ ok: false, remaining: 0, retryAfter: 300 });
  });

  it("claves distintas no comparten conteo", async () => {
    const rl = new MemoryRateLimiter(clock(T0).now);
    for (let i = 0; i < 5; i++) expect((await rl.hit("a", RULE)).ok).toBe(true);
    for (let i = 0; i < 5; i++) expect((await rl.hit("b", RULE)).ok).toBe(true);
  });

  it("al cambiar de ventana el conteo vuelve a cero", async () => {
    const c = clock(T0);
    const rl = new MemoryRateLimiter(c.now);
    for (let i = 0; i < 6; i++) await rl.hit("k", RULE);
    c.advance(300_000);
    expect(await rl.hit("k", RULE)).toEqual({ ok: true, remaining: 4, retryAfter: 0 });
  });
});

describe("rateLimitKey", () => {
  it("usuario e IP en espacios separados", () => {
    expect(rateLimitKey("saveReviewAction", { kind: "user", id: "u-1" })).toBe("saveReviewAction:u:u-1");
    expect(rateLimitKey("saveReviewAction", { kind: "ip", ip: "203.0.113.7" })).toBe("saveReviewAction:ip:203.0.113.7");
  });

  it("rechaza un nombre que no es identificador", () => {
    expect(() => rateLimitKey("a:b", { kind: "ip", ip: "unknown" })).toThrow(/nombre/);
  });
});

describe("clientIpFrom", () => {
  const h = (entries: Record<string, string>) => new Headers(entries);
  it.each([
    [{ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }, "203.0.113.7"],
    [{ "x-forwarded-for": " 2001:db8::1 " }, "2001:db8::1"],
    [{ "x-real-ip": "198.51.100.2" }, "198.51.100.2"],
    [{ "x-forwarded-for": "<script>", "x-real-ip": "198.51.100.2" }, "198.51.100.2"],
    [{ "x-forwarded-for": "evil.tld" }, "unknown"],
    [{}, "unknown"],
  ])("%j -> %s", (entries, expected) => {
    expect(clientIpFrom(h(entries))).toBe(expected);
  });
});

describe("rateLimitMessage y limitedState", () => {
  it.each([
    [1, "Demasiados intentos. Esperá 1 segundo y volvé a probar."],
    [42, "Demasiados intentos. Esperá 42 segundos y volvé a probar."],
    [89, "Demasiados intentos. Esperá 89 segundos y volvé a probar."],
    [90, "Demasiados intentos. Esperá 2 minutos y volvé a probar."],
    [540, "Demasiados intentos. Esperá 9 minutos y volvé a probar."],
  ])("%i s", (s, msg) => {
    expect(rateLimitMessage(s)).toBe(msg);
  });

  it("el estado limitado trae code, retryAfter y el mensaje en error", () => {
    expect(limitedState({ ok: false, remaining: 0, retryAfter: 42 })).toEqual({
      error: "Demasiados intentos. Esperá 42 segundos y volvé a probar.",
      success: null,
      code: RATE_LIMITED,
      retryAfter: 42,
    });
  });
});

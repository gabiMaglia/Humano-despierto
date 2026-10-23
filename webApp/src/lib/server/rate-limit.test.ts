import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva sobre los imports: lo que usan las factories se declara con vi.hoisted.
const { subject, rpc } = vi.hoisted(() => ({ subject: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: subject }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: () => ({ rpc }) }));

import { MemoryRateLimiter, RATE_LIMITED, type RateLimiter } from "@/lib/rate-limit/core";
import {
  PostgresRateLimiter,
  RateLimitError,
  __resetRateLimiterForTests,
  createLimit,
  limit,
  withRateLimit,
  type CheckRateLimitRpc,
} from "./rate-limit";

const RULE = { max: 5, windowSeconds: 600 };

beforeEach(() => {
  __resetRateLimiterForTests();
  subject.mockReset();
  rpc.mockReset();
  // Mitad de ventana: los 6 llamados no cruzan el borde de 600 s por azar del reloj real.
  vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("createLimit (fail-open, c.5)", () => {
  it("si el limitador lanza, deja pasar y loguea rate_limit_backend_down", async () => {
    const log = vi.fn();
    const broken: RateLimiter = { hit: async () => { throw new Error("connection refused"); } };
    const r = await createLimit(broken, { deadlineMs: 50, log })("k", RULE);
    expect(r).toEqual({ ok: true, remaining: 5, retryAfter: 0, degraded: true });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toBe("rate_limit_backend_down");
    expect(log.mock.calls[0][1]).toMatchObject({ key: "k", error: "connection refused" });
  });

  // Degradado, no ausente (playbook): el que acepta y no contesta es el que cuelga la action.
  it("si el limitador no contesta nunca, deja pasar al vencer el plazo", async () => {
    vi.useRealTimers();
    const log = vi.fn();
    const mute: RateLimiter = { hit: () => new Promise(() => {}) };
    const t = Date.now();
    const r = await createLimit(mute, { deadlineMs: 30, log })("k", RULE);
    expect(r.ok).toBe(true);
    expect(Date.now() - t).toBeLessThan(1000);
    expect(log.mock.calls[0][0]).toBe("rate_limit_backend_down");
  });

  it("con el limitador sano devuelve su decisión tal cual", async () => {
    const limitWith = createLimit(new MemoryRateLimiter(), { deadlineMs: 50, log: vi.fn() });
    for (let i = 0; i < 5; i++) expect((await limitWith("k", RULE)).ok).toBe(true);
    expect(await limitWith("k", RULE)).toEqual({ ok: false, remaining: 0, retryAfter: 300 });
  });
});

describe("PostgresRateLimiter", () => {
  it("manda los tres argumentos con señal de corte y traduce la fila", async () => {
    const call = vi.fn<CheckRateLimitRpc>(async () => ({
      data: [{ allowed: false, remaining: 0, retry_after_seconds: 42 }],
      error: null,
    }));
    const r = await new PostgresRateLimiter(call, 1500).hit("saveReviewAction:u:u-1", RULE);
    expect(r).toEqual({ ok: false, remaining: 0, retryAfter: 42 });
    expect(call.mock.calls[0][0]).toEqual({ p_key: "saveReviewAction:u:u-1", p_max: 5, p_window_seconds: 600 });
    expect(call.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [{ data: null, error: { message: "AbortError: This operation was aborted" } }],
    [{ data: [], error: null }],
    [{ data: [{ allowed: "si" }], error: null }],
  ])("lanza ante %j para que createLimit haga fail-open", async (res) => {
    await expect(new PostgresRateLimiter(async () => res, 1500).hit("k", RULE)).rejects.toThrow(/check_rate_limit/);
  });
});

describe("limit: backend por entorno", () => {
  it("sin RATE_LIMIT_BACKEND usa Postgres vía service_role, no memoria", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "");
    __resetRateLimiterForTests();
    rpc.mockReturnValue({
      abortSignal: () => Promise.resolve({ data: [{ allowed: true, remaining: 4, retry_after_seconds: 0 }], error: null }),
    });
    expect(await limit("k", RULE)).toEqual({ ok: true, remaining: 4, retryAfter: 0 });
    expect(rpc).toHaveBeenCalledWith("check_rate_limit", { p_key: "k", p_max: 5, p_window_seconds: 600 });
  });
});

describe("withRateLimit", () => {
  it("dentro del límite llama a la action con sus argumentos y devuelve lo suyo", async () => {
    subject.mockResolvedValue({ kind: "user", id: "u-1" });
    const fn = vi.fn(async (a: string, b: number) => `${a}-${b}`);
    const wrapped = withRateLimit("saveReviewAction", fn);
    await expect(wrapped("x", 1)).resolves.toBe("x-1");
    expect(fn).toHaveBeenCalledWith("x", 1);
  });

  it("pasado el límite no llama a la action y devuelve lo de onLimited", async () => {
    subject.mockResolvedValue({ kind: "user", id: "u-2" });
    const fn = vi.fn(async () => "escribió");
    const wrapped = withRateLimit("saveReviewAction", fn, (d) => `limitado ${d.retryAfter}`);
    for (let i = 0; i < 5; i++) await wrapped();
    await expect(wrapped()).resolves.toBe("limitado 300");
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("sin onLimited lanza RateLimitError con el mensaje humano", async () => {
    subject.mockResolvedValue({ kind: "user", id: "u-3" });
    const wrapped = withRateLimit("saveReviewAction", async () => "ok");
    for (let i = 0; i < 5; i++) await wrapped();
    const err = await wrapped().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err).toMatchObject({ code: RATE_LIMITED, retryAfter: 300, message: "Demasiados intentos. Esperá 5 minutos y volvé a probar." });
  });

  it("con un sujeto propio no consulta la sesión y cuenta por ese sujeto", async () => {
    const own = vi.fn(async (ip: string) => ({ kind: "ip" as const, ip }));
    const wrapped = withRateLimit("saveReviewAction", async (ip: string) => `ok ${ip}`, () => "limitado", { subject: own });
    for (let i = 0; i < 5; i++) await expect(wrapped("198.51.100.9")).resolves.toBe("ok 198.51.100.9");
    await expect(wrapped("198.51.100.9")).resolves.toBe("limitado");
    await expect(wrapped("198.51.100.10")).resolves.toBe("ok 198.51.100.10");
    expect(subject).not.toHaveBeenCalled();
    expect(own).toHaveBeenCalledWith("198.51.100.9");
  });

  it("usuario e IP son claves distintas (c.2 del lado de la app)", async () => {
    const wrapped = withRateLimit("saveReviewAction", async () => "ok", () => "limitado");
    subject.mockResolvedValue({ kind: "user", id: "u-4" });
    for (let i = 0; i < 5; i++) await expect(wrapped()).resolves.toBe("ok");
    subject.mockResolvedValue({ kind: "ip", ip: "203.0.113.7" });
    for (let i = 0; i < 5; i++) await expect(wrapped()).resolves.toBe("ok");
    await expect(wrapped()).resolves.toBe("limitado");
  });
});

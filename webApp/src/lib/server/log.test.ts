import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: () => headersMock() }));

import { log } from "./log";

let out: ReturnType<typeof vi.spyOn>;
let err: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  out = vi.spyOn(console, "info").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  err = vi.spyOn(console, "error").mockImplementation(() => {});
  headersMock.mockRejectedValue(new Error("fuera de request"));
});
afterEach(() => vi.restoreAllMocks());

const lineOf = (spy: ReturnType<typeof vi.spyOn>) => {
  expect(spy).toHaveBeenCalledTimes(1);
  const [line] = spy.mock.calls[0] as [string];
  expect(typeof line).toBe("string");
  return JSON.parse(line);
};

describe("log", () => {
  it("info va a stdout; warn y error a stderr, una linea JSON con ts, level y event", async () => {
    await log.info("hola", { a: 1 });
    await log.warn("cuidado");
    await log.error("roto");
    const i = lineOf(out);
    expect(i).toMatchObject({ level: "info", event: "hola", a: 1 });
    expect(new Date(i.ts).toString()).not.toBe("Invalid Date");
    expect(lineOf(warn)).toMatchObject({ level: "warn", event: "cuidado" });
    expect(lineOf(err)).toMatchObject({ level: "error", event: "roto" });
  });

  it("request_id es null fuera de request y sale de x-request-id dentro", async () => {
    await log.info("a");
    expect(lineOf(out).request_id).toBeNull();
    out.mockClear();
    headersMock.mockResolvedValue(new Headers({ "x-request-id": "req-1" }));
    await log.info("b");
    expect(lineOf(out).request_id).toBe("req-1");
  });

  it("serializa Error como { name, message, stack } bajo err", async () => {
    await log.error("x", { err: new TypeError("boom") });
    const l = lineOf(err);
    expect(l.err).toMatchObject({ name: "TypeError", message: "boom" });
    expect(l.err.stack).toContain("boom");
  });

  it("redacta claves sensibles, anidadas y sin distinguir mayusculas", async () => {
    await log.error("x", {
      RESEND_API_KEY: "re_secret",
      token: "t",
      code: "c",
      password: "p",
      nested: { Authorization: "Bearer z", ok: "visible", list: [{ access_token: "q" }] },
    });
    const raw = err.mock.calls[0][0] as string;
    for (const s of ["re_secret", "Bearer z", '"t"', '"c"', '"p"', '"q"']) expect(raw).not.toContain(s);
    const l = JSON.parse(raw);
    expect(l.RESEND_API_KEY).toBe("[redacted]");
    expect(l.nested.ok).toBe("visible");
  });

  it("los campos no pisan ts, level, event ni request_id", async () => {
    await log.info("real", { level: "fake", event: "fake", request_id: "fake", ts: "fake" });
    expect(lineOf(out)).toMatchObject({ level: "info", event: "real", request_id: null });
  });

  it("nunca lanza: referencias circulares y BigInt", async () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    await expect(log.error("x", { a, n: BigInt(1) })).resolves.toBeUndefined();
    expect(err).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { limit } = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock("@/lib/server/rate-limit", () => ({ limit }));
vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import { __setTransportForTests, sendMail } from "./send";

const MAIL = { to: { email: "Alumna@Test.local", name: "Alumna" }, subject: "s", html: "<p>h</p>", text: "t" };
const OK = { ok: true, remaining: 1, retryAfter: 0 };
const DENIED = { ok: false, remaining: 0, retryAfter: 60 };

describe("sendMail con tope (c.6)", () => {
  const send = vi.fn(async () => undefined);
  beforeEach(() => {
    limit.mockReset();
    send.mockClear();
    __setTransportForTests({ send });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });
  afterEach(() => {
    __setTransportForTests(null);
    vi.restoreAllMocks();
  });

  it("pasado el tope global devuelve rate_limited sin tocar el transporte", async () => {
    limit.mockResolvedValueOnce(DENIED);
    await expect(sendMail(MAIL)).resolves.toEqual({ ok: false, error: "rate_limited" });
    expect(send).not.toHaveBeenCalled();
  });

  it("pasado el tope por destinatario, igual", async () => {
    limit.mockResolvedValueOnce(OK).mockResolvedValueOnce(DENIED);
    await expect(sendMail(MAIL)).resolves.toEqual({ ok: false, error: "rate_limited" });
    expect(send).not.toHaveBeenCalled();
  });

  it("la clave por destinatario no lleva el mail y no distingue mayúsculas", async () => {
    limit.mockResolvedValue(OK);
    await sendMail(MAIL);
    await sendMail({ ...MAIL, to: { ...MAIL.to, email: " alumna@test.local " } });
    const keys = limit.mock.calls.map((c) => c[0] as string);
    expect(keys[0]).toBe("mail:global");
    expect(keys[1]).toMatch(/^mail:to:[0-9a-f]{32}$/);
    expect(keys[3]).toBe(keys[1]);
    expect(keys.join(" ")).not.toMatch(/alumna/i);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, subject } = vi.hoisted(() => ({ createClient: vi.fn(), subject: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: subject }));

import { setWishlistAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const COURSE = "c0000000-0000-4000-8000-000000000009";

beforeEach(() => {
  __resetRateLimiterForTests();
  subject.mockResolvedValue({ kind: "user", id: "u-1" });
  createClient.mockReset();
});

describe("setWishlistAction con tope (T-050)", () => {
  it("pasado el tope no escribe y deja el botón como estaba", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
    const insert = vi.fn(async () => ({ error: null }));
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
      from: () => ({ insert }),
    });
    for (let i = 0; i < 60; i++) await setWishlistAction(COURSE, true);
    expect(insert).toHaveBeenCalledTimes(60);
    await expect(setWishlistAction(COURSE, true)).resolves.toEqual({ ok: false, saved: false });
    await expect(setWishlistAction(COURSE, false)).resolves.toEqual({ ok: false, saved: true });
    expect(insert).toHaveBeenCalledTimes(60);
    vi.useRealTimers();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveInvitationVisit: vi.fn(),
  subject: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: {} }) }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/server/invitations", () => ({ acceptInvitation: vi.fn() }));
vi.mock("@/lib/server/invitation-visit", () => ({ resolveInvitationVisit: mocks.resolveInvitationVisit }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: mocks.subject }));

import { NextRequest } from "next/server";
import { GET } from "./route";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const TOKEN = "t".repeat(43);

function call(): Promise<Response> {
  return GET(new NextRequest(`http://localhost:3000/invitacion/${TOKEN}`), { params: Promise.resolve({ token: TOKEN }) });
}

beforeEach(() => {
  __resetRateLimiterForTests();
  mocks.resolveInvitationVisit.mockReset().mockResolvedValue("/panel/docente");
  mocks.subject.mockResolvedValue({ kind: "ip", ip: "203.0.113.7" });
});

describe("GET /invitacion/[token] con tope (T-050)", () => {
  it("pasado el tope responde 429 con Retry-After, privado, sin tocar la invitación", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:05:00Z"), toFake: ["Date"] });
    for (let i = 0; i < 30; i++) expect((await call()).status).toBe(307);
    mocks.resolveInvitationVisit.mockClear();
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("300");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("location")).toBeNull();
    expect(mocks.resolveInvitationVisit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

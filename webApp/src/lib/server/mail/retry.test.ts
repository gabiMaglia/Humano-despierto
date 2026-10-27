import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: null as unknown, limit: vi.fn() }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: () => mocks.db }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "https://humano.example" }));
vi.mock("@/lib/server/rate-limit", () => ({ limit: mocks.limit }));
vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import { notifyAnnouncementPublished, retryPendingAnnouncementMail } from "./notify";
import { __setTransportForTests } from "./send";

const ANUNCIO = "a3100000-0000-4000-8000-000000000001";
const OK = { ok: true, remaining: 1, retryAfter: 0 };
const DENIED = { ok: false, remaining: 0, retryAfter: 60 };

// Una "base" mínima: mail_log con attempts reales para ver si un tope de envío gasta intentos.
function fakeDb(n: number) {
  const slots = new Map<string, { id: string; attempts: number; sentAt: string | null; reclaimable: boolean }>();
  const released: string[] = [];
  const db = {
    slots,
    released,
    from(table: string) {
      const f: Record<string, unknown> = {};
      const res = () => {
        if (table === "course_announcements")
          return { data: { id: ANUNCIO, course_id: "c1", author_id: "autora", title: "t", body: "b", status: "published", deleted_at: null }, error: null };
        if (table === "courses")
          return { data: { id: "c1", title: "Tarot", slug: "tarot", teacher_id: "autora", teacher: { full_name: "Sol" } }, error: null };
        if (table === "enrollments") {
          const [from, to] = f.__range as [number, number];
          return { data: Array.from({ length: n }, (_, i) => ({ user_id: `u-${i}` })).slice(from, to + 1), error: null };
        }
        if (table === "profiles") return { data: { id: f.id, full_name: `Alumna ${String(f.id)}` }, error: null };
        if (table === "mail_log") {
          const pend = [...slots.entries()].filter(([, s]) => !s.sentAt && s.attempts < 3 && s.reclaimable);
          return { data: pend.map(() => ({ scope_key: ANUNCIO })), error: null };
        }
        throw new Error(`tabla inesperada: ${table}`);
      };
      const c: Record<string, unknown> = {
        select: () => c, order: () => c, limit: () => c, update: () => c,
        eq: (k: string, v: unknown) => ((f[k] = v), c),
        is: (k: string, v: unknown) => ((f[k] = v), c),
        lt: (k: string, v: unknown) => ((f[k] = v), c),
        range: (a: number, b: number) => ((f.__range = [a, b]), c),
        maybeSingle: async () => res(),
        then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => {
          if (table === "mail_log" && f.id) {
            const s = [...slots.values()].find((x) => x.id === f.id);
            if (s) s.sentAt = "now";
            return Promise.resolve({ error: null, count: 1 }).then(ok, ko);
          }
          return Promise.resolve(res()).then(ok, ko);
        },
      };
      return c;
    },
    async rpc(fn: string, a: Record<string, string>) {
      if (fn === "release_rate_limited_mail_slot") {
        released.push(a.p_id);
        const s = [...slots.values()].find((x) => x.id === a.p_id);
        if (s) { s.attempts -= 1; s.reclaimable = true; }
        return { data: null, error: null };
      }
      const key = a.p_recipient_user_id;
      const s = slots.get(key);
      if (!s) {
        slots.set(key, { id: `claim-${key}`, attempts: 1, sentAt: null, reclaimable: false });
      } else if (s.sentAt || s.attempts >= 3 || !s.reclaimable) {
        return { data: [], error: null };
      } else {
        s.attempts += 1; s.reclaimable = false;
      }
      return { data: [{ id: `claim-${key}`, claimed_at: "2026-10-27T10:00:00Z" }], error: null };
    },
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: `${id}@humano.test` } }, error: null }) } },
  };
  return db;
}

describe("D-51 · anuncio contra el tope global de sendMail", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.limit.mockReset();
  });
  afterEach(() => {
    __setTransportForTests(null);
    vi.restoreAllMocks();
  });

  it("el tope no gasta intentos: el turno se libera y la tanda diferida lo manda", async () => {
    const db = fakeDb(3);
    mocks.db = db;
    const send = vi.fn(async () => {});
    __setTransportForTests({ send });

    mocks.limit.mockResolvedValue(DENIED);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(send).not.toHaveBeenCalled();
    expect(db.released).toHaveLength(3);
    for (const s of db.slots.values()) expect(s.attempts).toBe(0);

    mocks.limit.mockResolvedValue(OK);
    const out = await retryPendingAnnouncementMail();
    expect(out.announcements).toBe(1);
    expect(send).toHaveBeenCalledTimes(3);
    for (const s of db.slots.values()) expect(s.sentAt).not.toBeNull();
  });

  it("varias tandas topadas seguidas no agotan los 3 intentos", async () => {
    const db = fakeDb(2);
    mocks.db = db;
    __setTransportForTests({ send: async () => {} });
    mocks.limit.mockResolvedValue(DENIED);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    await retryPendingAnnouncementMail();
    await retryPendingAnnouncementMail();
    await retryPendingAnnouncementMail();
    for (const s of db.slots.values()) expect(s.attempts).toBe(0);
  });

  it("sin nada pendiente no hace nada", async () => {
    mocks.db = fakeDb(0);
    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 0 });
  });
});

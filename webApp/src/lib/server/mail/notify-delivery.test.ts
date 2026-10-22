import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSupabaseClient } = vi.hoisted(() => ({ getAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "http://localhost:3000" }));

import { __setTransportForTests } from "./send";
import { MailTransportError, type MailMessage } from "./transport";
import { mailIdempotencyKey, notifyEnrollmentActivated, notifyWelcome } from "./notify";

const U = "d0000000-0000-4000-8000-000000000003";
const TEACHER = "a0000000-0000-4000-8000-00000000000a";
const COURSE = "c0000000-0000-4000-8000-000000000009";
const CLAIMED_AT = "2026-10-21T00:00:00Z";

interface Update {
  patch: Record<string, unknown>;
  filters: [string, string, unknown][];
}

function fakeDb() {
  const updates: Update[] = [];
  const row = (data: unknown) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }),
  });
  const db = {
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: { email: `${id.slice(0, 4)}@test.local` } }, error: null }),
      },
    },
    rpc: vi.fn(async () => ({ data: [{ id: "slot-1", claimed_at: CLAIMED_AT }], error: null })),
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_c: string, id: string) => ({
              maybeSingle: async () => ({ data: { id: id.toLowerCase(), full_name: "Persona" }, error: null }),
            }),
          }),
        };
      }
      if (table === "courses") {
        return row({ id: COURSE, title: "Tarot", slug: "tarot", teacher_id: TEACHER, teacher: { full_name: "Aurora" } });
      }
      if (table === "mail_log") {
        return {
          update: (patch: Record<string, unknown>) => {
            const u: Update = { patch, filters: [] };
            updates.push(u);
            const chain = {
              eq: (c: string, v: unknown) => (u.filters.push(["eq", c, v]), chain),
              is: async (c: string, v: unknown) => (u.filters.push(["is", c, v]), { error: null, count: 1 }),
            };
            return chain;
          },
        };
      }
      throw new Error(`tabla inesperada: ${table}`);
    },
  };
  getAdminSupabaseClient.mockReturnValue(db);
  return { updates };
}

function transport(impl: () => Promise<void>) {
  const sent: MailMessage[] = [];
  __setTransportForTests({
    send: async (m) => {
      sent.push(m);
      return impl();
    },
  });
  return sent;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  __setTransportForTests(null);
});

describe("notify: Idempotency-Key = dedupe de mail_log con prefijo de entorno (ADR-014, E3)", () => {
  it("transporte OK: la clave lleva host/tipo/destinatario/scope y se confirma sent_at", async () => {
    const { updates } = fakeDb();
    const sent = transport(async () => {});
    await notifyWelcome({ userId: U });

    expect(sent).toHaveLength(1);
    expect(sent[0].idempotencyKey).toBe(`localhost:3000/welcome/${U}/account`);
    expect(updates).toHaveLength(1);
    expect(updates[0].patch).toHaveProperty("sent_at");
  });

  it("la clave de la docente usa los ids canónicos que devolvió la base, no los del input", async () => {
    fakeDb();
    const sent = transport(async () => {});
    await notifyEnrollmentActivated({ studentId: U.toUpperCase(), courseId: COURSE.toUpperCase() });

    const keys = sent.map((m) => m.idempotencyKey);
    expect(keys).toContain(`localhost:3000/teacher_new_student/${TEACHER}/${COURSE}:${U}`);
    for (const k of keys) expect(k).toBe(k?.toLowerCase());
  });

  it("scope demasiado largo: sin clave (Resend acepta hasta 256)", () => {
    expect(mailIdempotencyKey("welcome", U, "x".repeat(300))).toBeUndefined();
    expect(mailIdempotencyKey("welcome", U, "account")).toBe(`localhost:3000/welcome/${U}/account`);
  });
});

describe("notify: una falla permanente retira el turno con su causa (E2)", () => {
  it("permanente: attempts=3 + last_error, con el fencing de claimed_at, sin sent_at", async () => {
    const { updates } = fakeDb();
    transport(async () => {
      throw new MailTransportError("dominio", true, 403, "validation_error");
    });
    await notifyWelcome({ userId: U });

    expect(updates).toHaveLength(1);
    expect(updates[0].patch).toEqual({ attempts: 3, last_error: "permanent:403/validation_error" });
    expect(updates[0].filters).toEqual([
      ["eq", "id", "slot-1"],
      ["eq", "claimed_at", CLAIMED_AT],
      ["is", "sent_at", null],
    ]);
  });

  it("un name del proveedor fuera de formato no rompe el retiro: se normaliza", async () => {
    const { updates } = fakeDb();
    transport(async () => {
      throw new MailTransportError("x", true, 409, "Weird Name <a@b.c>");
    });
    await notifyWelcome({ userId: U });
    expect(updates[0].patch.last_error).toMatch(/^permanent:409\/[a-z0-9_]{1,64}$/);
  });

  it("reintentable: no se toca mail_log (el turno queda para el próximo disparo)", async () => {
    const { updates } = fakeDb();
    transport(async () => {
      throw new MailTransportError("429", false, 429);
    });
    await notifyWelcome({ userId: U });
    expect(updates).toHaveLength(0);
  });
});

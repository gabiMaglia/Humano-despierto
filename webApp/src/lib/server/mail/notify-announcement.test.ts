import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva sobre los imports: lo que usa la factory tiene que existir antes, vía vi.hoisted.
const mocks = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/server/supabase-admin", () => ({ getAdminSupabaseClient: () => mocks.db }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "https://humano.example" }));

import { notifyAnnouncementPublished } from "./notify";
import { __setTransportForTests } from "./send";
import type { MailMessage, MailTransport } from "./transport";

const ANUNCIO = "a3100000-0000-4000-8000-000000000001";
const CURSO = "40000000-0000-4000-8000-00000000000a";
const AUTORA = "20000000-0000-4000-8000-00000000000a";

interface Estado {
  announcement: Record<string, unknown> | null;
  enrollments: { user_id: string }[];
  users: Record<string, { email: string; full_name: string }>;
  claimed: Set<string>;
  claims: { userId: string; type: string; scope: string }[];
  confirms: string[];
}

function usuarios(n: number): Estado["users"] {
  const out: Estado["users"] = { [AUTORA]: { email: "sol@humano.test", full_name: "Sol Mayor" } };
  for (let i = 0; i < n; i++) out[`u-${i}`] = { email: `alumna${i}@humano.test`, full_name: `Alumna ${i}` };
  return out;
}

function estado(n: number, announcement: Partial<Record<string, unknown>> = {}): Estado {
  return {
    announcement: {
      id: ANUNCIO, course_id: CURSO, author_id: AUTORA, title: "Clase en vivo", body: "El jueves.",
      status: "published", deleted_at: null, ...announcement,
    },
    // La autora inscripta en su propio curso: tiene que quedar afuera.
    enrollments: [{ user_id: AUTORA }, ...Array.from({ length: n }, (_, i) => ({ user_id: `u-${i}` }))],
    users: usuarios(n),
    claimed: new Set(),
    claims: [],
    confirms: [],
  };
}

// Fake con la forma justa de las cadenas que usa notify.ts. Cada `from(...)` arma una cadena que
// junta los filtros y resuelve en `maybeSingle()` o al ser awaited.
function fakeAdmin(s: Estado) {
  const chain = (resolve: (f: Record<string, unknown>) => unknown) => {
    const f: Record<string, unknown> = {};
    const c: Record<string, unknown> = {
      select: () => c,
      order: () => c,
      update: () => c,
      eq: (k: string, v: unknown) => ((f[k] = v), c),
      is: (k: string, v: unknown) => ((f[k] = v), c),
      range: (from: number, to: number) => ((f.__range = [from, to]), c),
      maybeSingle: async () => resolve(f),
      then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(resolve(f)).then(ok, ko),
    };
    return c;
  };
  return {
    from(table: string) {
      if (table === "course_announcements") return chain(() => ({ data: s.announcement, error: null }));
      if (table === "courses")
        return chain(() => ({
          data: { id: CURSO, title: "Tarot iniciático", slug: "tarot-iniciatico", teacher_id: AUTORA, teacher: { full_name: "Sol Mayor" } },
          error: null,
        }));
      if (table === "enrollments")
        return chain((f) => {
          const [from, to] = f.__range as [number, number];
          return { data: s.enrollments.slice(from, to + 1), error: null };
        });
      if (table === "profiles")
        return chain((f) => {
          const u = s.users[f.id as string];
          return { data: u ? { id: f.id, full_name: u.full_name } : null, error: null };
        });
      if (table === "mail_log")
        return chain((f) => {
          s.confirms.push(f.id as string);
          return { error: null, count: 1 };
        });
      throw new Error(`tabla inesperada: ${table}`);
    },
    async rpc(fn: string, a: { p_recipient_user_id: string; p_mail_type: string; p_scope_key: string }) {
      if (fn !== "claim_or_reclaim_mail_slot") return { data: null, error: null };
      const key = `${a.p_recipient_user_id}|${a.p_mail_type}|${a.p_scope_key}`;
      if (s.claimed.has(key)) return { data: [], error: null };
      s.claimed.add(key);
      s.claims.push({ userId: a.p_recipient_user_id, type: a.p_mail_type, scope: a.p_scope_key });
      return { data: [{ id: `claim-${a.p_recipient_user_id}`, claimed_at: "2026-10-22T10:00:00Z" }], error: null };
    },
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: s.users[id] ? { email: s.users[id].email } : null }, error: null }),
      },
    },
  };
}

const caido: MailTransport = { send: async () => { throw new Error("ECONNREFUSED"); } };

describe("notifyAnnouncementPublished", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    __setTransportForTests(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("c.5 · SMTP caído: resuelve, reclama una vez por inscripta (sin la autora) y no confirma ninguna", async () => {
    const s = estado(3);
    mocks.db = fakeAdmin(s);
    __setTransportForTests(caido);
    await expect(notifyAnnouncementPublished({ announcementId: ANUNCIO })).resolves.toBeUndefined();
    expect(s.claims).toEqual(
      ["u-0", "u-1", "u-2"].map((userId) => ({ userId, type: "course_announcement", scope: ANUNCIO })),
    );
    expect(s.confirms).toEqual([]);
  });

  it("c.4 · transporte sano: un mail por inscripta, a su dirección, confirmado; ninguna otra dirección en el cuerpo", async () => {
    const s = estado(3);
    mocks.db = fakeAdmin(s);
    const enviados: MailMessage[] = [];
    __setTransportForTests({ send: async (m) => void enviados.push(m) });
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(enviados.map((m) => m.to.email).sort()).toEqual(["alumna0@humano.test", "alumna1@humano.test", "alumna2@humano.test"]);
    expect(s.confirms.sort()).toEqual(["claim-u-0", "claim-u-1", "claim-u-2"]);
    for (const m of enviados) {
      const otras = Object.values(s.users).map((u) => u.email).filter((e) => e !== m.to.email);
      for (const e of otras) expect(`${m.html}${m.text}`).not.toContain(e);
    }
  });

  it("c.4 · volver a disparar el mismo evento no reclama ni manda nada nuevo", async () => {
    const s = estado(3);
    mocks.db = fakeAdmin(s);
    const enviados: MailMessage[] = [];
    __setTransportForTests({ send: async (m) => void enviados.push(m) });
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(s.claims).toHaveLength(3);
    expect(enviados).toHaveLength(3);
  });

  it.each([
    ["un borrador", { status: "draft" }],
    ["un retirado entre el click y el envío", { deleted_at: "2026-10-22T10:00:00Z" }],
  ])("%s no manda nada", async (_n, cambio) => {
    const s = estado(2, cambio);
    mocks.db = fakeAdmin(s);
    __setTransportForTests(caido);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(s.claims).toEqual([]);
  });

  it("una inscripta sin mail resoluble no gasta turno y no frena a las demás", async () => {
    const s = estado(3);
    delete s.users["u-1"];
    mocks.db = fakeAdmin(s);
    __setTransportForTests({ send: async () => {} });
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(s.claims.map((c) => c.userId)).toEqual(["u-0", "u-2"]);
  });

  it("SMTP MUDO (acepta y no contesta): 7 inscriptas terminan en dos vueltas del tope duro, sin colgar", async () => {
    vi.useFakeTimers();
    const s = estado(7);
    mocks.db = fakeAdmin(s);
    // El transporte mudo nunca resuelve: un contador que baja al terminar no bajaria nunca. Lo que
    // se mide es cuantos envios ARRANCARON antes de que venza el primer tope duro: con un pool de
    // 5 son exactamente 5; las 2 que faltan entran recien cuando la primera vuelta suelta su carril.
    let iniciados = 0;
    __setTransportForTests({
      send: () => {
        iniciados++;
        return new Promise<void>(() => {});
      },
    });
    let terminado = false;
    const p = notifyAnnouncementPublished({ announcementId: ANUNCIO }).then(() => (terminado = true));
    await vi.advanceTimersByTimeAsync(14_999);
    expect(iniciados).toBe(5);
    await vi.advanceTimersByTimeAsync(1);
    expect(terminado).toBe(false);
    expect(iniciados).toBe(7);
    await vi.advanceTimersByTimeAsync(15_000);
    await p;
    expect(terminado).toBe(true);
    expect(s.claims).toHaveLength(7);
    expect(s.confirms).toEqual([]);
  });

  it("más de 1000 inscriptas: pagina y no se queda en la primera página de PostgREST", async () => {
    const s = estado(1001);
    mocks.db = fakeAdmin(s);
    __setTransportForTests(caido);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(s.claims).toHaveLength(1001);
  });

  it("una base que explota en la lectura no rechaza la promesa", async () => {
    mocks.db = { from: () => { throw new Error("db caida"); } };
    await expect(notifyAnnouncementPublished({ announcementId: ANUNCIO })).resolves.toBeUndefined();
  });
});

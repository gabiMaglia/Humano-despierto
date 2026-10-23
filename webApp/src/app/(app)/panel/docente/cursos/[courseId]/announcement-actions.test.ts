import { beforeEach, describe, expect, it, vi } from "vitest";
// T-050: sin esto el sujeto real abre un cliente de Supabase y gasta el cupo de "ip:unknown"
// compartido entre tests; acá cada test arranca con el limitador vacío y una usuaria fija.
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

// vi.mock se eleva sobre los imports: lo que usa la factory tiene que existir antes, vía vi.hoisted.
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsCourse: vi.fn(),
  after: vi.fn(),
  notify: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: mocks.createServiceRoleClient }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher: mocks.requireTeacher, assertOwnsCourse: mocks.assertOwnsCourse }));
vi.mock("@/lib/server/youtube", () => ({ resolveYoutubeVideo: vi.fn() }));
vi.mock("@/lib/server/mail/notify", () => ({ notifyAnnouncementPublished: mocks.notify }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after, connection: vi.fn(async () => {}) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { publishAnnouncement, saveAnnouncementDraft, withdrawAnnouncement } from "./actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
});

const COURSE = "40000000-0000-4000-8000-00000000000a";
const ANN = "a3100000-0000-4000-8000-000000000001";
const TEACHER = { id: "20000000-0000-4000-8000-00000000000a", role: "teacher" };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// Cadena con la forma que usa write.mjs: from().insert|update(vals).eq()….select() resuelve a `result`.
function writeClient(result: { data: unknown; error: unknown }) {
  const calls: { op: string; values: unknown; filters: [string, unknown][] } = { op: "", values: null, filters: [] };
  const chain = {
    eq: (k: string, v: unknown) => (calls.filters.push([k, v]), chain),
    select: async () => result,
  };
  const client = {
    from: vi.fn(() => ({
      insert: (v: unknown) => ((calls.op = "insert"), (calls.values = v), chain),
      update: (v: unknown) => ((calls.op = "update"), (calls.values = v), chain),
    })),
  };
  return { client, calls };
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.requireTeacher.mockResolvedValue(TEACHER);
  mocks.assertOwnsCourse.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveAnnouncementDraft", () => {
  it("un courseId que no es uuid se rechaza sin tocar sesión ni base", async () => {
    const r = await saveAnnouncementDraft(TEACHER_ACTION_INITIAL_STATE, form({ courseId: "../x", title: "Clase", body: "Texto" }));
    expect(r.error).toBeTruthy();
    expect(mocks.requireTeacher).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("un link en el cuerpo se rechaza antes de tocar la base", async () => {
    const r = await saveAnnouncementDraft(
      TEACHER_ACTION_INITIAL_STATE,
      form({ courseId: COURSE, title: "Clase", body: "mirá https://x.com" }),
    );
    expect(r.error).toMatch(/no puede contener un link/);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("crear: inserta como la docente de la sesión y nunca manda status", async () => {
    const { client, calls } = writeClient({ data: [{ id: ANN }], error: null });
    mocks.createClient.mockResolvedValue(client);
    const r = await saveAnnouncementDraft(TEACHER_ACTION_INITIAL_STATE, form({ courseId: COURSE, title: "Clase", body: "Texto" }));
    expect(r).toEqual({ error: null, success: "Borrador guardado." });
    expect(calls.op).toBe("insert");
    expect(calls.values).toEqual({ course_id: COURSE, author_id: TEACHER.id, title: "Clase", body: "Texto" });
    expect(mocks.assertOwnsCourse).toHaveBeenCalledWith(COURSE, TEACHER.id);
  });

  it("editar: actualiza filtrando por id y curso", async () => {
    const { client, calls } = writeClient({ data: [{ id: ANN }], error: null });
    mocks.createClient.mockResolvedValue(client);
    await saveAnnouncementDraft(
      TEACHER_ACTION_INITIAL_STATE,
      form({ courseId: COURSE, announcementId: ANN, title: "Clase", body: "Texto" }),
    );
    expect(calls.op).toBe("update");
    expect(calls.filters).toEqual([["id", ANN], ["course_id", COURSE]]);
  });

  it("el 42501 del localizador vuelve traducido, sin texto del motor", async () => {
    const { client } = writeClient({
      data: null,
      error: { code: "42501", message: "un campo publico de course_announcements contiene un localizador de contenido pago" },
    });
    mocks.createClient.mockResolvedValue(client);
    const r = await saveAnnouncementDraft(TEACHER_ACTION_INITIAL_STATE, form({ courseId: COURSE, title: "Clase", body: "Texto" }));
    expect(r.error).toMatch(/contenido pago/);
    expect(r.error).not.toMatch(/course_announcements/);
  });
});

describe("publishAnnouncement", () => {
  it("sin titularidad no se crea el cliente de service_role ni se agenda el mail", async () => {
    mocks.assertOwnsCourse.mockRejectedValue(new Error("No autorizado: ese curso no te pertenece."));
    const r = await publishAnnouncement(TEACHER_ACTION_INITIAL_STATE, form({ courseId: COURSE, announcementId: ANN }));
    expect(r.error).toMatch(/No autorizado/);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("ya publicado (0 filas): error y ningún mail", async () => {
    const { client } = writeClient({ data: [], error: null });
    mocks.createServiceRoleClient.mockReturnValue(client);
    const r = await publishAnnouncement(TEACHER_ACTION_INITIAL_STATE, form({ courseId: COURSE, announcementId: ANN }));
    expect(r.error).toMatch(/ya no es un borrador/);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("publica solo status, filtra por borrador, y el mail va a after() con el id que devolvió la base", async () => {
    // La base devuelve el uuid en minúsculas aunque el form lo mande en mayúsculas: el scope de
    // mail_log tiene que ser el canónico (0022, condición a).
    const { client, calls } = writeClient({ data: [{ id: ANN }], error: null });
    mocks.createServiceRoleClient.mockReturnValue(client);
    mocks.notify.mockReturnValue(new Promise(() => {}));
    const r = await publishAnnouncement(
      TEACHER_ACTION_INITIAL_STATE,
      form({ courseId: COURSE, announcementId: ANN.toUpperCase() }),
    );
    expect(r.error).toBeNull();
    expect(r.success).toMatch(/publicado/);
    expect(calls.values).toEqual({ status: "published" });
    expect(calls.filters).toContainEqual(["status", "draft"]);
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledTimes(1);
    mocks.after.mock.calls[0][0]();
    expect(mocks.notify).toHaveBeenCalledWith({ announcementId: ANN });
  });

  it("c.5 · el action devuelve éxito aunque el mail no termine nunca", async () => {
    const { client } = writeClient({ data: [{ id: ANN }], error: null });
    mocks.createServiceRoleClient.mockReturnValue(client);
    mocks.notify.mockReturnValue(new Promise(() => {}));
    mocks.after.mockImplementation((cb: () => unknown) => void cb());
    const r = await publishAnnouncement(TEACHER_ACTION_INITIAL_STATE, form({ courseId: COURSE, announcementId: ANN }));
    expect(r.success).toMatch(/publicado/);
  });
});

describe("withdrawAnnouncement", () => {
  it("sin motivo se rechaza sin crear el cliente", async () => {
    const r = await withdrawAnnouncement(TEACHER_ACTION_INITIAL_STATE, form({ courseId: COURSE, announcementId: ANN, reason: "  " }));
    expect(r.error).toMatch(/motivo/);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("retira con la sesión, firmado por la docente", async () => {
    const { client, calls } = writeClient({ data: [{ id: ANN }], error: null });
    mocks.createClient.mockResolvedValue(client);
    const r = await withdrawAnnouncement(
      TEACHER_ACTION_INITIAL_STATE,
      form({ courseId: COURSE, announcementId: ANN, reason: "Lo publiqué por error" }),
    );
    expect(r.success).toBe("Anuncio retirado.");
    expect(calls.values).toMatchObject({ deleted_by: TEACHER.id, deleted_reason: "Lo publiqué por error" });
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock sube al tope del archivo: los dobles tienen que existir antes, por eso vi.hoisted.
const { createClient, createServiceRoleClient, getStudentCourseAccess } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getStudentCourseAccess: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  // `cache()` memoiza por request en RSC; en el test cada caso tiene que resolver de cero.
  cache: <T>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("@/lib/server/enrollment", () => ({ getStudentCourseAccess }));
vi.mock("@/lib/server/courses", () => ({ getCourseBySlug: vi.fn() }));

import { getLessonAccess, getLessonPlayerData } from "./lesson-player";

const LESSON = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";

function lessonRow(over: Partial<{ is_preview: boolean; is_published: boolean }> = {}) {
  return {
    id: LESSON, course_id: COURSE, module_id: "m1", position: 4, title: "La cruz celta",
    description: null, duration_seconds: 888, is_preview: false, is_published: true,
    module: { title: "Las tiradas", position: 3 }, ...over,
  };
}

function fakeSession(opts: {
  user: { id: string } | null;
  lesson: ReturnType<typeof lessonRow> | null;
  course?: { slug: string; title: string; teacher_id?: string } | null;
  lessonError?: { message: string } | null;
  role?: "student" | "teacher" | "admin";
}) {
  const results: Record<string, { data: unknown; error: unknown }> = {
    lessons: { data: opts.lesson, error: opts.lessonError ?? null },
    courses: {
      data: opts.course === undefined ? { slug: "tarot-iniciatico", title: "Tarot", teacher_id: "duena" } : opts.course,
      error: null,
    },
    profiles: { data: opts.role ? { role: opts.role } : null, error: null },
  };
  return {
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => results[table] ?? { data: null, error: null },
      };
      return builder;
    },
  };
}

const NO_ACCESS = { hasAccess: false, completedLessonIds: new Set<string>() };
const ACTIVE = { hasAccess: true, completedLessonIds: new Set<string>() };

describe("getLessonAccess", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
    getStudentCourseAccess.mockReset();
  });

  it("leccion inexistente: null, sin consultar inscripcion", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: null }));
    expect(await getLessonAccess(LESSON)).toBeNull();
    expect(getStudentCourseAccess).not.toHaveBeenCalled();
  });

  it("leccion no publicada: null", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: lessonRow({ is_published: false }) }));
    expect(await getLessonAccess(LESSON)).toBeNull();
  });

  it("curso no legible: null", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: lessonRow(), course: null }));
    expect(await getLessonAccess(LESSON)).toBeNull();
  });

  it("no preview y sin inscripcion activa: existe pero hasAccess false", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: lessonRow() }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    const access = await getLessonAccess(LESSON);
    expect(access).not.toBeNull();
    expect(access!.hasAccess).toBe(false);
    expect(access!.courseId).toBe(COURSE);
    expect(access!.isPreview).toBe(false);
    expect(getStudentCourseAccess).toHaveBeenCalledWith(COURSE);
  });

  it("no preview con inscripcion activa: hasAccess true y userId", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: lessonRow() }));
    getStudentCourseAccess.mockResolvedValue(ACTIVE);
    const access = await getLessonAccess(LESSON);
    expect(access!.hasAccess).toBe(true);
    expect(access!.userId).toBe("u1");
  });

  it("preview sin sesion: hasAccess true, userId null", async () => {
    createClient.mockResolvedValue(fakeSession({ user: null, lesson: lessonRow({ is_preview: true }) }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    const access = await getLessonAccess(LESSON);
    expect(access!.hasAccess).toBe(true);
    expect(access!.isPreview).toBe(true);
    expect(access!.userId).toBeNull();
  });

  // T-030 · ampliacion de ADR-003: la duena (teacher_id Y rol teacher, E3) y el admin abren la
  // leccion para responder y moderar, sin cursarla.
  it("docente duena sin inscripcion: hasAccess true, modera y no guarda progreso", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "duena" }, lesson: lessonRow(), role: "teacher" }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    const access = await getLessonAccess(LESSON);
    expect(access!.hasAccess).toBe(true);
    expect(access!.player).toMatchObject({ fullCurriculum: true, canTrackProgress: false, canModerate: true, canAsk: true });
  });

  it("E3 · duena por teacher_id pero con rol que ya no es teacher: sin acceso", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "duena" }, lesson: lessonRow(), role: "student" }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    expect((await getLessonAccess(LESSON))!.hasAccess).toBe(false);
  });

  it("docente de otro curso: sin acceso", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "otra" }, lesson: lessonRow(), role: "teacher" }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    expect((await getLessonAccess(LESSON))!.hasAccess).toBe(false);
  });

  it("admin sin inscripcion: hasAccess true, modera y no pregunta", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "adm" }, lesson: lessonRow(), role: "admin" }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    const access = await getLessonAccess(LESSON);
    expect(access!.hasAccess).toBe(true);
    expect(access!.player).toMatchObject({ canModerate: true, canAsk: false, canTrackProgress: false });
  });

  it("error de lectura de la leccion: lanza, no decide acceso", async () => {
    createClient.mockResolvedValue(fakeSession({ user: null, lesson: null, lessonError: { message: "boom" } }));
    await expect(getLessonAccess(LESSON)).rejects.toThrow(/leer la lección/);
  });

  it("nunca crea el cliente service_role", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: lessonRow() }));
    getStudentCourseAccess.mockResolvedValue(ACTIVE);
    await getLessonAccess(LESSON);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});

// Caracterizacion del refactor: protege que getLessonPlayerData siga cortando ANTES de leer
// video_id con service_role. Pasa tambien en el arbol previo; su rojo se prueba por mutacion.
describe("getLessonPlayerData sin acceso", () => {
  it("devuelve null y no toca service_role", async () => {
    createClient.mockResolvedValue(fakeSession({ user: { id: "u1" }, lesson: lessonRow() }));
    getStudentCourseAccess.mockResolvedValue(NO_ACCESS);
    expect(await getLessonPlayerData(LESSON)).toBeNull();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});

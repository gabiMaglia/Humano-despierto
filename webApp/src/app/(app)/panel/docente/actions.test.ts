import { beforeEach, describe, expect, it, vi } from "vitest";
// T-050: sin esto el sujeto real abre un cliente de Supabase y gasta el cupo de "ip:unknown"
// compartido entre tests; acá cada test arranca con el limitador vacío y una usuaria fija.
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

const { createClient, createServiceRoleClient, requireTeacher, assertOwnsCourse, redirect } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsCourse: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher, assertOwnsCourse }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import { createCourseAction, deleteCourseAction, updateCourseAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
});

const INITIAL = { error: null, success: null };
const COURSE = "40000000-0000-4000-8000-00000000000a";
const COVER = `covers/${COURSE}/11111111-2222-4333-8444-555555555555.jpg`;

function form() {
  const fd = new FormData();
  fd.set("courseId", COURSE);
  return fd;
}

function setup({ deleteError = null as unknown, cover = COVER as string | null } = {}) {
  createClient.mockResolvedValue({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { cover_path: cover }, error: null }) }) }),
      delete: () => ({ eq: async () => ({ error: deleteError }) }),
    }),
  });
  const remove = vi.fn().mockResolvedValue({ error: null });
  createServiceRoleClient.mockReturnValue({ storage: { from: () => ({ remove }) } });
  return { remove };
}

describe("deleteCourseAction · portada (T-047)", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
    redirect.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("borrado el curso, borra su portada con service_role (la sesion ya no es duena)", async () => {
    const { remove } = setup();
    await deleteCourseAction(INITIAL, form());
    expect(remove).toHaveBeenCalledWith([COVER]);
    expect(redirect).toHaveBeenCalledWith("/panel/docente");
  });

  it("si el curso no se pudo borrar (publicado), la portada queda", async () => {
    const { remove } = setup({ deleteError: { message: "rls" } });
    const r = await deleteCourseAction(INITIAL, form());
    expect(r?.error).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();
  });

  it("sin portada no toca Storage", async () => {
    setup({ cover: null });
    await deleteCourseAction(INITIAL, form());
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});

describe("course actions · error por campo (D-100)", () => {
  function courseForm(overrides: Record<string, string> = {}) {
    const fd = new FormData();
    const base: Record<string, string> = {
      courseId: COURSE, slug: "tarot-iniciatico", title: "Tarot", discipline: "Tarot", level: "Inicial", price: "240", currency: "ARS", language: "es",
    };
    for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
    return fd;
  }

  beforeEach(() => {
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("un campo inválido vuelve con su nombre, sin tocar la base", async () => {
    const r = await createCourseAction(INITIAL, courseForm({ price: "doscientos" }));
    expect(r).toMatchObject({ field: "price", error: "El precio es un número (ej: 240 o 240.00)." });
    const u = await updateCourseAction(INITIAL, courseForm({ promoVideoId: "https://youtu.be/x" }));
    expect(u.field).toBe("promoVideoId");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un slug repetido (23505) marca el slug", async () => {
    const dup = { error: { code: "23505", message: "duplicate key" } };
    createClient.mockResolvedValue({
      from: () => ({
        insert: () => ({ select: () => ({ single: async () => ({ data: null, ...dup }) }) }),
        update: () => ({ eq: async () => dup }),
      }),
    });
    expect((await createCourseAction(INITIAL, courseForm())).field).toBe("slug");
    expect((await updateCourseAction(INITIAL, courseForm())).field).toBe("slug");
  });

  it("un error que no es de un campo no inventa uno", async () => {
    createClient.mockResolvedValue({
      from: () => ({ update: () => ({ eq: async () => ({ error: { code: "42501", message: "locator" } }) }) }),
    });
    const r = await updateCourseAction(INITIAL, courseForm());
    expect(r.error).toBeTruthy();
    expect(r.field).toBeUndefined();
  });
});

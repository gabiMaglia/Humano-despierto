import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { deleteCourseAction } from "./actions";

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

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  course: { data: null as { id: string } | null, error: null as { message: string } | null },
  filters: [] as unknown[][],
}));
vi.mock("@/lib/server/supabase-admin", () => ({
  getAdminSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({
        eq: (...f: unknown[]) => {
          mocks.filters.push(f);
          return { maybeSingle: async () => mocks.course };
        },
      }),
    }),
  }),
}));

import { resolveGrantTarget } from "./enrollment-grant";

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.filters.length = 0;
  mocks.course = { data: { id: "c-1" }, error: null };
  mocks.rpc.mockResolvedValue({ data: [{ id: "u-1", role: "student" }], error: null });
});

describe("resolveGrantTarget", () => {
  it("resuelve alumna por mail y curso por slug", async () => {
    await expect(resolveGrantTarget({ email: "alumna@mail.com", courseSlug: "reiki-nivel-1" })).resolves.toEqual({
      ok: true,
      userId: "u-1",
      courseId: "c-1",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_user_by_email", { p_email: "alumna@mail.com" });
    expect(mocks.filters).toEqual([["slug", "reiki-nivel-1"]]);
  });

  it("sin cuenta o sin curso: mensaje claro, sin inscribir", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(resolveGrantTarget({ email: "nadie@mail.com", courseSlug: "reiki-nivel-1" })).resolves.toEqual({
      ok: false,
      error: "No hay ninguna cuenta con ese mail.",
    });
    mocks.rpc.mockResolvedValue({ data: [{ id: "u-1", role: "student" }], error: null });
    mocks.course = { data: null, error: null };
    await expect(resolveGrantTarget({ email: "alumna@mail.com", courseSlug: "no-existe" })).resolves.toEqual({
      ok: false,
      error: "No hay ningún curso con ese slug.",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicSupabaseClient, signPublicUploadUrls } = vi.hoisted(() => ({
  getPublicSupabaseClient: vi.fn(),
  signPublicUploadUrls: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/supabase-public", () => ({ getPublicSupabaseClient }));
vi.mock("@/lib/server/uploads", () => ({ signPublicUploadUrls }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/server/avatar", () => ({ signAvatarUrl: vi.fn() }));

import { getPublicTeachers, signTeacherAvatars } from "./guias";

const AVATAR = "avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";

function client(teachers: unknown[], courses: unknown[]) {
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not"]) b[m] = vi.fn(() => b);
    b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok);
    return b;
  };
  const select = vi.fn();
  return {
    select,
    from: (t: string) => {
      const b = builder(t === "profiles" ? teachers : courses);
      if (t === "profiles") (b.select as ReturnType<typeof vi.fn>).mockImplementation((cols: string) => (select(cols), b));
      return b;
    },
  };
}

describe("getPublicTeachers · avatar (D-62)", () => {
  beforeEach(() => {
    getPublicSupabaseClient.mockReset();
    signPublicUploadUrls.mockReset();
  });

  it("trae el path del avatar sin firmarlo: el sitemap también lee esta lista", async () => {
    const c = client(
      [{ id: "t1", full_name: "Luna", slug: "luna", avatar_path: AVATAR }, { id: "t2", full_name: "Sol", slug: "sol", avatar_path: null }],
      [{ slug: "a", teacher_id: "t1", discipline: "Tarot" }, { slug: "b", teacher_id: "t2", discipline: "Reiki" }],
    );
    getPublicSupabaseClient.mockReturnValue(c);
    const teachers = await getPublicTeachers();
    expect(c.select.mock.calls[0][0]).toMatch(/avatar_path/);
    expect(teachers.map((t) => [t.slug, t.avatarPath])).toEqual([["luna", AVATAR], ["sol", null]]);
    expect(signPublicUploadUrls).not.toHaveBeenCalled();
  });
});

describe("signTeacherAvatars", () => {
  it("firma en una sola llamada los avatares de las tarjetas que se dibujan", async () => {
    signPublicUploadUrls.mockReset().mockResolvedValue(new Map([[AVATAR, "https://s/a?token=1"]]));
    const urls = await signTeacherAvatars([{ avatarPath: AVATAR }, { avatarPath: null }]);
    expect(signPublicUploadUrls).toHaveBeenCalledTimes(1);
    expect(signPublicUploadUrls).toHaveBeenCalledWith([AVATAR, null]);
    expect(urls.get(AVATAR)).toBe("https://s/a?token=1");
  });
});

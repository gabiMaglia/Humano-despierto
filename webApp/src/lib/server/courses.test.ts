import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicSupabaseClient, signPublicUploadUrls } = vi.hoisted(() => ({
  getPublicSupabaseClient: vi.fn(),
  signPublicUploadUrls: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/supabase-public", () => ({ getPublicSupabaseClient }));
vi.mock("@/lib/server/uploads", () => ({ signPublicUploadUrls }));

import { getCourseBySlug, getPublishedCourses, signCatalogCovers } from "./courses";

const PATH = "covers/40000000-0000-4000-8000-00000000000a/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg";

function publicClientReturning(row: unknown) {
  const eqStatus = vi.fn(() => ({ maybeSingle: async () => ({ data: row, error: null }) }));
  const select = vi.fn(() => ({ eq: () => ({ eq: eqStatus }) }));
  return {
    eqStatus,
    select,
    client: {
      from: () => ({ select }),
      rpc: async () => ({ data: 0 }),
    },
  };
}

describe("getCourseBySlug · portada", () => {
  beforeEach(() => {
    signPublicUploadUrls.mockReset();
    getPublicSupabaseClient.mockReset();
  });

  it("c.6 · un slug que no esta publicado no firma nada", async () => {
    const { client, eqStatus } = publicClientReturning(null);
    getPublicSupabaseClient.mockReturnValue(client);
    expect(await getCourseBySlug("herbolaria-borrador")).toBeNull();
    expect(eqStatus).toHaveBeenCalledWith("status", "published");
    expect(signPublicUploadUrls).not.toHaveBeenCalled();
  });

  it("c.1 · un publicado con portada devuelve la URL firmada del path de SU fila", async () => {
    const { client, select } = publicClientReturning({
      id: "40000000-0000-4000-8000-00000000000a", slug: "tarot", title: "Tarot", cover_path: PATH,
      teacher: null, course_modules: [], includes: null, learning_objectives: null, prerequisites: null,
    });
    getPublicSupabaseClient.mockReturnValue(client);
    signPublicUploadUrls.mockResolvedValue(new Map([[PATH, "https://s/x?token=1"]]));
    const course = await getCourseBySlug("tarot");
    expect(String((select.mock.calls[0] as unknown[])[0])).toMatch(/cover_path/);
    expect(signPublicUploadUrls).toHaveBeenCalledWith([PATH]);
    expect(course?.coverUrl).toBe("https://s/x?token=1");
  });

  it("c.3 · sin portada, coverUrl es null y no se llama a Storage", async () => {
    const { client } = publicClientReturning({
      id: "x", slug: "tarot", title: "Tarot", cover_path: null, teacher: null, course_modules: [],
    });
    getPublicSupabaseClient.mockReturnValue(client);
    expect((await getCourseBySlug("tarot"))?.coverUrl).toBeNull();
    expect(signPublicUploadUrls).not.toHaveBeenCalled();
  });
});

describe("signCatalogCovers", () => {
  it("firma solo las cards que recibe (la pagina visible), no el catalogo entero", async () => {
    signPublicUploadUrls.mockReset().mockResolvedValue(new Map());
    await signCatalogCovers([{ coverPath: PATH }, { coverPath: null }]);
    expect(signPublicUploadUrls).toHaveBeenCalledWith([PATH, null]);
  });
});

describe("getPublishedCourses · hasPreview (D-67)", () => {
  function catalogClient(rows: unknown[]) {
    const select = vi.fn(() => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }));
    const reviews = { select: () => ({ in: async () => ({ data: [], error: null }) }) };
    return { select, client: { from: (t: string) => (t === "courses" ? { select } : reviews) } };
  }
  const base = { slug: "s", title: "T", discipline: "Tarot", level: "Inicial", price_cents: 100, currency: "ARS", teacher: null };

  beforeEach(() => getPublicSupabaseClient.mockReset());

  it("afirma clase gratis sólo del curso con una lección publicada is_preview", async () => {
    const { client, select } = catalogClient([
      { ...base, id: "con", course_modules: [{ lessons: [{ duration_seconds: 60, is_published: true, is_preview: true }] }] },
      { ...base, id: "sin", course_modules: [{ lessons: [{ duration_seconds: 60, is_published: true, is_preview: false }] }] },
      // Una vista previa sin publicar no se puede ver: no cuenta.
      { ...base, id: "borrador", course_modules: [{ lessons: [{ duration_seconds: 60, is_published: false, is_preview: true }] }] },
      { ...base, id: "vacio", course_modules: null },
    ]);
    getPublicSupabaseClient.mockReturnValue(client);
    const courses = await getPublishedCourses();
    expect(String((select.mock.calls[0] as unknown[])[0])).toMatch(/is_preview/);
    expect(Object.fromEntries(courses.map((c) => [c.id, c.hasPreview]))).toEqual({
      con: true, sin: false, borrador: false, vacio: false,
    });
  });
});

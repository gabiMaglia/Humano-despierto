import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, getPublishedCourses, getPublishedPosts, getPublicTeachers } = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  getPublishedCourses: vi.fn(async () => [{ slug: "tarot-1" }]),
  getPublishedPosts: vi.fn(async () => []),
  getPublicTeachers: vi.fn(async () => []),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/server/courses", () => ({ getPublishedCourses }));
vi.mock("@/lib/server/diario", () => ({ getPublishedPosts }));
vi.mock("@/lib/server/guias", () => ({ getPublicTeachers }));

import sitemap from "./sitemap";

describe("T-091 · /sitemap.xml no se prerenderiza", () => {
  beforeEach(() => {
    connection.mockReset();
    getPublishedCourses.mockClear();
  });

  it("espera un request antes de leer la base: el build no necesita Supabase", async () => {
    // Así se ve connection() durante el prerender del build: corta antes de seguir.
    connection.mockRejectedValue(new Error("PRERENDER_BAIL"));
    await expect(sitemap()).rejects.toThrow("PRERENDER_BAIL");
    expect(getPublishedCourses).not.toHaveBeenCalled();
  });

  it("con request sigue listando el contenido publicado", async () => {
    connection.mockResolvedValue(undefined);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/cursos/tarot-1");
  });
});

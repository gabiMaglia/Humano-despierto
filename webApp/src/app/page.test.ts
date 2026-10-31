import { describe, expect, it, vi } from "vitest";

const { connection, getLandingData, getPublishedCourses, getPublicTeachers, getFeaturedTeacher } = vi.hoisted(() => ({
  connection: vi.fn(async () => {
    throw new Error("PRERENDER_BAIL");
  }),
  getLandingData: vi.fn(),
  getPublishedCourses: vi.fn(),
  getPublicTeachers: vi.fn(),
  getFeaturedTeacher: vi.fn(),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/server/landing", () => ({ getLandingData }));
vi.mock("@/lib/server/courses", () => ({ getPublishedCourses, signCatalogCovers: vi.fn() }));
vi.mock("@/lib/server/guias", () => ({ getPublicTeachers, getFeaturedTeacher, signTeacherAvatars: vi.fn() }));

import LandingPage from "./page";

describe("T-091 · la portada no consulta la base en el build", () => {
  it("espera un request antes de lanzar las consultas", async () => {
    // El layout ya llama a connection(), pero la página se renderiza en paralelo y sus
    // consultas salían igual durante el prerender.
    await expect(LandingPage()).rejects.toThrow("PRERENDER_BAIL");
    for (const fn of [getLandingData, getPublishedCourses, getPublicTeachers, getFeaturedTeacher]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});

import { describe, expect, it } from "vitest";
import { parseCatalogFilterState, sortCourses, withParam } from "@/app/(marketing)/cursos/catalog-filters";
import { visibleDescription } from "@/lib/catalog/description";

const c = (slug: string, rating?: number, reviewCount?: number, publishedAt = "2026-01-01") => ({
  slug,
  rating,
  reviewCount,
  publishedAt,
});

describe("sortCourses", () => {
  it("relevancia no reordena", () => {
    const list = [c("a", 3, 1), c("b", 5, 9)];
    expect(sortCourses(list, "relevancia").map((x) => x.slug)).toEqual(["a", "b"]);
  });
  it("mejor-valorado: promedio desc, empate por cantidad desc, sin reseñas al final en su orden", () => {
    const list = [c("sin1"), c("una5", 5, 1), c("cuarenta", 5, 40), c("sin2"), c("medio", 4.2, 10)];
    expect(sortCourses(list, "mejor-valorado").map((x) => x.slug)).toEqual([
      "cuarenta", "una5", "medio", "sin1", "sin2",
    ]);
  });
  it("mas-nuevo: published_at desc", () => {
    const list = [c("viejo", 0, 0, "2026-01-01"), c("nuevo", 0, 0, "2026-06-01")];
    expect(sortCourses(list, "mas-nuevo").map((x) => x.slug)).toEqual(["nuevo", "viejo"]);
  });
  it("no muta la entrada", () => {
    const list = [c("a", 3, 1), c("b", 5, 9)];
    sortCourses(list, "mejor-valorado");
    expect(list.map((x) => x.slug)).toEqual(["a", "b"]);
  });
});

describe("orden en la URL", () => {
  it("parsea y cae a relevancia con basura", () => {
    expect(parseCatalogFilterState({ orden: "mejor-valorado" }).order).toBe("mejor-valorado");
    expect(parseCatalogFilterState({ orden: "x" }).order).toBe("relevancia");
    expect(parseCatalogFilterState({}).order).toBe("relevancia");
  });
  it("withParam conserva filtros, resetea page y quita el default", () => {
    const cur = new URLSearchParams("nivel=inicial&page=2");
    expect(withParam(cur, "orden", "mejor-valorado").toString()).toBe("nivel=inicial&orden=mejor-valorado");
    expect(withParam(cur, "orden", "relevancia").toString()).toBe("nivel=inicial");
  });
});

describe("visibleDescription (D-21)", () => {
  it("omite la descripción si es igual a intro", () => {
    expect(visibleDescription("Hola", "Hola")).toBeNull();
    expect(visibleDescription("Hola", "  Hola \n")).toBeNull();
  });
  it("la deja si difiere o no hay intro", () => {
    expect(visibleDescription("Hola", "Hola y más")).toBe("Hola y más");
    expect(visibleDescription(null, "Algo")).toBe("Algo");
  });
  it("sin descripción, null", () => {
    expect(visibleDescription("Hola", null)).toBeNull();
    expect(visibleDescription("Hola", "  ")).toBeNull();
  });
});

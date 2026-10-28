import { describe, expect, it } from "vitest";
import { firstPreviewLesson, freeClassClaim } from "./free-class";

// Spec Brote: «la primera clase es gratis» sólo se afirma de un curso que TIENE una lección
// is_preview; de la escuela entera, sólo si todos la tienen.
describe("freeClassClaim", () => {
  it("todos: cada curso publicado tiene una clase gratuita", () => {
    expect(freeClassClaim({ total: 4, withPreview: 4 })).toBe("todos");
  });
  it("algunos: hay cursos con y cursos sin", () => {
    expect(freeClassClaim({ total: 4, withPreview: 1 })).toBe("algunos");
  });
  it("ninguno: ningún curso la tiene, o no hay cursos", () => {
    expect(freeClassClaim({ total: 4, withPreview: 0 })).toBe("ninguno");
    expect(freeClassClaim({ total: 0, withPreview: 0 })).toBe("ninguno");
  });
  it("desconocido: sin el dato nunca afirma «todos», aunque haya cursos", () => {
    expect(freeClassClaim({ total: 4, withPreview: null })).toBe("desconocido");
  });
  it("un conteo imposible (más previews que cursos) no se lee como «todos»", () => {
    expect(freeClassClaim({ total: 2, withPreview: 3 })).toBe("desconocido");
  });
});

describe("firstPreviewLesson", () => {
  const m = (...flags: boolean[]) => ({ lessons: flags.map((isPreview, i) => ({ id: `l${i}`, isPreview })) });
  it("devuelve la primera lección preview en orden de módulos", () => {
    expect(firstPreviewLesson([m(false, false), m(false, true, true)])?.id).toBe("l1");
  });
  it("null si ninguna es preview o no hay módulos", () => {
    expect(firstPreviewLesson([m(false), m()])).toBeNull();
    expect(firstPreviewLesson([])).toBeNull();
  });
});

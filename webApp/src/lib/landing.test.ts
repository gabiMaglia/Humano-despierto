import { describe, expect, it } from "vitest";
import { buildHeroStats, disciplineCounts, joinSpanish } from "./landing";

describe("buildHeroStats", () => {
  it("muestra los tres con rotulo", () => {
    expect(buildHeroStats({ courses: 3, teachers: 2, students: 5 })).toEqual([
      { num: "3", label: "Cursos" },
      { num: "2", label: "Guías" },
      { num: "5", label: "Inscriptas" },
    ]);
  });
  it("omite la que vale 0", () => {
    const s = buildHeroStats({ courses: 3, teachers: 2, students: 0 });
    expect(s.map((x) => x.label)).toEqual(["Cursos", "Guías"]);
  });
  it("singular con 1", () => {
    expect(buildHeroStats({ courses: 1, teachers: 1, students: 1 }).map((x) => x.label)).toEqual([
      "Curso",
      "Guía",
      "Inscripta",
    ]);
  });
  it("todo en 0 devuelve vacio", () => {
    expect(buildHeroStats({ courses: 0, teachers: 0, students: 0 })).toEqual([]);
  });
});

describe("disciplineCounts", () => {
  it("agrupa por disciplina normalizada y ordena por cantidad", () => {
    const r = disciplineCounts(["Tarot", "Astrología", "tarot", "Tarot"]);
    expect(r).toEqual([
      { key: "tarot", label: "Tarot", count: 3 },
      { key: "astrología", label: "Astrología", count: 1 },
    ]);
  });
  it("vacio sin cursos", () => expect(disciplineCounts([])).toEqual([]));
});

// La frase completa de la cifra que rota va en .sr-only: tiene que leerse como castellano.
describe("joinSpanish", () => {
  it("une con coma y la última con «y»", () => {
    expect(joinSpanish(["tarot", "astrología", "reiki"])).toBe("tarot, astrología y reiki");
  });
  it("dos y uno", () => {
    expect(joinSpanish(["tarot", "reiki"])).toBe("tarot y reiki");
    expect(joinSpanish(["tarot"])).toBe("tarot");
  });
  it("vacío", () => {
    expect(joinSpanish([])).toBe("");
  });
});

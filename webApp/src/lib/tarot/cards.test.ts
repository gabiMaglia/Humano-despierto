import { describe, expect, it } from "vitest";
import { CARDS, baseElement, cardByIndex, cardBySlug } from "./cards";

describe("dataset de cartas", () => {
  it("tiene 78 cartas con índices 0..77 e ids únicos", () => {
    expect(CARDS).toHaveLength(78);
    expect(CARDS.map((c) => c.indice)).toEqual([...Array(78).keys()]);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(78);
  });

  it("ordena mayores 0..21 y después 14 por palo en bastos, copas, espadas, oros", () => {
    expect(cardByIndex(0)?.id).toBe("el-loco");
    expect(cardByIndex(21)?.id).toBe("el-mundo");
    expect(cardByIndex(22)?.id).toBe("as-de-bastos");
    expect(cardByIndex(35)?.id).toBe("rey-de-bastos");
    expect(cardByIndex(36)?.id).toBe("as-de-copas");
    expect(cardByIndex(77)?.id).toBe("rey-de-oros");
  });

  it("respeta el orden RWS: VIII Fuerza, XI Justicia", () => {
    expect(cardByIndex(8)?.id).toBe("la-fuerza");
    expect(cardByIndex(11)?.id).toBe("la-justicia");
  });

  it("reduce el elemento de una figura a su elemento base", () => {
    expect(baseElement(cardBySlug("reina-de-copas")!)).toBe("agua");
    expect(baseElement(cardBySlug("caballero-de-bastos")!)).toBe("fuego");
    expect(baseElement(cardBySlug("el-loco")!)).toBe("aire");
    expect(baseElement(cardBySlug("as-de-oros")!)).toBe("tierra");
  });

  it("todo texto de lectura está presente y no vacío", () => {
    for (const c of CARDS) {
      expect(c.significado_derecha.length, c.id).toBeGreaterThan(80);
      expect(c.significado_invertida.length, c.id).toBeGreaterThan(60);
      expect(c.palabras_clave_derecha.length, c.id).toBeGreaterThanOrEqual(5);
      expect(c.palabras_clave_invertida.length, c.id).toBeGreaterThanOrEqual(5);
      expect(["sí", "no", "depende"]).toContain(c.si_no);
    }
  });
});

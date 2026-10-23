import { describe, expect, it } from "vitest";
import { ogCourseTitle, ogSafeText } from "./text";

describe("ogCourseTitle", () => {
  it("une title y title_em con UN espacio, como el <title> de la ficha (la base no lo trae)", () => {
    expect(ogCourseTitle("Tarot", "iniciático")).toBe("Tarot iniciático");
    expect(ogCourseTitle("Tarot ", "iniciático")).toBe("Tarot iniciático");
  });
  it("sin title_em, solo el title; vacio tras filtrar cae a 'Curso'", () => {
    expect(ogCourseTitle("Reiki", null)).toBe("Reiki");
    expect(ogCourseTitle("✦", null)).toBe("Curso");
  });
});

describe("ogSafeText", () => {
  it("conserva el castellano completo (Latin-1)", () => {
    expect(ogSafeText("¿Qué es el Tarot iniciático? Ñandú, pingüino", 200)).toBe(
      "¿Qué es el Tarot iniciático? Ñandú, pingüino",
    );
  });
  it("saca lo que Cinzel no cubre (glifos, emojis, rayas largas) y colapsa espacios", () => {
    expect(ogSafeText("Tarot ✦ iniciático 🙂 — nivel I", 200)).toBe("Tarot iniciático nivel I");
  });
  it("corta en palabra y cierra con tres puntos ASCII", () => {
    const out = ogSafeText("Astrologia ".repeat(20).trim(), 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("...")).toBe(true);
    expect(out).not.toMatch(/\s\.\.\.$/);
    // Corta en la ultima palabra entera que entra, no a mitad de "Astrologia".
    expect(out).toBe("Astrologia Astrologia Astrologia...");
  });
  it("vacio queda vacio (el llamador elige el texto de respaldo)", () => {
    expect(ogSafeText("✦✦✦", 50)).toBe("");
  });

  // Plus Jakarta Sans no trae el guion blando (U+00AD) y satori saldría a buscarlo: es invisible,
  // así que se quita sin dejar un espacio en medio de la palabra.
  it("quita el guion blando sin partir la palabra", () => {
    expect(ogSafeText("cons\u00ADtelación", 50)).toBe("constelación");
  });
});

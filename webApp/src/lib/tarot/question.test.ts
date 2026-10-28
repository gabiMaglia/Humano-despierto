import { describe, expect, it } from "vitest";
import { MAX_QUESTION, sanitizeQuestion } from "./question";

describe("sanitizeQuestion", () => {
  it("vacío, null o solo espacios → null", () => {
    expect(sanitizeQuestion("")).toBeNull();
    expect(sanitizeQuestion("   ")).toBeNull();
    expect(sanitizeQuestion(null)).toBeNull();
    expect(sanitizeQuestion(undefined)).toBeNull();
  });
  it("recorta, colapsa espacios y quita saltos de línea", () => {
    expect(sanitizeQuestion("  ¿Vuelve \n mi   ex? ")).toBe("¿Vuelve mi ex?");
  });
  it("corta a 140 caracteres", () => {
    expect(sanitizeQuestion("a".repeat(200))).toHaveLength(MAX_QUESTION);
  });
  it("no deja espacios al final después de cortar", () => {
    const q = sanitizeQuestion("palabra ".repeat(40))!;
    expect(q.length).toBeLessThanOrEqual(MAX_QUESTION);
    expect(q).toBe(q.trimEnd());
  });
  it("solo caracteres de ancho cero → null", () => {
    expect(sanitizeQuestion("\u200B\u200C\u200D\uFEFF\u2028\u2029")).toBeNull();
  });
  it("colapsa un NBSP interior en un espacio normal", () => {
    expect(sanitizeQuestion("hola\u00A0\u00A0mundo")).toBe("hola mundo");
  });
  it("quita caracteres de control y de dirección bidi", () => {
    expect(sanitizeQuestion("ho\u0000la\u202E mun\u2066do")).toBe("ho la mun do");
    expect(sanitizeQuestion("\u0000\u202E")).toBeNull();
  });
  it("nunca deja un surrogate suelto, ni al cortar ni en la entrada", () => {
    const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    expect(sanitizeQuestion("a\ud83d")).toBe("a");
    const cortada = sanitizeQuestion("a".repeat(MAX_QUESTION - 1) + "\u{1F52E}\u{1F52E}")!;
    expect(lone.test(cortada)).toBe(false);
    expect(Array.from(cortada)).toHaveLength(MAX_QUESTION);
  });
});

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
});

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
});

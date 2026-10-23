import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("nombre y apellido → dos iniciales en mayúscula", () => {
    expect(initials("Aurora Violeta")).toBe("AV");
    expect(initials("sol mayor")).toBe("SM");
  });

  it("con más de dos palabras toma la primera y la última", () => {
    expect(initials("María de los Ángeles Quiroga")).toBe("MQ");
  });

  it("una sola palabra → una inicial; vacío o sólo espacios → cadena vacía", () => {
    expect(initials("Luna")).toBe("L");
    expect(initials("   ")).toBe("");
    expect(initials(null)).toBe("");
  });

  it("respeta letras con tilde y no corta un grafema", () => {
    expect(initials("Ángela Ñúñez")).toBe("ÁÑ");
  });
});

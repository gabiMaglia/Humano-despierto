import { describe, expect, it } from "vitest";
import { formationYear } from "./formation-year";

describe("formationYear (D-70)", () => {
  it("un año guardado en romanos se muestra en arábigos", () => {
    expect(formationYear("MMXII")).toBe("2012");
    expect(formationYear("MMVIII")).toBe("2008");
    expect(formationYear("mcmxcix")).toBe("1999");
    expect(formationYear(" MMXXII ")).toBe("2022");
  });

  it("lo que ya es un año, o no es un romano bien formado, se deja como está", () => {
    expect(formationYear("2015")).toBe("2015");
    expect(formationYear("2015-2017")).toBe("2015-2017");
    expect(formationYear("IIII")).toBe("IIII");
    expect(formationYear("")).toBe("");
  });
});

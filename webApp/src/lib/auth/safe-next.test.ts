import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";
import { DEFAULT_NEXT, callbackUrl } from "./paths";

describe("safeNext", () => {
  it.each([
    ["/leccion/abc", "/leccion/abc"],
    ["/leccion/abc?tab=notas", "/leccion/abc?tab=notas"],
    ["/leccion/abc#t=30", "/leccion/abc#t=30"],
    ["/cursos/tarot-iniciatico?x=1#y", "/cursos/tarot-iniciatico?x=1#y"],
    ["/panel/docente", "/panel/docente"],
    // Codificado sigue siendo un path: el navegador no lo convierte en host.
    ["/%2F%2Fevil.tld", "/%2F%2Fevil.tld"],
  ])("acepta la ruta interna %s", (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["https://evil.tld"],
    ["http:/evil.tld"],
    ["//evil.tld"],
    ["///evil.tld"],
    ["/\\evil.tld"],
    ["\\\\evil.tld"],
    ["/\t/evil.tld"],
    ["/\n/evil.tld"],
    ["javascript:alert(1)"],
    ["evil.tld"],
    ["panel"],
    ["/ruta con espacio"],
    ["/ñandú"],
    ["/" + "a".repeat(600)],
  ])("cae en /panel con %j", (raw) => {
    expect(safeNext(raw)).toBe(DEFAULT_NEXT);
  });
});

describe("callbackUrl", () => {
  it("codifica next como un solo parámetro", () => {
    expect(callbackUrl("http://localhost:3000", "/leccion/abc?tab=notas")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fleccion%2Fabc%3Ftab%3Dnotas",
    );
  });
});

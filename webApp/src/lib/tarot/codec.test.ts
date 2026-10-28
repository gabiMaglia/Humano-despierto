import { describe, expect, it } from "vitest";
import { decodeReading, encodeReading, readingSeed, type Reading } from "./codec";

const ppf: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: 0, reversed: true }, { indice: 45, reversed: false }, { indice: 12, reversed: false }] };

describe("codec", () => {
  it("codifica con punto y sufijo r", () => {
    expect(encodeReading(ppf)).toBe("0r.45.12");
  });

  it("es simétrico", () => {
    expect(decodeReading("pasado-presente-futuro", encodeReading(ppf))).toEqual(ppf);
  });

  it("acepta sí/no con 1 y con 3 cartas", () => {
    expect(decodeReading("si-o-no", "5")?.cards).toHaveLength(1);
    expect(decodeReading("si-o-no", "5.6r.7")?.cards).toHaveLength(3);
  });

  it.each([
    ["tirada desconocida", "herradura", "1.2.3"],
    ["cantidad incorrecta", "pasado-presente-futuro", "1.2"],
    ["índice fuera de rango", "pasado-presente-futuro", "1.2.78"],
    ["índice negativo", "pasado-presente-futuro", "1.2.-3"],
    ["repetido", "pasado-presente-futuro", "1.2.1"],
    ["invertida donde no se admite", "carta-del-dia", "3r"],
    ["sufijo desconocido", "pasado-presente-futuro", "1.2x.3"],
    ["vacío", "pasado-presente-futuro", ""],
    ["no numérico", "pasado-presente-futuro", "a.b.c"],
    ["cero con ceros a la izquierda", "pasado-presente-futuro", "01.2.3"],
  ])("rechaza %s", (_name, spread, code) => {
    expect(decodeReading(spread, code)).toBeNull();
  });

  it("la semilla es estable y distinta entre tiradas", () => {
    expect(readingSeed(ppf)).toBe(readingSeed(ppf));
    expect(readingSeed(ppf)).not.toBe(readingSeed({ ...ppf, cards: [...ppf.cards].reverse() }));
  });
});

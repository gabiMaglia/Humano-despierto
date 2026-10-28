import { describe, expect, it } from "vitest";
import { cardBySlug } from "./cards";
import { cardVerdict, yesNoVerdict } from "./yes-no";

const sol = cardBySlug("el-sol")!; // si_no: sí
const torre = cardBySlug("la-torre")!; // si_no: no
const templanza = cardBySlug("la-templanza")!; // si_no: depende

describe("cardVerdict", () => {
  it("derecha devuelve el si_no del dataset", () => {
    expect(cardVerdict(sol, false)).toBe("sí");
    expect(cardVerdict(torre, false)).toBe("no");
    expect(cardVerdict(templanza, false)).toBe("depende");
  });

  it("invertida baja un escalón: sí → depende, depende → no, no → no", () => {
    expect(cardVerdict(sol, true)).toBe("depende");
    expect(cardVerdict(templanza, true)).toBe("no");
    expect(cardVerdict(torre, true)).toBe("no");
  });
});

describe("yesNoVerdict", () => {
  it("con una carta es su veredicto", () => {
    expect(yesNoVerdict([{ card: sol, reversed: false }])).toEqual({ verdict: "sí", votes: ["sí"], tiebreak: false });
  });

  it("con tres gana la mayoría", () => {
    const r = yesNoVerdict([{ card: sol, reversed: false }, { card: sol, reversed: false }, { card: torre, reversed: false }]);
    expect(r.verdict).toBe("sí");
    expect(r.tiebreak).toBe(false);
  });

  it("sin mayoría desempata la del centro", () => {
    const r = yesNoVerdict([{ card: sol, reversed: false }, { card: templanza, reversed: false }, { card: torre, reversed: false }]);
    expect(r.verdict).toBe("depende");
    expect(r.tiebreak).toBe(true);
  });
});

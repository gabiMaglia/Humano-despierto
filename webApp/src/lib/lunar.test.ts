import { describe, expect, it } from "vitest";
import { lunarDays, lunarPhase, phaseLabel } from "./lunar";

// Efemerides publicadas (USNO / timeanddate, UTC): luna nueva 2026-01-18 19:52,
// luna llena 2026-02-01 22:09. El modelo es la media sinodica: error de hasta ~14 h, de ahi
// la tolerancia de 1 dia que pide el ticket.
const NUEVA = Date.UTC(2026, 0, 18, 19, 52);
const LLENA = Date.UTC(2026, 1, 1, 22, 9);
const DIA = 86_400_000;

describe("lunarPhase", () => {
  it("luna nueva en la efemeride, +-1 dia", () => {
    for (const d of [-1, 0, 1]) expect(lunarPhase(new Date(NUEVA + d * DIA)).phase).toBe("new");
  });
  it("luna llena en la efemeride, +-1 dia", () => {
    for (const d of [-1, 0, 1]) expect(lunarPhase(new Date(LLENA + d * DIA)).phase).toBe("full");
  });
  it("una semana despues de la nueva es cuarto creciente", () => {
    const r = lunarPhase(new Date(NUEVA + 7.4 * DIA));
    expect(r.phase).toBe("half");
    expect(r.waxing).toBe(true);
  });
  it("una semana despues de la llena es cuarto menguante", () => {
    const r = lunarPhase(new Date(LLENA + 7.4 * DIA));
    expect(r.phase).toBe("half");
    expect(r.waxing).toBe(false);
  });
  it("funciona antes de la epoca de referencia", () => {
    expect(lunarPhase(new Date(Date.UTC(1999, 11, 22))).age).toBeGreaterThanOrEqual(0);
  });
});

describe("lunarDays", () => {
  it("devuelve 8 saltos, el primero es hoy, separados ~3.7 dias", () => {
    const days = lunarDays(new Date(NUEVA));
    expect(days).toHaveLength(8);
    expect(days[0].today).toBe(true);
    expect(days.slice(1).every((d) => !d.today)).toBe(true);
    expect(days[0].phase).toBe("new");
    expect(days[4].phase).toBe("full");
    expect(days[1].date.getTime() - days[0].date.getTime()).toBeCloseTo(3.69 * DIA, -6);
  });
});

// T-061 · el calendario Brote nombra cada fase en texto: el dibujo es aria-hidden.
describe("phaseLabel", () => {
  it.each([
    ["new", true, "Luna nueva"],
    ["crescent", true, "Creciente"],
    ["half", true, "Cuarto creciente"],
    ["gibbous", true, "Gibosa creciente"],
    ["full", false, "Luna llena"],
    ["gibbous", false, "Gibosa menguante"],
    ["half", false, "Cuarto menguante"],
    ["crescent", false, "Menguante"],
  ] as const)("%s (creciente=%s) → %s", (phase, waxing, label) => {
    expect(phaseLabel(phase, waxing)).toBe(label);
  });
});

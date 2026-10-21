import { describe, expect, it } from "vitest";
import { REPORT_STATUS_LABEL, reportStatus } from "./report-status";

describe("reportStatus", () => {
  it.each([
    [null, "pendiente"],
    ["oculta", "oculta"],
    ["desestimada", "desestimada"],
  ] as const)("%j -> %s", (raw, expected) => {
    expect(reportStatus(raw)).toBe(expected);
  });

  // Un valor que no conocemos es un esquema que cambió sin avisar: mostrarlo como "pendiente"
  // le diría a la guía algo falso.
  it("un valor desconocido lanza", () => {
    expect(() => reportStatus("borrada")).toThrow(/resolución desconocida/);
  });

  it("cada estado tiene texto para la guía, sin quién ni por qué", () => {
    for (const label of Object.values(REPORT_STATUS_LABEL)) {
      expect(label).not.toMatch(/admin|motivo/i);
    }
    expect(Object.keys(REPORT_STATUS_LABEL).sort()).toEqual(["desestimada", "oculta", "pendiente"]);
  });
});

import { describe, expect, it } from "vitest";
import { SPREADS, positionsFor, spreadBySlug } from "./spreads";

describe("tiradas", () => {
  it("expone exactamente las cuatro del MVP", () => {
    expect(SPREADS.map((s) => s.slug)).toEqual(["carta-del-dia", "si-o-no", "pasado-presente-futuro", "cruz-celta"]);
  });

  it("carta del día no admite invertidas", () => {
    expect(spreadBySlug("carta-del-dia")?.allowReversed).toBe(false);
  });

  it("sí o no con una carta usa solo la posición Respuesta", () => {
    const pos = positionsFor(spreadBySlug("si-o-no")!, 1);
    expect(pos.map((p) => p.nombre)).toEqual(["Respuesta"]);
    expect(positionsFor(spreadBySlug("si-o-no")!, 3)).toHaveLength(3);
  });

  it("rechaza cantidades que la tirada no admite", () => {
    expect(() => positionsFor(spreadBySlug("cruz-celta")!, 3)).toThrow();
  });

  it("desconocida devuelve undefined", () => {
    expect(spreadBySlug("herradura")).toBeUndefined();
  });
});

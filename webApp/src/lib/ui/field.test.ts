import { describe, expect, it } from "vitest";
import { fieldA11y } from "./field";

describe("fieldA11y", () => {
  it("sin error no marca el campo ni lo describe", () => {
    expect(fieldA11y("fono", null)).toEqual({ errorId: "fono-error", "aria-invalid": undefined, "aria-describedby": undefined });
  });

  it("con error lo marca inválido y lo ata al texto del error", () => {
    expect(fieldA11y("fono", "Mal")).toEqual({ errorId: "fono-error", "aria-invalid": true, "aria-describedby": "fono-error" });
  });

  it("sin error conserva la descripción que ya traía el campo (una ayuda)", () => {
    expect(fieldA11y("fono", undefined, "fono-ayuda")["aria-describedby"]).toBe("fono-ayuda");
  });

  it("con error y ayuda, describe con los dos, el error primero", () => {
    expect(fieldA11y("fono", "Mal", "fono-ayuda")["aria-describedby"]).toBe("fono-error fono-ayuda");
  });
});

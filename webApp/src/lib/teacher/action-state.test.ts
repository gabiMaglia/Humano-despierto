import { describe, expect, it } from "vitest";
import { fieldError, formError } from "./action-state";

describe("fieldError / formError (D-100)", () => {
  const conCampo = { error: "Ya existe un curso con ese slug.", success: null, field: "slug" };
  const sinCampo = { error: "No se pudo guardar.", success: null };

  it("el error de un campo va sólo a ese campo y no se repite abajo", () => {
    expect(fieldError(conCampo, "slug")).toBe("Ya existe un curso con ese slug.");
    expect(fieldError(conCampo, "title")).toBeNull();
    expect(formError(conCampo)).toBeNull();
  });

  it("el error del formulario no marca ningún campo", () => {
    expect(fieldError(sinCampo, "slug")).toBeNull();
    expect(formError(sinCampo)).toBe("No se pudo guardar.");
  });
});

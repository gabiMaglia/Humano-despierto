import { describe, expect, it } from "vitest";
import { profileFieldErrors } from "./profile-fields";

const OK = { fullName: "Ana Pérez", bio: "", phone: "+54 11 4000-0000", birthDate: "1990-05-04" };

describe("profileFieldErrors", () => {
  it("un perfil válido no tiene errores", () => {
    expect(profileFieldErrors(OK)).toEqual({});
  });

  it("campos opcionales vacíos son válidos", () => {
    expect(profileFieldErrors({ ...OK, phone: "", birthDate: "" })).toEqual({});
  });

  it("el nombre vacío es error sólo del nombre", () => {
    expect(profileFieldErrors({ ...OK, fullName: "  " })).toEqual({ fullName: "Escribí tu nombre." });
  });

  it("un teléfono con letras es error sólo del teléfono", () => {
    const errors = profileFieldErrors({ ...OK, phone: "abc" });
    expect(Object.keys(errors)).toEqual(["phone"]);
    expect(errors.phone).toMatch(/teléfono/);
  });

  it("una fecha fuera de rango es error de la fecha", () => {
    expect(profileFieldErrors({ ...OK, birthDate: "1800-01-01" })).toEqual({
      birthDate: "La fecha tiene que estar entre 1900 y hoy.",
    });
  });

  it("junta los errores de varios campos a la vez", () => {
    expect(Object.keys(profileFieldErrors({ ...OK, fullName: "", phone: "abc", birthDate: "2990-01-01" })).sort()).toEqual([
      "birthDate",
      "fullName",
      "phone",
    ]);
  });
});

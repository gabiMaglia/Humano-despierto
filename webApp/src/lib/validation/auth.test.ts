import { describe, expect, it } from "vitest";
import { emailSchema, newPasswordSchema, PASSWORD_MIN_LENGTH } from "./auth";

describe("emailSchema", () => {
  it("acepta un mail y recorta espacios", () => {
    expect(emailSchema.parse("  alumna@test.local ")).toBe("alumna@test.local");
  });
  it.each([[""], ["sin-arroba"], [null], [42]])("rechaza %j", (raw) => {
    expect(emailSchema.safeParse(raw).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("acepta dos claves iguales del largo mínimo", () => {
    const pw = "x".repeat(PASSWORD_MIN_LENGTH);
    expect(newPasswordSchema.safeParse({ password: pw, confirm: pw }).success).toBe(true);
  });
  it("rechaza claves distintas con el error en confirm", () => {
    const r = newPasswordSchema.safeParse({ password: "clave-uno", confirm: "clave-dos" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirm"]);
  });
  it("rechaza una clave corta y una de más de 72", () => {
    const short = "x".repeat(PASSWORD_MIN_LENGTH - 1);
    const long = "x".repeat(73);
    expect(newPasswordSchema.safeParse({ password: short, confirm: short }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: long, confirm: long }).success).toBe(false);
  });
});

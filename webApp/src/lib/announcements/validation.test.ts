import { describe, expect, it } from "vitest";
import { announcementSchema, idSchema, reasonSchema } from "./validation";

describe("announcementSchema", () => {
  it("acepta y recorta", () => {
    expect(announcementSchema.parse({ title: "  Clase en vivo  ", body: " El jueves repasamos. " })).toEqual({
      title: "Clase en vivo",
      body: "El jueves repasamos.",
    });
  });

  it.each([
    ["ab", "cuerpo"],
    ["Título válido", "   "],
    ["x".repeat(201), "cuerpo"],
    ["Título válido", "y".repeat(6001)],
  ])("rechaza título %j con cuerpo de %j", (title, body) => {
    expect(announcementSchema.safeParse({ title, body }).success).toBe(false);
  });

  it("acepta los bordes: 3 y 200 en el título, 6000 en el cuerpo", () => {
    expect(announcementSchema.safeParse({ title: "abc", body: "y".repeat(6000) }).success).toBe(true);
    expect(announcementSchema.safeParse({ title: "x".repeat(200), body: "ok" }).success).toBe(true);
  });

  it.each([["body", "mirá https://ejemplo.com"], ["title", "Clase en www.ejemplo"]])(
    "rechaza un link en %s con el mensaje de link",
    (field, value) => {
      const r = announcementSchema.safeParse({ title: "Una clase", body: "Texto", [field]: value });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].message).toMatch(/no puede contener un link/);
    },
  );

  it("no confunde prosa con un link (falso positivo de 0010)", () => {
    expect(announcementSchema.safeParse({ title: "Luna nueva", body: "Nos vemos el lunes. Traigan el mazo." }).success).toBe(true);
  });
});

describe("reasonSchema", () => {
  it("exige un motivo de 1 a 500 caracteres", () => {
    expect(reasonSchema.safeParse({ reason: "Fuera de lugar" }).success).toBe(true);
    expect(reasonSchema.safeParse({ reason: "   " }).success).toBe(false);
    expect(reasonSchema.safeParse({ reason: "m".repeat(501) }).success).toBe(false);
  });
});

describe("idSchema", () => {
  it("acepta un uuid sembrado a mano (no RFC) y rechaza lo demás", () => {
    expect(idSchema.safeParse("40000000-0000-4000-8000-00000000000a").success).toBe(true);
    expect(idSchema.safeParse("../otro-curso").success).toBe(false);
    expect(idSchema.safeParse("").success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { answerSchema, idSchema, moderationSchema, questionSchema } from "./validation";

describe("questionSchema", () => {
  it("acepta y recorta", () => {
    expect(questionSchema.parse({ title: "  Sobre el Loco  ", body: " No entendí el minuto 12. " })).toEqual({
      title: "Sobre el Loco",
      body: "No entendí el minuto 12.",
    });
  });

  it.each([
    ["ab", "cuerpo"],
    ["Título válido", "   "],
    ["x".repeat(201), "cuerpo"],
    ["Título válido", "y".repeat(4001)],
  ])("rechaza título %j con cuerpo de %j", (title, body) => {
    expect(questionSchema.safeParse({ title, body }).success).toBe(false);
  });

  it("rechaza un link en el cuerpo con el mensaje de link", () => {
    const r = questionSchema.safeParse({ title: "Una duda", body: "mirá https://ejemplo.com" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/no puede contener un link/);
  });
});

describe("answerSchema", () => {
  it("acepta una respuesta y rechaza una vacía", () => {
    expect(answerSchema.safeParse({ body: "Es una pausa." }).success).toBe(true);
    expect(answerSchema.safeParse({ body: "  " }).success).toBe(false);
  });
});

describe("moderationSchema", () => {
  it("exige un motivo de 1 a 500 caracteres", () => {
    expect(moderationSchema.safeParse({ reason: "fuera de tema" }).success).toBe(true);
    expect(moderationSchema.safeParse({ reason: "   " }).success).toBe(false);
    expect(moderationSchema.safeParse({ reason: "m".repeat(501) }).success).toBe(false);
  });
});

describe("idSchema", () => {
  it("acepta un uuid y rechaza lo demás", () => {
    expect(idSchema.safeParse("60000000-0000-4000-8000-00000000000a").success).toBe(true);
    expect(idSchema.safeParse("../otra-leccion").success).toBe(false);
  });
});

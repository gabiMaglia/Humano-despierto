import { describe, expect, it } from "vitest";
import combos from "./data/combos.json";
import { cardBySlug } from "./cards";
import { buildReading, classifyDomain } from "./reading";
import type { Reading } from "./codec";

const idx = (slug: string) => cardBySlug(slug)!.indice;

describe("combos.json", () => {
  it("solo nombra cartas existentes y no repite pares", () => {
    const keys = new Set<string>();
    for (const c of combos) {
      expect(cardBySlug(c.a), c.a).toBeDefined();
      expect(cardBySlug(c.b), c.b).toBeDefined();
      const k = [c.a, c.b].sort().join("+");
      expect(keys.has(k), k).toBe(false);
      keys.add(k);
    }
  });
});

describe("classifyDomain", () => {
  it.each([
    ["¿Volverá mi ex?", "amor"],
    ["me conviene cambiar de trabajo", "trabajo"],
    ["voy a poder pagar la deuda", "dinero"],
    ["cómo sigue mi salud", "salud"],
    ["estoy enamorada, ¿es correspondido?", "amor"],
    ["mis sentimientos están confusos", "amor"],
    ["¿cómo van mis relaciones?", "amor"],
    ["tengo un examen difícil", "trabajo"],
    ["¿me conviene esta pareja?", "amor"],
    ["qué necesito saber hoy", null],
    [null, null],
  ])("%s → %s", (q, expected) => {
    expect(classifyDomain(q)).toBe(expected);
  });
});

describe("buildReading", () => {
  const ppf: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: idx("la-torre"), reversed: false }, { indice: idx("el-sol"), reversed: true }, { indice: idx("reina-de-copas"), reversed: false }] };

  it("coloca cada carta en su posición con el significado según orientación", () => {
    const f = buildReading(ppf, "¿Cómo sigue mi pareja?");
    expect(f.placed.map((p) => p.position.nombre)).toEqual(["Pasado", "Presente", "Futuro"]);
    expect(f.placed[0]!.meaning).toBe(cardBySlug("la-torre")!.significado_derecha);
    expect(f.placed[1]!.meaning).toBe(cardBySlug("el-sol")!.significado_invertida);
    expect(f.domain).toBe("amor");
    expect(f.placed[2]!.domainText).toBe(cardBySlug("reina-de-copas")!.amor);
  });

  it("enlaza posiciones consecutivas con su dignidad", () => {
    const f = buildReading(ppf);
    expect(f.links).toHaveLength(2);
    expect(f.links[0]!.dignity).toBe("intensifica"); // Torre (fuego) + Sol (fuego)
    expect(f.links[1]!.dignity).toBe("debilita"); // Sol (fuego) + Reina de Copas (agua)
  });

  it("calcula proporciones", () => {
    const f = buildReading(ppf);
    expect(f.proportions.majors).toBe(2);
    expect(f.proportions.majorsDominant).toBe(true);
    expect(f.proportions.courts).toBe(1);
    expect(f.proportions.peopleInvolved).toBe(false);
    expect(f.proportions.reversed).toBe(1);
    expect(f.proportions.blocked).toBe(false);
  });

  it("detecta combinaciones conocidas sin importar posición ni orden", () => {
    const f = buildReading(ppf);
    expect(f.combos.map((c) => [c.a, c.b].sort().join("+"))).toContain("el-sol+la-torre");
  });

  it("números repetidos y palo dominante en menores", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: idx("tres-de-bastos"), reversed: false }, { indice: idx("tres-de-copas"), reversed: false }, { indice: idx("cinco-de-bastos"), reversed: false }] };
    const f = buildReading(r);
    expect(f.proportions.repeatedNumbers).toEqual([3]);
    expect(f.proportions.dominantSuit).toBe("bastos");
    expect(f.proportions.absentSuits).toEqual(["espadas", "oros"]);
  });

  it("palo dominante exige al menos 2 cartas del palo", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: idx("el-sol"), reversed: false }, { indice: idx("tres-de-bastos"), reversed: false }, { indice: idx("tres-de-copas"), reversed: false }] };
    expect(buildReading(r).proportions.dominantSuit).toBeNull();
  });

  it("un único palo ausente entre 3 o más menores se informa", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: ["tres-de-bastos", "dos-de-copas", "as-de-espadas"].map((s) => ({ indice: idx(s), reversed: false })) };
    expect(buildReading(r).proportions.absentSuit).toBe("oros");
    const dos: Reading = { spread: "pasado-presente-futuro", cards: ["tres-de-bastos", "dos-de-copas", "el-sol"].map((s) => ({ indice: idx(s), reversed: false })) };
    expect(buildReading(dos).proportions.absentSuit).toBeNull();
  });

  it("quintaesencia solo en cruz celta, con reducción a 1..22 y el Loco como 22", () => {
    const cards = ["la-torre", "el-sol", "la-luna", "el-mundo", "as-de-bastos", "dos-de-copas", "tres-de-espadas", "cuatro-de-oros", "cinco-de-bastos", "seis-de-copas"].map((s) => ({ indice: idx(s), reversed: false }));
    const f = buildReading({ spread: "cruz-celta", cards });
    // 16 + 19 + 18 + 21 = 74 → 7 + 4 = 11 → La Justicia
    expect(f.quintessence?.id).toBe("la-justicia");
    expect(buildReading(ppf).quintessence).toBeNull();
  });

  it("sí/no solo en la tirada sí o no", () => {
    const f = buildReading({ spread: "si-o-no", cards: [{ indice: idx("el-sol"), reversed: false }] });
    expect(f.yesNo?.verdict).toBe("sí");
    expect(buildReading(ppf).yesNo).toBeNull();
  });
});

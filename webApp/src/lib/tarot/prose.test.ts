// webApp/src/lib/tarot/prose.test.ts
import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import { readingSeed, type Reading } from "./codec";
import { buildReading } from "./reading";
import { renderReading } from "./prose";
import { SPREADS } from "./spreads";

const noPlaceholders = (s: string) => !/[{}]|undefined|null|\[object/.test(s);

describe("renderReading", () => {
  const ppf: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: 16, reversed: false }, { indice: 19, reversed: true }, { indice: 49, reversed: false }] };

  it("es determinista para la misma semilla y cambia con otra", () => {
    const facts = buildReading(ppf, "¿Volverá?");
    const a = renderReading(facts, readingSeed(ppf));
    const b = renderReading(facts, readingSeed(ppf));
    expect(a).toEqual(b);
    const otra = renderReading(facts, readingSeed(ppf) + 1);
    expect(JSON.stringify(otra)).not.toBe(JSON.stringify(a));
  });

  it("incluye la pregunta en la apertura cuando existe", () => {
    const t = renderReading(buildReading(ppf, "¿Volverá?"), 1);
    expect(t.apertura).toContain("¿Volverá?");
  });

  it("sí/no con desempate lo dice", () => {
    const r: Reading = { spread: "si-o-no", cards: [{ indice: 19, reversed: false }, { indice: 14, reversed: false }, { indice: 16, reversed: false }] };
    const t = renderReading(buildReading(r), 3);
    expect(t.sintesis).toMatch(/centro|central/);
  });

  it("exhaustivo: ninguna carta, orientación, tirada ni posición deja marcadores o bloques vacíos", () => {
    for (const spread of SPREADS) {
      for (const count of spread.cartas) {
        for (const card of CARDS) {
          for (const reversed of spread.allowReversed ? [false, true] : [false]) {
            const others = CARDS.filter((c) => c.indice !== card.indice).slice(0, count - 1);
            for (let pos = 0; pos < count; pos++) {
              const cards = others.map((c) => ({ indice: c.indice, reversed: false }));
              cards.splice(pos, 0, { indice: card.indice, reversed });
              const facts = buildReading({ spread: spread.slug, cards }, pos % 2 ? "¿Y mi trabajo?" : null);
              const t = renderReading(facts, card.indice * 31 + pos);
              const all = [t.apertura, t.panorama ?? "", ...t.posiciones.map((p) => p.titulo + p.texto), t.hilo ?? "", t.sintesis, t.consejo];
              for (const s of all) expect(noPlaceholders(s), `${spread.slug}/${card.id}/${reversed}/${pos}: ${s}`).toBe(true);
              expect(t.apertura.length).toBeGreaterThan(20);
              expect(t.posiciones).toHaveLength(count);
              for (const p of t.posiciones) expect(p.texto.length).toBeGreaterThan(60);
              expect(t.sintesis.length).toBeGreaterThan(20);
              expect(t.consejo.length).toBeGreaterThan(10);
            }
          }
        }
      }
    }
  });
});

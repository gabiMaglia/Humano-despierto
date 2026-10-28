// webApp/src/lib/tarot/prose.test.ts
import { describe, expect, it } from "vitest";
import { CARDS, cardByIndex } from "./cards";
import { readingSeed, type Reading } from "./codec";
import { buildReading } from "./reading";
import templates from "./data/templates.json";
import { cap, de, nombrar, renderReading } from "./prose";
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

  it("todas las claves de templates.json tienen al menos 3 variantes", () => {
    const walk = (node: unknown, path: string) => {
      if (Array.isArray(node)) expect(node.length, path).toBeGreaterThanOrEqual(3);
      else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    };
    walk(templates, "templates");
  });

  it("exhaustivo: ninguna carta, orientación, tirada ni posición deja marcadores, bloques vacíos ni concordancia rota", () => {
    const preguntas = [null, "¿mi pareja?", "¿mi trabajo?", "¿la plata?", "¿mi salud?"];
    const dominios = new Set<string>();
    let bloqueos = 0;
    let hilos = 0;
    for (const spread of SPREADS) {
      for (const count of spread.cartas) {
        for (const card of CARDS) {
          for (const reversed of spread.allowReversed ? [false, true] : [false]) {
            for (let pos = 0; pos < count; pos++) {
              const rng = rngFor(card.indice * 131 + pos * 7 + count);
              const others: number[] = [];
              for (let k = 1; others.length < count - 1; k++) {
                const idx = (card.indice + k * 7) % 78;
                if (idx !== card.indice && !others.includes(idx)) others.push(idx);
              }
              const cards = others.map((indice) => ({ indice, reversed: spread.allowReversed && rng() < 0.5 }));
              cards.splice(pos, 0, { indice: card.indice, reversed });
              const pregunta = preguntas[(card.indice + pos) % preguntas.length]!;
              const facts = buildReading({ spread: spread.slug, cards }, pregunta);
              if (facts.domain) dominios.add(facts.domain);
              if (facts.proportions.blocked) bloqueos++;
              const t = renderReading(facts, card.indice * 31 + pos);
              const ctx = `${spread.slug}/${card.id}/${reversed}/${pos}`;
              const all = [t.apertura, t.panorama ?? "", ...t.posiciones.map((p) => p.titulo + p.texto), t.hilo ?? "", t.sintesis, t.consejo];
              for (const s of all) expect(noPlaceholders(s), `${ctx}: ${s}`).toBe(true);
              expect(t.apertura.length).toBeGreaterThan(20);
              expect(t.posiciones).toHaveLength(count);
              for (const p of t.posiciones) expect(p.texto.length).toBeGreaterThan(60);
              expect(t.sintesis.length).toBeGreaterThan(20);
              expect(t.consejo.length).toBeGreaterThan(10);

              if (facts.links.length > 0) {
                hilos++;
                expect(t.hilo, ctx).toBeTruthy();
              }

              const text = all.join(" ");
              expect(text, ctx).not.toMatch(/\bde (El|La|Los) |\ba (El|La|Los) /);
              for (const p of facts.placed) {
                const n = nombrar(p.card);
                expect(text.includes(`${n} invertid`), `${ctx}: invertida tras ${n}`).toBe(false);
                expect(text.includes(`${cap(n)} invertid`), `${ctx}: invertida tras ${n}`).toBe(false);
              }

              const enTirada = new Set(facts.placed.map((p) => p.card.indice));
              const sinQuinta = [t.apertura, t.panorama ?? "", ...t.posiciones.map((p) => p.titulo + p.texto), t.hilo ?? "", t.consejo].join(" ");
              for (const c of CARDS) {
                if (enTirada.has(c.indice) || c.indice === facts.quintessence?.indice) continue;
                expect(sinQuinta.includes(c.nombre_es), `${ctx}: aparece ${c.nombre_es} fuera de la tirada`).toBe(false);
              }
            }
          }
        }
      }
    }
    expect(dominios.size).toBe(4);
    expect(bloqueos).toBeGreaterThan(0);
    expect(hilos).toBeGreaterThan(0);
  });
});

describe("concordancia", () => {
  const byId = (id: string) => CARDS.find((c) => c.id === id)!;
  it.each([
    ["el-loco", "el Loco", "del Loco"],
    ["la-luna", "la Luna", "de la Luna"],
    ["los-enamorados", "los Enamorados", "de los Enamorados"],
    ["tres-de-copas", "el Tres de Copas", "del Tres de Copas"],
    ["reina-de-copas", "la Reina de Copas", "de la Reina de Copas"],
    ["sota-de-espadas", "la Sota de Espadas", "de la Sota de Espadas"],
  ])("%s", (id, nom, del) => {
    const c = cardByIndex(byId(id).indice)!;
    expect(nombrar(c)).toBe(nom);
    expect(de(c)).toBe(del);
    expect(cap(nom)).toBe(nom.charAt(0).toUpperCase() + nom.slice(1));
  });
});

function rngFor(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

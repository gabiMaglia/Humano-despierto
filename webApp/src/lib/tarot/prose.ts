// webApp/src/lib/tarot/prose.ts
import templates from "./data/templates.json";
import type { Card } from "./cards";
import type { Link, PlacedCard, ReadingFacts } from "./reading";

export type ReadingText = {
  apertura: string;
  panorama: string | null;
  posiciones: { titulo: string; texto: string }[];
  hilo: string | null;
  sintesis: string;
  consejo: string;
};

// mulberry32: chico, determinista, suficiente para elegir variantes.
function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`plantilla sin valor para {${k}}`);
    return v;
  });
}

function pick(rng: () => number, options: readonly string[]): string {
  return options[Math.floor(rng() * options.length)]!;
}

export function articulo(card: Card): "el" | "la" | "los" {
  if (card.arcano === "mayor") return card.nombre_es.split(" ")[0]!.toLowerCase() as "el" | "la" | "los";
  return card.numero === 11 || card.numero === 13 ? "la" : "el";
}

export function nombrar(card: Card): string {
  return card.arcano === "mayor" ? card.nombre_es.charAt(0).toLowerCase() + card.nombre_es.slice(1) : `${articulo(card)} ${card.nombre_es}`;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function de(card: Card): string {
  const n = nombrar(card);
  return n.startsWith("el ") ? `del ${n.slice(3)}` : `de ${n}`;
}

function a(card: Card): string {
  const n = nombrar(card);
  return n.startsWith("el ") ? `al ${n.slice(3)}` : `a ${n}`;
}

function nombre(p: PlacedCard): string {
  return nombrar(p.card);
}

function panorama(facts: ReadingFacts, rng: () => number): string | null {
  const { proportions: pr } = facts;
  const parts: string[] = [];
  if (pr.majorsDominant) parts.push(pick(rng, templates.panorama_mayores));
  if (pr.dominantSuit) parts.push(pick(rng, templates.panorama_palo[pr.dominantSuit]));
  if (pr.absentSuit) parts.push(pick(rng, templates.panorama_ausente[pr.absentSuit]));
  if (pr.peopleInvolved) parts.push(pick(rng, templates.panorama_gente));
  if (pr.blocked) parts.push(pick(rng, templates.panorama_bloqueo));
  for (const n of pr.repeatedNumbers) parts.push(fill(pick(rng, templates.panorama_numero), { numero: String(n) }));
  return parts.length ? parts.join(" ") : null;
}

function posicion(p: PlacedCard, facts: ReadingFacts, rng: () => number): { titulo: string; texto: string } {
  const base = fill(pick(rng, p.reversed ? templates.posicion_invertida : templates.posicion_derecha), {
    nombre: nombre(p),
    Nombre: cap(nombre(p)),
    posicion: p.position.nombre,
    significado: p.meaning,
  });
  const dominio = facts.domain && p.domainText ? " " + fill(pick(rng, templates.posicion_dominio[facts.domain]), { texto: p.domainText }) : "";
  return { titulo: `${p.position.n}. ${p.position.nombre}`, texto: base + dominio };
}

function hilo(links: Link[], rng: () => number): string | null {
  if (links.length === 0) return null;
  return links.map((l) => fill(pick(rng, templates.hilo[l.dignity]), {
        a: nombrar(l.from.card),
        A: cap(nombrar(l.from.card)),
        dea: de(l.from.card),
        Dea: cap(de(l.from.card)),
        aa: a(l.from.card),
        b: nombrar(l.to.card),
        B: cap(nombrar(l.to.card)),
        ab: a(l.to.card),
      })).join(" ");
}

function sintesis(facts: ReadingFacts, rng: () => number): string {
  const parts: string[] = [];
  if (facts.yesNo) {
    const centro = facts.placed[Math.floor(facts.placed.length / 2)]!;
    const detalle = `${cap(nombre(centro))}${centro.reversed ? " al revés" : ""} habla de ${centro.keywords.slice(0, 3).join(", ")}.`;
    parts.push(fill(pick(rng, templates.sino[facts.yesNo.verdict]), { detalle }));
    if (facts.yesNo.tiebreak) parts.push(pick(rng, templates.sino_desempate));
  }
  for (const c of facts.combos) {
    const pa = facts.placed.find((p) => p.card.id === c.a)!;
    const pb = facts.placed.find((p) => p.card.id === c.b)!;
    parts.push(fill(pick(rng, templates.combo), { texto: c.texto, a: nombre(pa), b: nombre(pb) }));
  }
  if (facts.quintessence) {
    parts.push(fill(pick(rng, templates.quintaesencia), { nombre: nombrar(facts.quintessence), palabras: facts.quintessence.palabras_clave_derecha.slice(0, 3).join(", ") }));
  }
  const claves = facts.placed.map((p) => p.keywords[0]!).join(", ");
  parts.push(fill(pick(rng, templates.sintesis), { claves }));
  return parts.join(" ");
}

export function renderReading(facts: ReadingFacts, seed: number): ReadingText {
  const rng = rngFrom(seed);
  const apertura = facts.question
    ? fill(pick(rng, templates.apertura_pregunta), { pregunta: facts.question })
    : pick(rng, templates.apertura);
  const ultima = facts.placed[facts.placed.length - 1]!;
  return {
    apertura,
    panorama: panorama(facts, rng),
    posiciones: facts.placed.map((p) => posicion(p, facts, rng)),
    hilo: hilo(facts.links, rng),
    sintesis: sintesis(facts, rng),
    consejo: fill(pick(rng, templates.consejo), { consejo: ultima.card.consejo }),
  };
}

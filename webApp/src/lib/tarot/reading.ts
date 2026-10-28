import combosRaw from "./data/combos.json";
import { baseElement, cardByIndex, type Card, type Suit } from "./cards";
import type { Reading } from "./codec";
import { dignityBetween, type Dignity } from "./dignities";
import { positionsFor, spreadBySlug, type Position, type Spread } from "./spreads";
import { yesNoVerdict, type Verdict } from "./yes-no";

export type Domain = "amor" | "trabajo" | "dinero" | "salud";
export type PlacedCard = { position: Position; card: Card; reversed: boolean; meaning: string; keywords: string[]; domainText: string | null };
export type Link = { from: PlacedCard; to: PlacedCard; dignity: Dignity };
export type Proportions = {
  majors: number;
  majorsDominant: boolean;
  dominantSuit: Suit | null;
  absentSuits: Suit[];
  absentSuit: Suit | null;
  courts: number;
  peopleInvolved: boolean;
  reversed: number;
  blocked: boolean;
  repeatedNumbers: number[];
};
export type Combo = { a: string; b: string; texto: string };
export type ReadingFacts = {
  spread: Spread;
  question: string | null;
  domain: Domain | null;
  placed: PlacedCard[];
  links: Link[];
  proportions: Proportions;
  combos: Combo[];
  quintessence: Card | null;
  yesNo: { verdict: Verdict; votes: Verdict[]; tiebreak: boolean } | null;
};

const COMBOS: Combo[] = combosRaw;
const SUITS: Suit[] = ["bastos", "copas", "espadas", "oros"];
const MAX_COMBOS = 2;

const DOMAIN_WORDS: Record<Domain, RegExp> = {
  amor: /\b(amor|pareja|novi[oa]|relaci[oó]n|casamiento|matrimonio|vínculo|vinculo|enamor|sentimient|coraz[oó]n|volver[aá]?)|\bex\b/i,
  trabajo: /\b(trabajo|laburo|empleo|jefe|jefa|carrera|profesi[oó]n|estudio|examen|proyecto|negocio|emprend)/i,
  dinero: /\b(dinero|plata|deuda|pagar|cobrar|sueldo|herencia|econ[oó]mic|inversi[oó]n|ahorro|pr[eé]stamo)/i,
  salud: /\b(salud|enferm|m[eé]dic|cuerpo|energ[ií]a|ansiedad|dolor|operaci[oó]n|tratamiento|embarazo)/i,
};

export function classifyDomain(question: string | null): Domain | null {
  if (!question) return null;
  for (const d of ["amor", "trabajo", "dinero", "salud"] as const) {
    if (DOMAIN_WORDS[d].test(question)) return d;
  }
  return null;
}

function place(position: Position, indice: number, reversed: boolean, domain: Domain | null): PlacedCard {
  const card = cardByIndex(indice);
  if (!card) throw new Error(`índice de carta inválido: ${indice}`);
  return {
    position,
    card,
    reversed,
    meaning: reversed ? card.significado_invertida : card.significado_derecha,
    keywords: reversed ? card.palabras_clave_invertida : card.palabras_clave_derecha,
    domainText: domain ? card[domain] : null,
  };
}

function proportions(placed: PlacedCard[]): Proportions {
  const n = placed.length;
  const majors = placed.filter((p) => p.card.arcano === "mayor").length;
  const minors = placed.filter((p) => p.card.arcano === "menor");
  const bySuit = new Map<Suit, number>();
  for (const p of minors) bySuit.set(p.card.palo!, (bySuit.get(p.card.palo!) ?? 0) + 1);
  const dominant = [...bySuit.entries()].find(([, c]) => c >= 2 && c * 2 >= minors.length);
  const courts = placed.filter((p) => p.card.arcano === "menor" && p.card.numero >= 11).length;
  const reversed = placed.filter((p) => p.reversed).length;
  const numbers = new Map<number, number>();
  for (const p of minors.filter((m) => m.card.numero <= 10)) numbers.set(p.card.numero, (numbers.get(p.card.numero) ?? 0) + 1);
  const absent = n >= 3 ? SUITS.filter((s) => !bySuit.has(s)) : [];
  return {
    majors,
    majorsDominant: n >= 3 && majors * 2 >= n,
    dominantSuit: dominant ? dominant[0] : null,
    absentSuits: absent,
    absentSuit: minors.length >= 3 && absent.length === 1 ? absent[0]! : null,
    courts,
    peopleInvolved: courts >= 2,
    reversed,
    blocked: n >= 3 && reversed * 2 >= n,
    repeatedNumbers: [...numbers.entries()].filter(([, c]) => c >= 2).map(([k]) => k).sort((a, b) => a - b),
  };
}

function findCombos(placed: PlacedCard[]): Combo[] {
  const ids = new Set(placed.map((p) => p.card.id));
  return COMBOS.filter((c) => ids.has(c.a) && ids.has(c.b)).slice(0, MAX_COMBOS);
}

// Suma de los numerales de los mayores, reducida hasta 1..22; 22 es el Loco (0).
function quintessence(placed: PlacedCard[]): Card | null {
  const majors = placed.filter((p) => p.card.arcano === "mayor");
  if (majors.length === 0) return null;
  let sum = majors.reduce((acc, p) => acc + p.card.numero, 0);
  while (sum > 22) sum = String(sum).split("").reduce((a, d) => a + Number(d), 0);
  if (sum === 0) return null;
  return cardByIndex(sum === 22 ? 0 : sum) ?? null;
}

export function buildReading(reading: Reading, question: string | null = null): ReadingFacts {
  const spread = spreadBySlug(reading.spread);
  if (!spread) throw new Error(`tirada desconocida: ${reading.spread}`);
  const positions = positionsFor(spread, reading.cards.length);
  const domain = classifyDomain(question);
  const placed = reading.cards.map((c, i) => place(positions[i]!, c.indice, c.reversed, domain));
  const links: Link[] = [];
  for (let i = 1; i < placed.length; i++) {
    const from = placed[i - 1]!;
    const to = placed[i]!;
    links.push({ from, to, dignity: dignityBetween(baseElement(from.card), baseElement(to.card)) });
  }
  return {
    spread,
    question,
    domain,
    placed,
    links,
    proportions: proportions(placed),
    combos: findCombos(placed),
    quintessence: spread.slug === "cruz-celta" ? quintessence(placed) : null,
    yesNo: spread.slug === "si-o-no" ? yesNoVerdict(placed.map((p) => ({ card: p.card, reversed: p.reversed }))) : null,
  };
}

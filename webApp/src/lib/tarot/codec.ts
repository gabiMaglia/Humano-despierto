import { DECK_SIZE } from "./draw";
import { spreadBySlug, type SpreadSlug } from "./spreads";

export type DrawnCard = { indice: number; reversed: boolean };
export type Reading = { spread: SpreadSlug; cards: DrawnCard[] };

const TOKEN = /^(0|[1-9]\d?)(r?)$/;

export function encodeReading(r: Reading): string {
  return r.cards.map((c) => `${c.indice}${c.reversed ? "r" : ""}`).join(".");
}

export function decodeReading(spreadSlug: string, code: string): Reading | null {
  const spread = spreadBySlug(spreadSlug);
  if (!spread || code === "") return null;
  const cards: DrawnCard[] = [];
  const seen = new Set<number>();
  for (const token of code.split(".")) {
    const m = TOKEN.exec(token);
    if (!m) return null;
    const indice = Number(m[1]);
    const reversed = m[2] === "r";
    if (indice >= DECK_SIZE || seen.has(indice)) return null;
    if (reversed && !spread.allowReversed) return null;
    seen.add(indice);
    cards.push({ indice, reversed });
  }
  if (!spread.cartas.includes(cards.length)) return null;
  return { spread: spread.slug, cards };
}

// FNV-1a de 32 bits sobre la codificación: misma URL, misma semilla, mismas variantes de prosa.
export function readingSeed(r: Reading): number {
  const s = `${r.spread}:${encodeReading(r)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

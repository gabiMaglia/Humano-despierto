import { z } from "@/lib/validation/zod";
import raw from "./data/spreads.json";

export const SPREAD_SLUGS = ["carta-del-dia", "si-o-no", "pasado-presente-futuro", "cruz-celta"] as const;
export type SpreadSlug = (typeof SPREAD_SLUGS)[number];

const positionSchema = z.object({
  n: z.number().int().min(1),
  nombre: z.string().min(1),
  significado: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  rotada: z.boolean(),
});

const spreadSchema = z.object({
  slug: z.enum(SPREAD_SLUGS),
  nombre: z.string().min(1),
  descripcion: z.string().min(1),
  cartas: z.array(z.number().int().min(1)).min(1),
  allowReversed: z.boolean(),
  posiciones: z.array(positionSchema).min(1),
});

export type Position = z.infer<typeof positionSchema>;
export type Spread = z.infer<typeof spreadSchema>;

export const SPREADS: readonly Spread[] = z.array(spreadSchema).length(4).parse(raw);

const BY_SLUG = new Map(SPREADS.map((s) => [s.slug, s]));

export function spreadBySlug(slug: string): Spread | undefined {
  return BY_SLUG.get(slug as SpreadSlug);
}

export function isSpreadSlug(slug: string): slug is SpreadSlug {
  return BY_SLUG.has(slug as SpreadSlug);
}

/** Las posiciones efectivas para una cantidad de cartas. Sí/no con 1 carta es solo la central. */
export function positionsFor(spread: Spread, count: number): Position[] {
  if (!spread.cartas.includes(count)) {
    throw new Error(`${spread.slug} no admite ${count} cartas`);
  }
  if (spread.slug === "si-o-no" && count === 1) {
    return spread.posiciones.filter((p) => p.n === 2);
  }
  return spread.posiciones;
}

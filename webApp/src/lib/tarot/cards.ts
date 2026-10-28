import { z } from "zod";
import raw from "./data/cards.json";

export type Suit = "bastos" | "copas" | "espadas" | "oros";
export type Arcana = "mayor" | "menor";
export type Element = "fuego" | "agua" | "aire" | "tierra";

const ELEMENTS = ["fuego", "agua", "aire", "tierra"] as const;

const cardSchema = z.object({
  indice: z.number().int().min(0).max(77),
  id: z.string().min(1),
  numero: z.number().int().min(0).max(21),
  nombre_es: z.string().min(1),
  nombre_en: z.string().min(1),
  arcano: z.enum(["mayor", "menor"]),
  palo: z.enum(["bastos", "copas", "espadas", "oros"]).nullable(),
  elemento: z.string().min(1),
  astrologia: z.string().nullable(),
  letra_hebrea: z.string().nullable(),
  numerologia: z.string().nullable(),
  palabras_clave_derecha: z.array(z.string().min(1)).min(5),
  palabras_clave_invertida: z.array(z.string().min(1)).min(5),
  significado_derecha: z.string().min(80),
  significado_invertida: z.string().min(60),
  amor: z.string().min(1),
  trabajo: z.string().min(1),
  dinero: z.string().min(1),
  salud: z.string().min(1),
  consejo: z.string().min(1),
  si_no: z.enum(["sí", "no", "depende"]),
  descripcion_imagen: z.string().min(1),
  waite_divinatory: z.object({ upright: z.string(), reversed: z.string() }),
});

export type Card = z.infer<typeof cardSchema>;

// Se valida una vez al importar: un JSON roto tiene que tirar el build, no una tirada.
export const CARDS: readonly Card[] = z.array(cardSchema).length(78).parse(raw);

const BY_INDEX = new Map(CARDS.map((c) => [c.indice, c]));
const BY_SLUG = new Map(CARDS.map((c) => [c.id, c]));

export function cardByIndex(i: number): Card | undefined {
  return BY_INDEX.get(i);
}

export function cardBySlug(slug: string): Card | undefined {
  return BY_SLUG.get(slug);
}

// Las figuras traen "aire del fuego" (sub-elemento Golden Dawn + palo); el elemento base es el del palo, la última palabra.
export function baseElement(card: Card): Element {
  const base = card.elemento.split(" ").at(-1) as Element;
  if (!ELEMENTS.includes(base)) throw new Error(`elemento desconocido en ${card.id}: ${card.elemento}`);
  return base;
}

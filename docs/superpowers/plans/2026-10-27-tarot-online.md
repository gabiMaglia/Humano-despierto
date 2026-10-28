# Tarot online Rider-Waite-Smith — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un tarot online público en `/tarot` con las 78 cartas Rider-Waite-Smith, cuatro tiradas, lectura generada por reglas y plantillas, fichas SEO por carta, y guardado de tiradas para usuarias logueadas.

**Architecture:** Un motor puro en `webApp/src/lib/tarot/` (dataset JSON validado con zod, mezcla, codec de URL, reglas de lectura, prosa por plantillas) sin dependencias de Next ni Supabase. Las rutas públicas viven en `src/app/(marketing)/tarot/`; la lectura anónima se codifica en la query string y se renderiza como Server Component determinista. Una sola tabla `tarot_readings` con RLS guarda tiradas de logueadas; dos Server Actions registradas en `RATE_LIMITS`.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), React 19, Tailwind 4 con tokens Brote, zod 4, Supabase (Postgres + RLS), Vitest, PGlite (tests de schema), Playwright, `sharp` (solo script offline).

**Spec:** `docs/superpowers/specs/2026-10-27-tarot-online-design.md` (leer entera antes de empezar). Investigación en `docs/superpowers/research/tarot/`.

## Global Constraints

- Rama `feature/tarot-online`, nacida de `main` b7e6631. Todo commit va a esa rama.
- Diseño «Brote» (ADR-015): un solo tema claro, tokens semánticos (`fondo`, `papel`, `salvia-100`, `salvia`, `linea`, `tinta`, `bosque`, `suave`, `miel`, `miel-800`, `miel-100`, `musgo`, `error`, `exito`), fuente Plus Jakarta Sans ya cargada, **sin emojis**, íconos como SVG de línea. Nada de `cosmos`, `lila`, `ink`, `gold`.
- Raster permitido solo por `next/image` con tamaño reservado y `alt` real (ADR-015).
- TypeScript strict. Sin comentarios salvo WHY no obvio. `cn()` de `@/lib/utils/cn`.
- Server Components por defecto; `'use client'` solo para interactividad.
- Toda Server Action exportada entra en `RATE_LIMITS` (`webApp/src/lib/rate-limit/limits.ts`); el guard `coverage.test.ts` falla si no.
- Base: `REVOKE ALL` y `GRANT` por columna como whitelist; RLS lee `profiles`, nunca el JWT; sin `service_role` en nada de este plan.
- Orden RWS: VIII Fuerza, XI Justicia. Invertidas con probabilidad 1/3, escuela "bloqueada/interna".
- Textos en rioplatense, cálidos, sin fatalismo. Nada copiado de losarcanos.com.
- Verificadores: `cd webApp && npm test && npx tsc --noEmit && npm run lint` · `cd webApp/supabase && npm test` · `cd webApp && npm run test:e2e` · `bash webApp/scripts/check-seo.sh <url>`.
- Convención de commits del repo: `feat(tarot): …`, `test(tarot): …`, `docs(tarot): …`, en español, con la línea `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` al final.

## Estructura de archivos

```
webApp/src/lib/tarot/
  data/cards.json            78 cartas (copia de research/tarot/rider-waite-78.json + indice)
  data/spreads.json          4 tiradas (subconjunto de research/tarot/tiradas.json, slugs nuevos)
  data/combos.json           pares conocidos (de research/tarot/tiradas-y-lectura.md §B.6)
  data/templates.json        plantillas de prosa con variantes
  cards.ts                   carga + zod + lookups + tipos Card/Suit/Arcana/Element
  spreads.ts                 carga + zod + lookups + tipos Spread/Position
  draw.ts                    shuffle(rng), drawReversed(rng, enabled)
  codec.ts                   encodeReading / decodeReading
  dignities.ts               dignidad elemental entre dos cartas
  reading.ts                 buildReading → ReadingFacts
  yes-no.ts                  veredicto sí/no
  prose.ts                   renderReading → ReadingText
  *.test.ts                  un test por módulo
webApp/src/components/tarot/
  TarotCard.tsx              imagen de una carta (next/image) o dorso SVG, con invertida
  CardBack.tsx               dorso SVG inline con tokens Brote
  SpreadLayout.tsx           grilla de posiciones a partir de Position[]
  Picker.tsx                 'use client': abanico, elección, navegación a la lectura
  ReadingView.tsx            renderiza ReadingText + cartas en layout
  EthicsNote.tsx             el aviso de encuadre
webApp/src/app/(marketing)/tarot/
  page.tsx                   portada
  [tirada]/page.tsx          la tirada
  lectura/page.tsx           resultado por query string
  lectura/[id]/page.tsx      tirada guardada
  cartas/page.tsx            índice
  cartas/[slug]/page.tsx     ficha
  actions.ts                 saveTarotReadingAction, deleteTarotReadingAction
  actions.test.ts
webApp/src/lib/server/tarot.ts        getSavedReading, listSavedReadings (cliente de sesión)
webApp/src/app/(app)/panel/tarot/page.tsx
webApp/scripts/tarot-images.mjs       descarga + WebP (se corre a mano)
webApp/public/tarot/rws/*.webp + CREDITS.md
webApp/supabase/migrations/<ts>_0071_tarot_readings.sql
webApp/supabase/tests/tarot-readings.test.mjs
webApp/e2e/tarot.spec.ts
```

---

### Task 1: Dataset de cartas tipado y validado

**Files:**
- Create: `webApp/src/lib/tarot/data/cards.json`
- Create: `webApp/src/lib/tarot/cards.ts`
- Test: `webApp/src/lib/tarot/cards.test.ts`

**Interfaces:**
- Produces: `CARDS: readonly Card[]` (78, ordenadas por `indice` 0..77), `cardByIndex(i: number): Card | undefined`, `cardBySlug(slug: string): Card | undefined`, `baseElement(card: Card): Element`, tipos `Card`, `Suit = "bastos" | "copas" | "espadas" | "oros"`, `Arcana = "mayor" | "menor"`, `Element = "fuego" | "agua" | "aire" | "tierra"`.

- [ ] **Step 1: Generar `cards.json` desde la investigación, agregando `indice`**

```bash
cd /Users/gabrielsk/Documents/Proyects/Humano-despierto
python3 -I - <<'PY'
import json
src = json.load(open('docs/superpowers/research/tarot/rider-waite-78.json'))
orden = {'bastos': 0, 'copas': 1, 'espadas': 2, 'oros': 3}
mayores = sorted([c for c in src if c['arcano'] == 'mayor'], key=lambda c: c['numero'])
menores = sorted([c for c in src if c['arcano'] == 'menor'], key=lambda c: (orden[c['palo']], c['numero']))
out = []
for i, c in enumerate(mayores + menores):
    out.append({'indice': i, **c})
assert len(out) == 78 and len({c['id'] for c in out}) == 78
json.dump(out, open('webApp/src/lib/tarot/data/cards.json', 'w'), ensure_ascii=False, indent=2)
print('ok', out[0]['id'], out[21]['id'], out[22]['id'], out[77]['id'])
PY
```

Esperado: `ok el-loco el-mundo as-de-bastos rey-de-oros`.

- [ ] **Step 2: Escribir el test que falla**

```ts
// webApp/src/lib/tarot/cards.test.ts
import { describe, expect, it } from "vitest";
import { CARDS, baseElement, cardByIndex, cardBySlug } from "./cards";

describe("dataset de cartas", () => {
  it("tiene 78 cartas con índices 0..77 e ids únicos", () => {
    expect(CARDS).toHaveLength(78);
    expect(CARDS.map((c) => c.indice)).toEqual([...Array(78).keys()]);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(78);
  });

  it("ordena mayores 0..21 y después 14 por palo en bastos, copas, espadas, oros", () => {
    expect(cardByIndex(0)?.id).toBe("el-loco");
    expect(cardByIndex(21)?.id).toBe("el-mundo");
    expect(cardByIndex(22)?.id).toBe("as-de-bastos");
    expect(cardByIndex(35)?.id).toBe("rey-de-bastos");
    expect(cardByIndex(36)?.id).toBe("as-de-copas");
    expect(cardByIndex(77)?.id).toBe("rey-de-oros");
  });

  it("respeta el orden RWS: VIII Fuerza, XI Justicia", () => {
    expect(cardByIndex(8)?.id).toBe("la-fuerza");
    expect(cardByIndex(11)?.id).toBe("la-justicia");
  });

  it("reduce el elemento de una figura a su elemento base", () => {
    expect(baseElement(cardBySlug("reina-de-copas")!)).toBe("agua");
    expect(baseElement(cardBySlug("caballero-de-bastos")!)).toBe("fuego");
    expect(baseElement(cardBySlug("el-loco")!)).toBe("aire");
    expect(baseElement(cardBySlug("as-de-oros")!)).toBe("tierra");
  });

  it("todo texto de lectura está presente y no vacío", () => {
    for (const c of CARDS) {
      expect(c.significado_derecha.length, c.id).toBeGreaterThan(80);
      expect(c.significado_invertida.length, c.id).toBeGreaterThan(60);
      expect(c.palabras_clave_derecha.length, c.id).toBeGreaterThanOrEqual(5);
      expect(c.palabras_clave_invertida.length, c.id).toBeGreaterThanOrEqual(5);
      expect(["sí", "no", "depende"]).toContain(c.si_no);
    }
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run src/lib/tarot/cards.test.ts`
Expected: FAIL con "Cannot find module './cards'".

- [ ] **Step 4: Implementar `cards.ts`**

```ts
// webApp/src/lib/tarot/cards.ts
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

// Las figuras traen "agua del fuego" (sub-elemento Golden Dawn); para dignidades cuenta la primera palabra.
export function baseElement(card: Card): Element {
  const first = card.elemento.split(" ")[0] as Element;
  if (!ELEMENTS.includes(first)) throw new Error(`elemento desconocido en ${card.id}: ${card.elemento}`);
  return first;
}
```

Si `tsconfig.json` no tiene `"resolveJsonModule": true`, agregarlo (Next lo trae por defecto; verificar con `npx tsc --noEmit`).

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd webApp && npx vitest run src/lib/tarot/cards.test.ts`
Expected: PASS (5 tests). Si falla la aserción de longitud de algún texto, corregir ese texto en `cards.json`, nunca bajar el umbral.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/tarot/data/cards.json webApp/src/lib/tarot/cards.ts webApp/src/lib/tarot/cards.test.ts
git commit -m "feat(tarot): dataset de 78 cartas RWS tipado y validado con zod

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tiradas del MVP

**Files:**
- Create: `webApp/src/lib/tarot/data/spreads.json`
- Create: `webApp/src/lib/tarot/spreads.ts`
- Test: `webApp/src/lib/tarot/spreads.test.ts`

**Interfaces:**
- Produces: `SPREADS: readonly Spread[]`, `spreadBySlug(slug: string): Spread | undefined`, tipos `SpreadSlug = "carta-del-dia" | "si-o-no" | "pasado-presente-futuro" | "cruz-celta"`, `Spread { slug, nombre, descripcion, cartas: number[] (cantidades admitidas), allowReversed: boolean, posiciones: Position[] }`, `Position { n, nombre, significado, x, y, rotada }`. Para `si-o-no`, `cartas = [1, 3]` y `posiciones` tiene 3 entradas; con 1 carta se usa solo la posición 2 ("Respuesta").

- [ ] **Step 1: Escribir `spreads.json`**

```json
[
  {
    "slug": "carta-del-dia",
    "nombre": "Carta del día",
    "descripcion": "Una sola carta como mensaje para hoy. Sin invertidas: es una invitación, no un pronóstico.",
    "cartas": [1],
    "allowReversed": false,
    "posiciones": [
      { "n": 1, "nombre": "Mensaje del día", "significado": "La energía que conviene tener presente hoy.", "x": 0, "y": 0, "rotada": false }
    ]
  },
  {
    "slug": "si-o-no",
    "nombre": "Sí o no",
    "descripcion": "Una pregunta cerrada. Con una carta o con tres; la del centro desempata.",
    "cartas": [1, 3],
    "allowReversed": true,
    "posiciones": [
      { "n": 1, "nombre": "Primer voto", "significado": "Lo que empuja a favor o en contra.", "x": 0, "y": 0, "rotada": false },
      { "n": 2, "nombre": "Respuesta", "significado": "El peso central de la respuesta.", "x": 1, "y": 0, "rotada": false },
      { "n": 3, "nombre": "Tercer voto", "significado": "Lo que termina de inclinar la balanza.", "x": 2, "y": 0, "rotada": false }
    ]
  },
  {
    "slug": "pasado-presente-futuro",
    "nombre": "Pasado, presente y futuro",
    "descripcion": "Tres cartas para ver de dónde viene la situación, dónde está y hacia dónde tiende.",
    "cartas": [3],
    "allowReversed": true,
    "posiciones": [
      { "n": 1, "nombre": "Pasado", "significado": "Lo que trajo la situación hasta acá.", "x": 0, "y": 0, "rotada": false },
      { "n": 2, "nombre": "Presente", "significado": "Lo que está pasando ahora.", "x": 1, "y": 0, "rotada": false },
      { "n": 3, "nombre": "Futuro", "significado": "Hacia dónde tiende si nada cambia.", "x": 2, "y": 0, "rotada": false }
    ]
  },
  {
    "slug": "cruz-celta",
    "nombre": "Cruz celta",
    "descripcion": "La tirada clásica de diez cartas, tal como la describió Waite en 1911.",
    "cartas": [10],
    "allowReversed": true,
    "posiciones": [
      { "n": 1, "nombre": "Lo que te cubre", "significado": "La atmósfera general de la pregunta.", "x": 1, "y": 1, "rotada": false },
      { "n": 2, "nombre": "Lo que te cruza", "significado": "La fuerza que se opone o que complica.", "x": 1, "y": 1, "rotada": true },
      { "n": 3, "nombre": "Lo que te corona", "significado": "Lo mejor que puede salir, o lo que está en tu conciencia.", "x": 1, "y": 0, "rotada": false },
      { "n": 4, "nombre": "Lo que está debajo", "significado": "La raíz, lo que ya es parte de la experiencia.", "x": 1, "y": 2, "rotada": false },
      { "n": 5, "nombre": "Lo que queda atrás", "significado": "La influencia que se está yendo.", "x": 0, "y": 1, "rotada": false },
      { "n": 6, "nombre": "Lo que viene", "significado": "La influencia que se acerca.", "x": 2, "y": 1, "rotada": false },
      { "n": 7, "nombre": "Vos", "significado": "Tu actitud frente a la situación.", "x": 3, "y": 3, "rotada": false },
      { "n": 8, "nombre": "Tu entorno", "significado": "Las personas y circunstancias alrededor.", "x": 3, "y": 2, "rotada": false },
      { "n": 9, "nombre": "Esperanzas y temores", "significado": "Lo que deseás y lo que te asusta, a menudo lo mismo.", "x": 3, "y": 1, "rotada": false },
      { "n": 10, "nombre": "Lo que vendrá", "significado": "El resultado si todo sigue su curso.", "x": 3, "y": 0, "rotada": false }
    ]
  }
]
```

- [ ] **Step 2: Escribir el test que falla**

```ts
// webApp/src/lib/tarot/spreads.test.ts
import { describe, expect, it } from "vitest";
import { SPREADS, positionsFor, spreadBySlug } from "./spreads";

describe("tiradas", () => {
  it("expone exactamente las cuatro del MVP", () => {
    expect(SPREADS.map((s) => s.slug)).toEqual(["carta-del-dia", "si-o-no", "pasado-presente-futuro", "cruz-celta"]);
  });

  it("carta del día no admite invertidas", () => {
    expect(spreadBySlug("carta-del-dia")?.allowReversed).toBe(false);
  });

  it("sí o no con una carta usa solo la posición Respuesta", () => {
    const pos = positionsFor(spreadBySlug("si-o-no")!, 1);
    expect(pos.map((p) => p.nombre)).toEqual(["Respuesta"]);
    expect(positionsFor(spreadBySlug("si-o-no")!, 3)).toHaveLength(3);
  });

  it("rechaza cantidades que la tirada no admite", () => {
    expect(() => positionsFor(spreadBySlug("cruz-celta")!, 3)).toThrow();
  });

  it("desconocida devuelve undefined", () => {
    expect(spreadBySlug("herradura")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run src/lib/tarot/spreads.test.ts`
Expected: FAIL con "Cannot find module './spreads'".

- [ ] **Step 4: Implementar `spreads.ts`**

```ts
// webApp/src/lib/tarot/spreads.ts
import { z } from "zod";
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
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd webApp && npx vitest run src/lib/tarot/spreads.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/tarot/data/spreads.json webApp/src/lib/tarot/spreads.ts webApp/src/lib/tarot/spreads.test.ts
git commit -m "feat(tarot): las cuatro tiradas del MVP con posiciones y layout

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Mezcla y codec de URL

**Files:**
- Create: `webApp/src/lib/tarot/draw.ts`
- Create: `webApp/src/lib/tarot/codec.ts`
- Test: `webApp/src/lib/tarot/draw.test.ts`, `webApp/src/lib/tarot/codec.test.ts`

**Interfaces:**
- Produces: `type Rng = () => number` (uniforme en [0,1)), `shuffleDeck(rng: Rng): number[]` (permutación de 0..77), `drawReversed(rng: Rng, enabled: boolean): boolean`, `REVERSED_PROBABILITY = 1/3`, `type DrawnCard = { indice: number; reversed: boolean }`, `type Reading = { spread: SpreadSlug; cards: DrawnCard[] }`, `encodeReading(r: Reading): string` (solo la parte `c=`), `decodeReading(spreadSlug: string, code: string): Reading | null`, `readingSeed(r: Reading): number`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// webApp/src/lib/tarot/draw.test.ts
import { describe, expect, it } from "vitest";
import { REVERSED_PROBABILITY, drawReversed, shuffleDeck } from "./draw";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("shuffleDeck", () => {
  it("devuelve una permutación de 0..77 sin repetidos", () => {
    const deck = shuffleDeck(lcg(7));
    expect(deck).toHaveLength(78);
    expect([...deck].sort((a, b) => a - b)).toEqual([...Array(78).keys()]);
  });

  it("es determinista para el mismo rng", () => {
    expect(shuffleDeck(lcg(42))).toEqual(shuffleDeck(lcg(42)));
    expect(shuffleDeck(lcg(42))).not.toEqual(shuffleDeck(lcg(43)));
  });
});

describe("drawReversed", () => {
  it("nunca invierte si está apagado", () => {
    const rng = lcg(1);
    for (let i = 0; i < 1000; i++) expect(drawReversed(rng, false)).toBe(false);
  });

  it("invierte alrededor de un tercio de las veces con Math.random", () => {
    let n = 0;
    for (let i = 0; i < 10_000; i++) if (drawReversed(Math.random, true)) n++;
    expect(n / 10_000).toBeGreaterThan(REVERSED_PROBABILITY - 0.03);
    expect(n / 10_000).toBeLessThan(REVERSED_PROBABILITY + 0.03);
  });
});
```

```ts
// webApp/src/lib/tarot/codec.test.ts
import { describe, expect, it } from "vitest";
import { decodeReading, encodeReading, readingSeed, type Reading } from "./codec";

const ppf: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: 0, reversed: true }, { indice: 45, reversed: false }, { indice: 12, reversed: false }] };

describe("codec", () => {
  it("codifica con punto y sufijo r", () => {
    expect(encodeReading(ppf)).toBe("0r.45.12");
  });

  it("es simétrico", () => {
    expect(decodeReading("pasado-presente-futuro", encodeReading(ppf))).toEqual(ppf);
  });

  it("acepta sí/no con 1 y con 3 cartas", () => {
    expect(decodeReading("si-o-no", "5")?.cards).toHaveLength(1);
    expect(decodeReading("si-o-no", "5.6r.7")?.cards).toHaveLength(3);
  });

  it.each([
    ["tirada desconocida", "herradura", "1.2.3"],
    ["cantidad incorrecta", "pasado-presente-futuro", "1.2"],
    ["índice fuera de rango", "pasado-presente-futuro", "1.2.78"],
    ["índice negativo", "pasado-presente-futuro", "1.2.-3"],
    ["repetido", "pasado-presente-futuro", "1.2.1"],
    ["invertida donde no se admite", "carta-del-dia", "3r"],
    ["sufijo desconocido", "pasado-presente-futuro", "1.2x.3"],
    ["vacío", "pasado-presente-futuro", ""],
    ["no numérico", "pasado-presente-futuro", "a.b.c"],
    ["cero con ceros a la izquierda", "pasado-presente-futuro", "01.2.3"],
  ])("rechaza %s", (_name, spread, code) => {
    expect(decodeReading(spread, code)).toBeNull();
  });

  it("la semilla es estable y distinta entre tiradas", () => {
    expect(readingSeed(ppf)).toBe(readingSeed(ppf));
    expect(readingSeed(ppf)).not.toBe(readingSeed({ ...ppf, cards: [...ppf.cards].reverse() }));
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/lib/tarot/draw.test.ts src/lib/tarot/codec.test.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar `draw.ts` y `codec.ts`**

```ts
// webApp/src/lib/tarot/draw.ts
export type Rng = () => number;

export const DECK_SIZE = 78;
export const REVERSED_PROBABILITY = 1 / 3;

// Fisher-Yates sobre los índices del dataset. El rng se inyecta para que los tests sean deterministas.
export function shuffleDeck(rng: Rng): number[] {
  const deck = [...Array(DECK_SIZE).keys()];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

export function drawReversed(rng: Rng, enabled: boolean): boolean {
  return enabled && rng() < REVERSED_PROBABILITY;
}

/** rng criptográfico para el navegador; en Node también existe `globalThis.crypto`. */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  return () => {
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! / 2 ** 32;
  };
}
```

```ts
// webApp/src/lib/tarot/codec.ts
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
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd webApp && npx vitest run src/lib/tarot/draw.test.ts src/lib/tarot/codec.test.ts`
Expected: PASS (4 + 15 tests).

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/tarot/draw.ts webApp/src/lib/tarot/codec.ts webApp/src/lib/tarot/draw.test.ts webApp/src/lib/tarot/codec.test.ts
git commit -m "feat(tarot): mezcla sin reemplazo, invertidas 1/3 y codec de tirada en URL

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Dignidades elementales y veredicto sí/no

**Files:**
- Create: `webApp/src/lib/tarot/dignities.ts`
- Create: `webApp/src/lib/tarot/yes-no.ts`
- Test: `webApp/src/lib/tarot/dignities.test.ts`, `webApp/src/lib/tarot/yes-no.test.ts`

**Interfaces:**
- Produces: `type Dignity = "intensifica" | "refuerza" | "debilita" | "neutral"`, `dignityBetween(a: Element, b: Element): Dignity`, `type Verdict = "sí" | "no" | "depende"`, `cardVerdict(card: Card, reversed: boolean): Verdict`, `yesNoVerdict(cards: { card: Card; reversed: boolean }[]): { verdict: Verdict; votes: Verdict[]; tiebreak: boolean }`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// webApp/src/lib/tarot/dignities.test.ts
import { describe, expect, it } from "vitest";
import { dignityBetween } from "./dignities";

describe("dignityBetween (Golden Dawn)", () => {
  it.each([
    ["fuego", "fuego", "intensifica"],
    ["agua", "agua", "intensifica"],
    ["fuego", "aire", "refuerza"],
    ["aire", "fuego", "refuerza"],
    ["agua", "tierra", "refuerza"],
    ["tierra", "agua", "refuerza"],
    ["fuego", "agua", "debilita"],
    ["agua", "fuego", "debilita"],
    ["aire", "tierra", "debilita"],
    ["tierra", "aire", "debilita"],
    ["fuego", "tierra", "neutral"],
    ["aire", "agua", "neutral"],
  ] as const)("%s + %s = %s", (a, b, expected) => {
    expect(dignityBetween(a, b)).toBe(expected);
  });
});
```

```ts
// webApp/src/lib/tarot/yes-no.test.ts
import { describe, expect, it } from "vitest";
import { cardBySlug } from "./cards";
import { cardVerdict, yesNoVerdict } from "./yes-no";

const sol = cardBySlug("el-sol")!; // si_no: sí
const torre = cardBySlug("la-torre")!; // si_no: no
const luna = cardBySlug("la-luna")!; // si_no: depende

describe("cardVerdict", () => {
  it("derecha devuelve el si_no del dataset", () => {
    expect(cardVerdict(sol, false)).toBe("sí");
    expect(cardVerdict(torre, false)).toBe("no");
    expect(cardVerdict(luna, false)).toBe("depende");
  });

  it("invertida baja un escalón: sí → depende, depende → no, no → no", () => {
    expect(cardVerdict(sol, true)).toBe("depende");
    expect(cardVerdict(luna, true)).toBe("no");
    expect(cardVerdict(torre, true)).toBe("no");
  });
});

describe("yesNoVerdict", () => {
  it("con una carta es su veredicto", () => {
    expect(yesNoVerdict([{ card: sol, reversed: false }])).toEqual({ verdict: "sí", votes: ["sí"], tiebreak: false });
  });

  it("con tres gana la mayoría", () => {
    const r = yesNoVerdict([{ card: sol, reversed: false }, { card: sol, reversed: false }, { card: torre, reversed: false }]);
    expect(r.verdict).toBe("sí");
    expect(r.tiebreak).toBe(false);
  });

  it("sin mayoría desempata la del centro", () => {
    const r = yesNoVerdict([{ card: sol, reversed: false }, { card: luna, reversed: false }, { card: torre, reversed: false }]);
    expect(r.verdict).toBe("depende");
    expect(r.tiebreak).toBe(true);
  });
});
```

Antes de correr, confirmar en `cards.json` que `el-sol` es "sí", `la-torre` es "no" y `la-luna` es "depende"; si no, elegir otras tres cartas con esos valores y ajustar el test.

- [ ] **Step 2: Correr y verificar que fallan**

Run: `cd webApp && npx vitest run src/lib/tarot/dignities.test.ts src/lib/tarot/yes-no.test.ts`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/tarot/dignities.ts
import type { Element } from "./cards";

export type Dignity = "intensifica" | "refuerza" | "debilita" | "neutral";

const FRIENDS: Record<Element, Element> = { fuego: "aire", aire: "fuego", agua: "tierra", tierra: "agua" };
const ENEMIES: Record<Element, Element> = { fuego: "agua", agua: "fuego", aire: "tierra", tierra: "aire" };

export function dignityBetween(a: Element, b: Element): Dignity {
  if (a === b) return "intensifica";
  if (FRIENDS[a] === b) return "refuerza";
  if (ENEMIES[a] === b) return "debilita";
  return "neutral";
}
```

```ts
// webApp/src/lib/tarot/yes-no.ts
import type { Card } from "./cards";

export type Verdict = "sí" | "no" | "depende";

const DOWN: Record<Verdict, Verdict> = { "sí": "depende", depende: "no", no: "no" };

export function cardVerdict(card: Card, reversed: boolean): Verdict {
  return reversed ? DOWN[card.si_no] : card.si_no;
}

export function yesNoVerdict(cards: { card: Card; reversed: boolean }[]): { verdict: Verdict; votes: Verdict[]; tiebreak: boolean } {
  const votes = cards.map((c) => cardVerdict(c.card, c.reversed));
  if (votes.length === 1) return { verdict: votes[0]!, votes, tiebreak: false };
  const tally = new Map<Verdict, number>();
  for (const v of votes) tally.set(v, (tally.get(v) ?? 0) + 1);
  const majority = [...tally.entries()].find(([, n]) => n >= 2);
  if (majority) return { verdict: majority[0], votes, tiebreak: false };
  return { verdict: votes[Math.floor(votes.length / 2)]!, votes, tiebreak: true };
}
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `cd webApp && npx vitest run src/lib/tarot/dignities.test.ts src/lib/tarot/yes-no.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/tarot/dignities.ts webApp/src/lib/tarot/yes-no.ts webApp/src/lib/tarot/dignities.test.ts webApp/src/lib/tarot/yes-no.test.ts
git commit -m "feat(tarot): dignidades elementales Golden Dawn y veredicto sí/no

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Reglas de lectura (`buildReading`)

**Files:**
- Create: `webApp/src/lib/tarot/data/combos.json`
- Create: `webApp/src/lib/tarot/reading.ts`
- Test: `webApp/src/lib/tarot/reading.test.ts`

**Interfaces:**
- Consumes: `CARDS`, `cardByIndex`, `baseElement`, `Card` (Task 1); `Spread`, `Position`, `positionsFor`, `spreadBySlug` (Task 2); `Reading`, `DrawnCard` (Task 3); `dignityBetween`, `Dignity`, `yesNoVerdict`, `Verdict` (Task 4).
- Produces:

```ts
export type Domain = "amor" | "trabajo" | "dinero" | "salud";
export type PlacedCard = { position: Position; card: Card; reversed: boolean; meaning: string; keywords: string[]; domainText: string | null };
export type Link = { from: PlacedCard; to: PlacedCard; dignity: Dignity };
export type Proportions = { majors: number; majorsDominant: boolean; dominantSuit: Suit | null; absentSuits: Suit[]; courts: number; peopleInvolved: boolean; reversed: number; blocked: boolean; repeatedNumbers: number[] };
export type Combo = { a: string; b: string; texto: string };
export type ReadingFacts = { spread: Spread; question: string | null; domain: Domain | null; placed: PlacedCard[]; links: Link[]; proportions: Proportions; combos: Combo[]; quintessence: Card | null; yesNo: { verdict: Verdict; votes: Verdict[]; tiebreak: boolean } | null };
export function classifyDomain(question: string | null): Domain | null;
export function buildReading(reading: Reading, question?: string | null): ReadingFacts;
```

- [ ] **Step 1: Escribir `combos.json`** (pares de la tabla B.6 de la investigación que son pares de cartas sin orientación; se omiten la tríada 40 y el par 39 que depende de invertida)

```json
[
  { "a": "la-torre", "b": "el-sol", "texto": "Un cambio brusco que termina en claridad: la luz después de la tormenta." },
  { "a": "la-torre", "b": "la-estrella", "texto": "Algo se derrumba para que crezca lo nuevo; después del golpe llega la esperanza." },
  { "a": "la-torre", "b": "el-diablo", "texto": "Una crisis que rompe un patrón dañino y obliga a mirar lo que se evitaba." },
  { "a": "la-torre", "b": "la-rueda-de-la-fortuna", "texto": "Un giro abrupto que no se controla y que, visto de lejos, abre una puerta." },
  { "a": "la-torre", "b": "los-enamorados", "texto": "Un vínculo o una elección sacudidos hasta que queda solo lo genuino." },
  { "a": "la-torre", "b": "la-justicia", "texto": "Consecuencias que llegan: lo que estaba pendiente se cobra." },
  { "a": "la-torre", "b": "el-emperador", "texto": "Una estructura o una autoridad a punto de tambalear." },
  { "a": "los-enamorados", "b": "el-diablo", "texto": "Deseo y dependencia juntos: un vínculo intenso que puede ser leal o atar." },
  { "a": "los-enamorados", "b": "tres-de-espadas", "texto": "Una elección atravesada por dolor o traición; un tercero en la escena." },
  { "a": "la-muerte", "b": "diez-de-espadas", "texto": "El golpe final que cierra un ciclo doloroso; ya no queda nada por perder." },
  { "a": "la-muerte", "b": "la-torre", "texto": "Un cambio súbito que tira abajo lo viejo y deja el terreno libre para reconstruir." },
  { "a": "la-muerte", "b": "la-estrella", "texto": "Tras el final, una esperanza renovada que sana." },
  { "a": "la-muerte", "b": "el-sol", "texto": "Una transformación que desemboca en alegría." },
  { "a": "la-muerte", "b": "el-loco", "texto": "Un final abrupto que abre un comienzo sin plan, liviano." },
  { "a": "la-muerte", "b": "el-diablo", "texto": "Un cambio que libera de una atadura o de un hábito tóxico." },
  { "a": "la-muerte", "b": "los-enamorados", "texto": "Un cambio importante en una relación; una decisión afectiva." },
  { "a": "la-muerte", "b": "diez-de-copas", "texto": "Una transformación familiar o emocional que termina en armonía." },
  { "a": "la-muerte", "b": "tres-de-espadas", "texto": "Un cambio que sana heridas; el perdón es posible." },
  { "a": "la-muerte", "b": "ocho-de-copas", "texto": "Dejar atrás lo que ya no llena." },
  { "a": "la-muerte", "b": "seis-de-espadas", "texto": "Un cambio que implica mudanza, viaje o cruzar a otra orilla." },
  { "a": "la-muerte", "b": "as-de-oros", "texto": "Un cierre que abre una oportunidad material." },
  { "a": "la-muerte", "b": "el-mundo", "texto": "El cierre completo de un ciclo de vida; plenitud." },
  { "a": "el-sol", "b": "la-luna", "texto": "Un tiempo de cambio que pide equilibrar intuición y acción; el Sol disipa la niebla de la Luna." },
  { "a": "la-estrella", "b": "la-luna", "texto": "Sanación emocional que exige mirar primero lo que se teme." },
  { "a": "la-emperatriz", "b": "el-emperador", "texto": "Nutrir y estructurar en equilibrio: algo nuevo, estable y abundante." },
  { "a": "el-mago", "b": "la-sacerdotisa", "texto": "Acción consciente e intuición: prestá atención a sueños y señales." },
  { "a": "la-sacerdotisa", "b": "el-sumo-sacerdote", "texto": "Buscar guía adentro y afuera, en la tradición y en el silencio." },
  { "a": "la-fuerza", "b": "el-carro", "texto": "Poder interior sereno y empuje exterior: equilibrar los dos." },
  { "a": "el-ermitano", "b": "el-colgado", "texto": "Introspección y entrega: soltar el control y confiar en el proceso." },
  { "a": "el-loco", "b": "el-mundo", "texto": "Un capítulo se cierra y otro empieza; el individuo y el todo en equilibrio." },
  { "a": "el-juicio", "b": "los-enamorados", "texto": "Un llamado con mensaje sobre una elección del corazón." },
  { "a": "siete-de-copas", "b": "el-loco", "texto": "Muchas opciones y ganas de arrancar: esperar el momento sin estancarse." },
  { "a": "reina-de-copas", "b": "rey-de-oros", "texto": "Emoción con practicidad; cuidado con que cada parte viva en lo suyo." },
  { "a": "as-de-espadas", "b": "cinco-de-copas", "texto": "Una claridad que no consuela: la lógica frente al duelo." },
  { "a": "dos-de-espadas", "b": "tres-de-oros", "texto": "Una indecisión que traba el trabajo en equipo." },
  { "a": "tres-de-bastos", "b": "caballero-de-bastos", "texto": "Fuego doble: expansión y acción veloz." },
  { "a": "el-emperador", "b": "ocho-de-bastos", "texto": "Liderazgo con velocidad; decisiones rápidas." },
  { "a": "el-sol", "b": "seis-de-bastos", "texto": "Éxito reconocido, celebración pública." },
  { "a": "el-carro", "b": "la-torre", "texto": "Un avance que choca contra un derrumbe: frenar antes del impacto." }
]
```

Verificar que cada `a` y `b` existe en `cards.json` (el test lo hace).

- [ ] **Step 2: Escribir el test que falla**

```ts
// webApp/src/lib/tarot/reading.test.ts
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
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `cd webApp && npx vitest run src/lib/tarot/reading.test.ts`
Expected: FAIL con "Cannot find module './reading'".

- [ ] **Step 4: Implementar `reading.ts`**

```ts
// webApp/src/lib/tarot/reading.ts
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
  amor: /\b(amor|pareja|novi[oa]|ex|relaci[oó]n|casamiento|matrimonio|vínculo|vinculo|enamor|sentimient|coraz[oó]n|volver[aá]?)\b/i,
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
  const dominant = [...bySuit.entries()].find(([, c]) => minors.length >= 2 && c * 2 >= minors.length);
  const courts = placed.filter((p) => p.card.arcano === "menor" && p.card.numero >= 11).length;
  const reversed = placed.filter((p) => p.reversed).length;
  const numbers = new Map<number, number>();
  for (const p of minors.filter((m) => m.card.numero <= 10)) numbers.set(p.card.numero, (numbers.get(p.card.numero) ?? 0) + 1);
  return {
    majors,
    majorsDominant: n >= 3 && majors * 2 >= n,
    dominantSuit: dominant ? dominant[0] : null,
    absentSuits: n >= 3 ? SUITS.filter((s) => !bySuit.has(s)) : [],
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
```

- [ ] **Step 5: Correr y verificar que pasa**

Run: `cd webApp && npx vitest run src/lib/tarot/reading.test.ts`
Expected: PASS. Si el test de dignidades falla porque el dataset asigna a la Torre o al Sol otro elemento, revisar `elemento` en `cards.json` contra la tabla de mayores de `research/tarot/tarot-historia-esoterismo.md` (Torre = Marte/fuego, Sol = fuego, Luna = agua) y corregir el dato, no el test.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/tarot/data/combos.json webApp/src/lib/tarot/reading.ts webApp/src/lib/tarot/reading.test.ts
git commit -m "feat(tarot): hechos de la lectura: posiciones, hilo con dignidades, proporciones, combos, quintaesencia

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Prosa por plantillas (`renderReading`)

**Files:**
- Create: `webApp/src/lib/tarot/data/templates.json`
- Create: `webApp/src/lib/tarot/prose.ts`
- Test: `webApp/src/lib/tarot/prose.test.ts`

**Interfaces:**
- Consumes: `ReadingFacts`, `PlacedCard`, `Link` (Task 5); `readingSeed` (Task 3); `SPREADS`, `positionsFor` (Task 2); `CARDS` (Task 1).
- Produces: `type ReadingText = { apertura: string; panorama: string | null; posiciones: { titulo: string; texto: string }[]; hilo: string | null; sintesis: string; consejo: string }`, `renderReading(facts: ReadingFacts, seed: number): ReadingText`.

- [ ] **Step 1: Escribir `templates.json`**

Cada clave tiene ≥ 3 variantes. Los marcadores entre llaves se reemplazan; ninguno puede quedar sin resolver.

```json
{
  "apertura": [
    "Mezclaste y elegiste; ahora las cartas te devuelven una imagen. Leela como un espejo, no como una sentencia.",
    "Esto no es una predicción cerrada: es una foto de las energías en juego, para que decidas con más claridad.",
    "Tomate un momento con cada carta antes de leer su texto. Lo que ya sentiste al verla también cuenta."
  ],
  "apertura_pregunta": [
    "Preguntaste: «{pregunta}». Las cartas responden en el lenguaje de las imágenes; vamos de a una.",
    "Sobre «{pregunta}», esto es lo que aparece. Leelo como un espejo, no como una sentencia.",
    "«{pregunta}». Con eso en mente, mirá primero las cartas y después el texto."
  ],
  "panorama_mayores": [
    "Hay más arcanos mayores que menores: lo que se mueve acá es grande, de fondo, y no depende solo de lo cotidiano.",
    "Predominan los mayores. Las fuerzas en juego son de las que marcan etapas, no las que se arreglan en una semana.",
    "Casi todo son mayores: la tirada habla de un proceso de vida, no de un detalle."
  ],
  "panorama_palo": {
    "bastos": ["Pesan los bastos: energía, impulso, proyectos. El tema pide acción.", "Mucho fuego de bastos: ganas, movimiento y algo de impaciencia.", "Los bastos dominan: hay deseo de hacer, y conviene encauzarlo."],
    "copas": ["Pesan las copas: lo emocional y los vínculos están en el centro.", "Mucha agua de copas: sentimientos, afectos, intuición.", "Las copas dominan: lo que importa acá se siente antes que se piensa."],
    "espadas": ["Pesan las espadas: pensamientos, decisiones, conflicto o claridad.", "Mucho aire de espadas: la cabeza está trabajando de más.", "Las espadas dominan: hay algo que resolver con lucidez, no con fuerza."],
    "oros": ["Pesan los oros: lo material, el cuerpo, el trabajo y la plata.", "Mucha tierra de oros: el tema es concreto y se construye despacio.", "Los oros dominan: hablamos de bases, recursos y constancia."]
  },
  "panorama_gente": [
    "Aparecen varias figuras: hay otras personas con peso real en esto.",
    "Las figuras de corte se repiten: no estás sola en la situación, y eso cuenta.",
    "Dos o más figuras: el tema tiene nombres y apellidos."
  ],
  "panorama_bloqueo": [
    "Muchas cartas invertidas: la energía está, pero trabada o mirando hacia adentro. No es un mal augurio, es una pausa.",
    "La mayoría salió invertida. Leelo como procesos internos y demoras, no como negaciones.",
    "Predominan las invertidas: algo se está cocinando por dentro antes de salir."
  ],
  "panorama_numero": [
    "Se repite el {numero}: insistí en ese tema, la tirada lo subraya.",
    "El número {numero} aparece más de una vez: es una lección que vuelve.",
    "Varias cartas con el {numero}: un mismo ritmo atraviesa toda la tirada."
  ],
  "posicion_derecha": [
    "{nombre} en «{posicion}». {significado}",
    "En «{posicion}» aparece {nombre}. {significado}",
    "{nombre}, para «{posicion}». {significado}"
  ],
  "posicion_invertida": [
    "{nombre} invertida en «{posicion}». {significado}",
    "En «{posicion}», {nombre} al revés: {significado}",
    "{nombre} invertida, para «{posicion}». {significado}"
  ],
  "posicion_dominio": {
    "amor": ["En lo afectivo: {texto}", "Para el vínculo: {texto}", "En el amor: {texto}"],
    "trabajo": ["En lo laboral: {texto}", "Para el trabajo: {texto}", "En tu ocupación: {texto}"],
    "dinero": ["En lo económico: {texto}", "Para la plata: {texto}", "En lo material: {texto}"],
    "salud": ["En el cuerpo: {texto}", "Para la salud: {texto}", "En lo físico: {texto}"]
  },
  "hilo": {
    "intensifica": ["{a} y {b} comparten elemento: lo que trae la primera, la segunda lo amplifica.", "De {a} a {b} no hay freno: misma energía, más intensa.", "{b} sube el volumen de {a}."],
    "refuerza": ["{a} alimenta a {b}: una le da pie a la otra.", "Entre {a} y {b} hay buena química; el pasaje es natural.", "{b} toma lo que deja {a} y lo lleva más lejos."],
    "debilita": ["{a} y {b} se contradicen: lo que una enciende, la otra lo enfría. Ahí está la tensión.", "De {a} a {b} hay un choque; no se anulan, pero se frenan.", "{b} le pone un límite a {a}."],
    "neutral": ["{a} deja lugar a {b} sin empujar ni frenar.", "De {a} a {b} el paso es tranquilo.", "{b} sigue a {a} por su propio camino."]
  },
  "combo": [
    "Dos cartas de esta tirada tienen una lectura clásica juntas: {texto}",
    "Hay una pareja conocida entre las cartas: {texto}",
    "Vale mirar {a} y {b} juntas: {texto}"
  ],
  "quintaesencia": [
    "Sumando los mayores aparece {nombre} como carta de síntesis: {palabras}.",
    "La quintaesencia de la tirada es {nombre}: {palabras}.",
    "Si hubiera que resumir todo en una carta sería {nombre}: {palabras}."
  ],
  "sintesis": [
    "En conjunto, la tirada muestra {claves}. Quedate con lo que resonó; lo que no, dejalo pasar.",
    "El hilo de todo es {claves}. No hace falta que todo encaje hoy.",
    "Si una frase resume la tirada: {claves}."
  ],
  "sino": {
    "sí": ["La respuesta se inclina al sí. {detalle}", "Las cartas dicen que sí, con lo que eso implica. {detalle}", "Sí. {detalle}"],
    "no": ["La respuesta se inclina al no, al menos por ahora. {detalle}", "Las cartas dicen que no, o que no así. {detalle}", "No por este camino. {detalle}"],
    "depende": ["No hay un sí ni un no claros: depende de lo que hagas con esto. {detalle}", "La respuesta es «depende»: hay condiciones. {detalle}", "Ni sí ni no: mirá la carta y lo que te pide. {detalle}"]
  },
  "sino_desempate": ["Los votos se repartieron y decidió la carta del centro.", "No hubo mayoría; pesó la carta central."],
  "consejo": [
    "Consejo de la tirada: {consejo}",
    "Para llevarte: {consejo}",
    "Si te quedás con una sola cosa: {consejo}"
  ]
}
```

- [ ] **Step 2: Escribir el test que falla**

```ts
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
    const r: Reading = { spread: "si-o-no", cards: [{ indice: 19, reversed: false }, { indice: 18, reversed: false }, { indice: 16, reversed: false }] };
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
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `cd webApp && npx vitest run src/lib/tarot/prose.test.ts`
Expected: FAIL con "Cannot find module './prose'".

- [ ] **Step 4: Implementar `prose.ts`**

```ts
// webApp/src/lib/tarot/prose.ts
import templates from "./data/templates.json";
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

function nombre(p: PlacedCard): string {
  return p.card.nombre_es;
}

function panorama(facts: ReadingFacts, rng: () => number): string | null {
  const { proportions: pr } = facts;
  const parts: string[] = [];
  if (pr.majorsDominant) parts.push(pick(rng, templates.panorama_mayores));
  if (pr.dominantSuit) parts.push(pick(rng, templates.panorama_palo[pr.dominantSuit]));
  if (pr.peopleInvolved) parts.push(pick(rng, templates.panorama_gente));
  if (pr.blocked) parts.push(pick(rng, templates.panorama_bloqueo));
  for (const n of pr.repeatedNumbers) parts.push(fill(pick(rng, templates.panorama_numero), { numero: String(n) }));
  return parts.length ? parts.join(" ") : null;
}

function posicion(p: PlacedCard, facts: ReadingFacts, rng: () => number): { titulo: string; texto: string } {
  const base = fill(pick(rng, p.reversed ? templates.posicion_invertida : templates.posicion_derecha), {
    nombre: nombre(p),
    posicion: p.position.nombre,
    significado: p.meaning,
  });
  const dominio = facts.domain && p.domainText ? " " + fill(pick(rng, templates.posicion_dominio[facts.domain]), { texto: p.domainText }) : "";
  return { titulo: `${p.position.n}. ${p.position.nombre}`, texto: base + dominio };
}

function hilo(links: Link[], rng: () => number): string | null {
  if (links.length === 0) return null;
  return links.map((l) => fill(pick(rng, templates.hilo[l.dignity]), { a: nombre(l.from), b: nombre(l.to) })).join(" ");
}

function sintesis(facts: ReadingFacts, rng: () => number): string {
  const parts: string[] = [];
  if (facts.yesNo) {
    const centro = facts.placed[Math.floor(facts.placed.length / 2)]!;
    const detalle = `${nombre(centro)}${centro.reversed ? " invertida" : ""} habla de ${centro.keywords.slice(0, 3).join(", ")}.`;
    parts.push(fill(pick(rng, templates.sino[facts.yesNo.verdict]), { detalle }));
    if (facts.yesNo.tiebreak) parts.push(pick(rng, templates.sino_desempate));
  }
  for (const c of facts.combos) {
    const a = facts.placed.find((p) => p.card.id === c.a)!;
    const b = facts.placed.find((p) => p.card.id === c.b)!;
    parts.push(fill(pick(rng, templates.combo), { texto: c.texto, a: nombre(a), b: nombre(b) }));
  }
  if (facts.quintessence) {
    parts.push(fill(pick(rng, templates.quintaesencia), { nombre: facts.quintessence.nombre_es, palabras: facts.quintessence.palabras_clave_derecha.slice(0, 3).join(", ") }));
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
```

- [ ] **Step 5: Correr y verificar que pasa**

Run: `cd webApp && npx vitest run src/lib/tarot/prose.test.ts`
Expected: PASS. El test exhaustivo tarda unos segundos (4 tiradas × 78 × 2 × posiciones ≈ 5.000 renders). Si pasa de 20 s, bajar `others` a un conjunto fijo pero mantener el barrido de las 78 cartas en cada posición.

- [ ] **Step 6: Correr toda la suite del motor, tsc y lint**

Run: `cd webApp && npx vitest run src/lib/tarot && npx tsc --noEmit && npm run lint`
Expected: todo verde.

- [ ] **Step 7: Commit**

```bash
git add webApp/src/lib/tarot/data/templates.json webApp/src/lib/tarot/prose.ts webApp/src/lib/tarot/prose.test.ts
git commit -m "feat(tarot): prosa de la lectura por plantillas con variantes deterministas

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Imágenes de las 78 cartas y componentes de carta

**Files:**
- Create: `webApp/scripts/tarot-images.mjs`
- Create: `webApp/public/tarot/rws/*.webp` (78) y `webApp/public/tarot/rws/CREDITS.md`
- Create: `webApp/src/components/tarot/CardBack.tsx`, `webApp/src/components/tarot/TarotCard.tsx`, `webApp/src/components/tarot/SpreadLayout.tsx`
- Modify: `webApp/package.json` (devDependency `sharp`)

**Interfaces:**
- Produces: `cardImageSrc(slug: string): string` (en `TarotCard.tsx`, exportado), `<TarotCard card={Card} reversed={boolean} size="sm"|"md"|"lg" priority? />`, `<CardBack className? />`, `<SpreadLayout positions={Position[]} render={(p: Position, i: number) => ReactNode} />`.

- [ ] **Step 1: Instalar `sharp` como dependencia de desarrollo**

Run: `cd webApp && npm install --save-dev sharp`

- [ ] **Step 2: Escribir el script de imágenes**

```js
// webApp/scripts/tarot-images.mjs
// Se corre a mano UNA vez (no en CI): baja los escaneos de dominio publico del Rider-Waite 1909 desde
// Wikimedia Commons y los deja como WebP en public/tarot/rws. Uso:
//   node scripts/tarot-images.mjs --probe     (baja 5 cartas de cada serie para elegir)
//   node scripts/tarot-images.mjs --serie=<nombre de categoria>   (baja las 78)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import cards from "../src/lib/tarot/data/cards.json" with { type: "json" };

const API = "https://commons.wikimedia.org/w/api.php";
const OUT = join(import.meta.dirname, "..", "public", "tarot", "rws");
const HEIGHT = 600;
const UA = "humano-despierto-tarot/1.0 (contacto: ver README del repo)";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function categoryFiles(category) {
  const files = [];
  let cmcontinue;
  do {
    const r = await api({ action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmtype: "file", cmlimit: "500", ...(cmcontinue ? { cmcontinue } : {}) });
    files.push(...r.query.categorymembers.map((m) => m.title));
    cmcontinue = r.continue?.cmcontinue;
  } while (cmcontinue);
  return files;
}

async function fileInfo(title) {
  const r = await api({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|extmetadata" });
  const page = Object.values(r.query.pages)[0];
  const ii = page.imageinfo[0];
  return { url: ii.url, license: ii.extmetadata?.LicenseShortName?.value ?? "?", artist: ii.extmetadata?.Artist?.value ?? "?" };
}

// Las series de Commons nombran los archivos de formas distintas; se empareja por nombre en ingles.
function matchCard(title) {
  const t = title.toLowerCase().replace(/[_\-.]/g, " ");
  return cards.find((c) => {
    const en = c.nombre_en.toLowerCase().replace(/^the /, "");
    return t.includes(en) || (c.arcano === "menor" && t.includes(en.replace(" of ", " ")));
  });
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function toWebp(buf) {
  return sharp(buf).trim({ threshold: 20 }).resize({ height: HEIGHT, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const serie = args.serie ?? "Rider-Waite tarot deck";
  const titles = await categoryFiles(serie);
  const wanted = args.probe ? ["el-loco", "la-luna", "reina-de-copas", "diez-de-espadas", "as-de-oros"] : cards.map((c) => c.id);
  const credits = [`# Créditos\n\nSerie de Wikimedia Commons: \`Category:${serie}\`. Ilustraciones de Pamela Colman Smith (1909), dominio público (la autora murió en 1951).\n\n| Carta | Archivo | Licencia |\n|---|---|---|`];
  let done = 0;
  for (const title of titles) {
    const card = matchCard(title);
    if (!card || !wanted.includes(card.id)) continue;
    const info = await fileInfo(title);
    const webp = await toWebp(await download(info.url));
    writeFileSync(join(OUT, `${card.id}.webp`), webp);
    credits.push(`| ${card.nombre_es} | ${title} | ${info.license} |`);
    console.log(`${card.id} ← ${title} (${Math.round(webp.length / 1024)} KB, ${info.license})`);
    done++;
  }
  if (!args.probe) writeFileSync(join(OUT, "CREDITS.md"), credits.join("\n") + "\n");
  console.log(`${done}/${wanted.length} cartas`);
  if (done !== wanted.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Probar con dos series y elegir**

Run: `cd webApp && node scripts/tarot-images.mjs --probe --serie="Rider-Waite tarot deck"` y luego con la serie alternativa que figure en `docs/superpowers/research/tarot/rider-waite-notas.md` (sección de imágenes: "Roses and Lilies", "Geldard", "TaionWC"). Abrir los 5 WebP de cada una y elegir la de mejor nitidez y color. Si `matchCard` no empareja los nombres de la serie elegida, ajustar la función a los nombres reales de esa categoría (mirar los `titles` impresos) y volver a probar.

Expected: 5/5 cartas por serie, cada una ≤ 60 KB.

- [ ] **Step 4: Bajar las 78 con la serie elegida y verificar**

Run: `cd webApp && node scripts/tarot-images.mjs --serie="<serie elegida>" && ls public/tarot/rws/*.webp | wc -l && du -sh public/tarot/rws`
Expected: `78` y un total ≤ 4 MB. Todas las licencias en `CREDITS.md` deben decir `Public domain` o equivalente; si alguna no, reemplazar esa carta desde otra serie y anotarlo en el mismo archivo.

- [ ] **Step 5: Escribir los componentes**

```tsx
// webApp/src/components/tarot/CardBack.tsx
import { cn } from "@/lib/utils/cn";

export default function CardBack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 170" role="img" aria-label="Carta boca abajo" className={cn("h-full w-full rounded-md", className)}>
      <rect width="100" height="170" rx="6" className="fill-bosque" />
      <rect x="6" y="6" width="88" height="158" rx="4" fill="none" className="stroke-miel" strokeWidth="1.5" />
      <circle cx="50" cy="85" r="22" fill="none" className="stroke-miel" strokeWidth="1" />
      <circle cx="50" cy="85" r="14" fill="none" className="stroke-salvia" strokeWidth="0.8" />
      <path d="M50 63v44M28 85h44M34.4 69.4l31.2 31.2M65.6 69.4L34.4 100.6" className="stroke-miel" strokeWidth="0.6" />
    </svg>
  );
}
```

```tsx
// webApp/src/components/tarot/TarotCard.tsx
import Image from "next/image";
import type { Card } from "@/lib/tarot/cards";
import { cn } from "@/lib/utils/cn";

const SIZES = { sm: "w-16", md: "w-28", lg: "w-44" } as const;

export function cardImageSrc(slug: string): string {
  return `/tarot/rws/${slug}.webp`;
}

export default function TarotCard({ card, reversed = false, size = "md", priority = false, className }: { card: Card; reversed?: boolean; size?: keyof typeof SIZES; priority?: boolean; className?: string }) {
  return (
    <figure className={cn("shrink-0", SIZES[size], className)}>
      <div className={cn("relative aspect-[1/1.7] overflow-hidden rounded-md bg-salvia-100 shadow-card", reversed && "rotate-180")}>
        <Image src={cardImageSrc(card.id)} alt={`${card.nombre_es}${reversed ? ", invertida" : ""}`} fill sizes="(max-width: 640px) 30vw, 180px" priority={priority} className="object-cover" />
      </div>
      <figcaption className="mt-2 text-center text-xs font-semibold text-suave">
        {card.nombre_es}
        {reversed && <span className="block font-normal">invertida</span>}
      </figcaption>
    </figure>
  );
}
```

```tsx
// webApp/src/components/tarot/SpreadLayout.tsx
import type { ReactNode } from "react";
import type { Position } from "@/lib/tarot/spreads";

/** Grilla CSS a partir de x/y de cada posición. Dos posiciones en la misma celda (cruz celta 1 y 2) se apilan. */
export default function SpreadLayout({ positions, render }: { positions: Position[]; render: (p: Position, i: number) => ReactNode }) {
  const cols = Math.max(...positions.map((p) => p.x)) + 1;
  const rows = Math.max(...positions.map((p) => p.y)) + 1;
  return (
    <div className="mx-auto grid w-fit gap-4" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {positions.map((p, i) => (
        <div key={p.n} className={p.rotada ? "rotate-90 scale-90" : undefined} style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}>
          {render(p, i)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: tsc y lint**

Run: `cd webApp && npx tsc --noEmit && npm run lint`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add webApp/scripts/tarot-images.mjs webApp/public/tarot webApp/src/components/tarot/CardBack.tsx webApp/src/components/tarot/TarotCard.tsx webApp/src/components/tarot/SpreadLayout.tsx webApp/package.json webApp/package-lock.json
git commit -m "feat(tarot): 78 cartas RWS 1909 en WebP desde Commons, dorso SVG y componentes de carta

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Rutas públicas: portada, índice y fichas de cartas, sitemap y SEO

**Files:**
- Create: `webApp/src/components/tarot/EthicsNote.tsx`
- Create: `webApp/src/app/(marketing)/tarot/page.tsx`
- Create: `webApp/src/app/(marketing)/tarot/cartas/page.tsx`
- Create: `webApp/src/app/(marketing)/tarot/cartas/[slug]/page.tsx`
- Modify: `webApp/src/app/sitemap.ts` (agregar rutas de tarot)
- Modify: `webApp/src/lib/ui/nav-links.ts` (agregar `{ label: "Tarot", href: "/tarot" }` a `PUBLIC`)
- Modify: `webApp/scripts/check-seo.sh` (sumar `/tarot` y `/tarot/cartas/el-loco` a la lista de rutas públicas; `/tarot/lectura` a las privadas si el script tiene esa lista)

**Interfaces:**
- Consumes: `CARDS`, `cardBySlug` (Task 1); `SPREADS` (Task 2); `TarotCard`, `cardImageSrc` (Task 7).
- Produces: `<EthicsNote />`.

- [ ] **Step 1: `EthicsNote.tsx`**

```tsx
// webApp/src/components/tarot/EthicsNote.tsx
export default function EthicsNote() {
  return (
    <aside className="rounded-lg border border-linea bg-salvia-100 p-5 text-sm text-tinta">
      <p className="font-semibold text-bosque">Cómo leer esto</p>
      <p className="mt-2 max-w-[60ch]">
        El tarot es una herramienta de reflexión y entretenimiento: un espejo para pensar, no una sentencia. No
        reemplaza el consejo de una profesional de la salud, legal o financiera. Si una lectura te inquieta, hablá
        con alguien de confianza.
      </p>
    </aside>
  );
}
```

- [ ] **Step 2: Portada `/tarot`**

```tsx
// webApp/src/app/(marketing)/tarot/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/atoms/SectionHeading";
import { ButtonLink } from "@/components/atoms/Button";
import EthicsNote from "@/components/tarot/EthicsNote";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { SPREADS } from "@/lib/tarot/spreads";

export const metadata: Metadata = {
  title: "Tarot online gratis: tiradas con el Rider-Waite",
  description: "Tirá las cartas online con las 78 del tarot Rider-Waite: carta del día, sí o no, pasado-presente-futuro y cruz celta, con una lectura que relaciona las cartas entre sí.",
  alternates: { canonical: "/tarot" },
  openGraph: { title: "Tarot online gratis", description: "Tiradas con las 78 cartas del Rider-Waite y una lectura que las relaciona.", url: "/tarot", type: "website", images: [SITE_OG_IMAGE] },
};

export default function TarotPage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <header className="mx-auto max-w-[1200px] px-6 pb-12 pt-10">
        <p className="text-sm font-semibold text-miel-800">Tarot online</p>
        <h1 className="mt-3 max-w-[20ch] text-display-lg leading-[1.08] tracking-[-0.025em]">Tirá las cartas y leé lo que te devuelven</h1>
        <p className="mt-5 max-w-[56ch] text-lg text-suave">
          Las 78 cartas del Rider-Waite de 1909, cuatro tiradas y una lectura que no pega significados sueltos: relaciona cada carta con la que viene antes y con la que sigue.
        </p>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-20">
        <SectionHeading eyebrow="Elegí una tirada" title="Cuatro formas de preguntar" />
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {SPREADS.map((s) => (
            <li key={s.slug} className="tarjeta flex flex-col gap-3 p-6">
              <h2 className="text-xl font-bold text-bosque">{s.nombre}</h2>
              <p className="text-suave">{s.descripcion}</p>
              <p className="text-sm text-suave">{s.cartas.join(" o ")} {s.cartas[0] === 1 && s.cartas.length === 1 ? "carta" : "cartas"}</p>
              <div className="mt-auto pt-2">
                <ButtonLink href={`/tarot/${s.slug}`} arrow>Tirar</ButtonLink>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-16 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionHeading eyebrow="Antes de tirar" title="Qué es el tarot y cómo leerlo" />
            <div className="mt-6 space-y-4 text-tinta">
              <p>El tarot nació como juego de cartas en la Italia del siglo XV y recién en el XVIII empezó a usarse para leer. El mazo que usamos lo dibujó Pamela Colman Smith en 1909 bajo la dirección de Arthur Waite, y es el más leído del mundo.</p>
              <p>Leer no es adivinar: es mirar una imagen y dejar que ordene lo que ya sabías. Cada posición de la tirada hace una pregunta distinta, y las cartas se leen en relación, no una por una.</p>
              <p>Si ya preguntaste esto hoy, dejá reposar la respuesta. Repetir la tirada hasta que diga lo que querés no es leer, es discutir con el espejo.</p>
            </div>
            <Link href="/tarot/cartas" className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-miel-800 hover:underline">Ver las 78 cartas y sus significados</Link>
          </div>
          <EthicsNote />
        </section>
      </main>
    </div>
  );
}
```

Si `SectionHeading` no acepta `eyebrow`/`title` con esos nombres, mirar su firma en `src/components/atoms/SectionHeading.tsx` y adaptar las props (no cambiar el átomo).

- [ ] **Step 3: Índice `/tarot/cartas`**

```tsx
// webApp/src/app/(marketing)/tarot/cartas/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/atoms/SectionHeading";
import TarotCard from "@/components/tarot/TarotCard";
import { CARDS, type Suit } from "@/lib/tarot/cards";

export const metadata: Metadata = {
  title: "Las 78 cartas del tarot Rider-Waite y su significado",
  description: "Arcanos mayores y menores del tarot Rider-Waite: significado al derecho e invertida, amor, trabajo, dinero y salud, y sus correspondencias.",
  alternates: { canonical: "/tarot/cartas" },
};

const GROUPS: { titulo: string; filtro: (c: (typeof CARDS)[number]) => boolean }[] = [
  { titulo: "Arcanos mayores", filtro: (c) => c.arcano === "mayor" },
  ...(["bastos", "copas", "espadas", "oros"] as Suit[]).map((palo) => ({ titulo: `Palo de ${palo}`, filtro: (c: (typeof CARDS)[number]) => c.palo === palo })),
];

export default function CartasPage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <SectionHeading eyebrow="Tarot" title="Las 78 cartas" />
        {GROUPS.map((g) => (
          <section key={g.titulo} className="mt-12" aria-labelledby={g.titulo}>
            <h2 id={g.titulo} className="text-2xl font-bold text-bosque">{g.titulo}</h2>
            <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {CARDS.filter(g.filtro).map((c) => (
                <li key={c.id}>
                  <Link href={`/tarot/cartas/${c.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-miel">
                    <TarotCard card={c} size="sm" className="w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Ficha `/tarot/cartas/[slug]`**

```tsx
// webApp/src/app/(marketing)/tarot/cartas/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/atoms/Icon";
import TarotCard, { cardImageSrc } from "@/components/tarot/TarotCard";
import { ButtonLink } from "@/components/atoms/Button";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { getSiteUrl } from "@/lib/server/site-url";
import { CARDS, cardBySlug } from "@/lib/tarot/cards";

export function generateStaticParams() {
  return CARDS.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = cardBySlug(slug);
  if (!card) return { title: "Carta no encontrada" };
  const title = `${card.nombre_es}: significado en el tarot`;
  const description = `${card.nombre_es} (${card.nombre_en}) al derecho: ${card.palabras_clave_derecha.slice(0, 4).join(", ")}. Invertida: ${card.palabras_clave_invertida.slice(0, 3).join(", ")}.`;
  return { title, description, alternates: { canonical: `/tarot/cartas/${slug}` }, openGraph: { title, description, url: `/tarot/cartas/${slug}`, type: "article", images: [SITE_OG_IMAGE] } };
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-bosque">{titulo}</h2>
      <div className="mt-3 space-y-3 text-tinta">{children}</div>
    </section>
  );
}

export default async function CartaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = cardBySlug(slug);
  if (!card) notFound();
  const prev = CARDS[(card.indice + 77) % 78]!;
  const next = CARDS[(card.indice + 1) % 78]!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${card.nombre_es}: significado en el tarot`,
    image: `${getSiteUrl()}${cardImageSrc(card.id)}`,
    about: { "@type": "Thing", name: `${card.nombre_en} (Rider-Waite tarot)` },
    inLanguage: "es-AR",
  };

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-[1000px] px-6 pt-8">
        <Link href="/tarot/cartas" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Todas las cartas
        </Link>
      </div>
      <main className="mx-auto grid max-w-[1000px] gap-10 px-6 pb-20 pt-6 md:grid-cols-[0.4fr_0.6fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <TarotCard card={card} size="lg" priority className="w-full" />
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-suave">Arcano</dt><dd>{card.arcano === "mayor" ? `Mayor, ${card.numero}` : `Menor, ${card.palo}`}</dd>
            <dt className="text-suave">Elemento</dt><dd>{card.elemento}</dd>
            {card.astrologia && <><dt className="text-suave">Astrología</dt><dd>{card.astrologia}</dd></>}
            {card.letra_hebrea && <><dt className="text-suave">Letra hebrea</dt><dd>{card.letra_hebrea}</dd></>}
            {card.numerologia && <><dt className="text-suave">Número</dt><dd>{card.numerologia}</dd></>}
          </dl>
        </div>
        <article>
          <p className="text-sm font-semibold text-miel-800">{card.nombre_en}</p>
          <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{card.nombre_es}</h1>
          <p className="mt-4 text-suave">{card.palabras_clave_derecha.join(" · ")}</p>
          <Bloque titulo="Al derecho"><p>{card.significado_derecha}</p></Bloque>
          <Bloque titulo="Invertida"><p className="text-suave">{card.palabras_clave_invertida.join(" · ")}</p><p>{card.significado_invertida}</p></Bloque>
          <Bloque titulo="En cada área">
            <p><strong className="text-bosque">Amor.</strong> {card.amor}</p>
            <p><strong className="text-bosque">Trabajo.</strong> {card.trabajo}</p>
            <p><strong className="text-bosque">Dinero.</strong> {card.dinero}</p>
            <p><strong className="text-bosque">Salud.</strong> {card.salud}</p>
            <p><strong className="text-bosque">Consejo.</strong> {card.consejo}</p>
          </Bloque>
          <Bloque titulo="La ilustración"><p>{card.descripcion_imagen}</p></Bloque>
          <Bloque titulo="Lo que escribió Waite en 1911">
            <p lang="en" className="text-suave">Upright: {card.waite_divinatory.upright}</p>
            <p lang="en" className="text-suave">Reversed: {card.waite_divinatory.reversed}</p>
          </Bloque>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href="/tarot" arrow>Tirar las cartas</ButtonLink>
            <Link href={`/tarot/cartas/${prev.id}`} className="text-sm font-semibold text-miel-800 hover:underline">Anterior: {prev.nombre_es}</Link>
            <Link href={`/tarot/cartas/${next.id}`} className="text-sm font-semibold text-miel-800 hover:underline">Siguiente: {next.nombre_es}</Link>
          </div>
        </article>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Sitemap, nav y check-seo**

En `webApp/src/app/sitemap.ts`, después de `estaticas`, agregar:

```ts
import { CARDS } from "@/lib/tarot/cards";
import { SPREADS } from "@/lib/tarot/spreads";
// ...
const tarot: MetadataRoute.Sitemap = [
  { url: `${site}/tarot`, priority: 0.9 },
  { url: `${site}/tarot/cartas`, priority: 0.7 },
  ...SPREADS.map((s) => ({ url: `${site}/tarot/${s.slug}`, priority: 0.7 })),
  ...CARDS.map((c) => ({ url: `${site}/tarot/cartas/${c.id}`, priority: 0.5 })),
];
```

y sumar `...tarot` al array devuelto. En `nav-links.ts`, `PUBLIC` pasa a `[Cursos, Guías, Diario, Tarot]` con `{ label: "Tarot", href: "/tarot" }`. En `check-seo.sh`, en la línea `for p in / /cursos /diario /guias /entrar; do` agregar `/tarot /tarot/cartas /tarot/cartas/el-loco`.

- [ ] **Step 6: Verificar en el navegador y con los verificadores**

Run: `cd webApp && npm run dev` y abrir `/tarot`, `/tarot/cartas`, `/tarot/cartas/el-loco`, `/tarot/cartas/no-existe` (404). En otra terminal: `bash scripts/check-seo.sh http://localhost:3000`.
Luego: `cd webApp && npx tsc --noEmit && npm run lint && npm test`.
Expected: todo verde; cada ficha muestra su carta (no la misma para todo slug).

- [ ] **Step 7: Commit**

```bash
git add webApp/src/components/tarot/EthicsNote.tsx "webApp/src/app/(marketing)/tarot" webApp/src/app/sitemap.ts webApp/src/lib/ui/nav-links.ts webApp/scripts/check-seo.sh
git commit -m "feat(tarot): portada, índice y fichas SEO de las 78 cartas, sitemap y nav

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: La tirada interactiva y la página de lectura

**Files:**
- Create: `webApp/src/components/tarot/Picker.tsx`
- Create: `webApp/src/components/tarot/ReadingView.tsx`
- Create: `webApp/src/app/(marketing)/tarot/[tirada]/page.tsx`
- Create: `webApp/src/app/(marketing)/tarot/lectura/page.tsx`
- Create: `webApp/src/lib/tarot/question.ts` + `webApp/src/lib/tarot/question.test.ts`

**Interfaces:**
- Consumes: `shuffleDeck`, `drawReversed`, `cryptoRng` (Task 3); `encodeReading`, `decodeReading`, `readingSeed` (Task 3); `spreadBySlug`, `positionsFor`, `isSpreadSlug` (Task 2); `buildReading` (Task 5); `renderReading` (Task 6); `TarotCard`, `CardBack`, `SpreadLayout` (Task 7); `EthicsNote` (Task 8).
- Produces: `sanitizeQuestion(raw: string | null | undefined): string | null` (recorta, colapsa espacios, quita saltos, máx. 140, vacío → null), `MAX_QUESTION = 140`; `<ReadingView facts text placed />`; `<Picker spread count reversedEnabled question />`.

- [ ] **Step 1: Test y módulo `question.ts`**

```ts
// webApp/src/lib/tarot/question.test.ts
import { describe, expect, it } from "vitest";
import { MAX_QUESTION, sanitizeQuestion } from "./question";

describe("sanitizeQuestion", () => {
  it("vacío, null o solo espacios → null", () => {
    expect(sanitizeQuestion("")).toBeNull();
    expect(sanitizeQuestion("   ")).toBeNull();
    expect(sanitizeQuestion(null)).toBeNull();
    expect(sanitizeQuestion(undefined)).toBeNull();
  });
  it("recorta, colapsa espacios y quita saltos de línea", () => {
    expect(sanitizeQuestion("  ¿Vuelve \n mi   ex? ")).toBe("¿Vuelve mi ex?");
  });
  it("corta a 140 caracteres", () => {
    expect(sanitizeQuestion("a".repeat(200))).toHaveLength(MAX_QUESTION);
  });
});
```

```ts
// webApp/src/lib/tarot/question.ts
export const MAX_QUESTION = 140;

export function sanitizeQuestion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, MAX_QUESTION);
  return q.length ? q : null;
}
```

Run: `cd webApp && npx vitest run src/lib/tarot/question.test.ts` → PASS.

- [ ] **Step 2: `ReadingView.tsx`**

```tsx
// webApp/src/components/tarot/ReadingView.tsx
import SpreadLayout from "@/components/tarot/SpreadLayout";
import TarotCard from "@/components/tarot/TarotCard";
import EthicsNote from "@/components/tarot/EthicsNote";
import type { ReadingFacts } from "@/lib/tarot/reading";
import type { ReadingText } from "@/lib/tarot/prose";
import { positionsFor } from "@/lib/tarot/spreads";

export default function ReadingView({ facts, text }: { facts: ReadingFacts; text: ReadingText }) {
  const positions = positionsFor(facts.spread, facts.placed.length);
  return (
    <div className="space-y-12">
      <SpreadLayout positions={positions} render={(_p, i) => <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size={facts.placed.length > 3 ? "sm" : "md"} priority={i === 0} />} />
      <section className="mx-auto max-w-[68ch] space-y-5 text-lg leading-relaxed text-tinta">
        <p>{text.apertura}</p>
        {text.panorama && <p className="text-suave">{text.panorama}</p>}
      </section>
      <section className="mx-auto max-w-[68ch] space-y-8">
        {text.posiciones.map((p, i) => (
          <article key={p.titulo} className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size="sm" />
            <div>
              <h2 className="text-xl font-bold text-bosque">{p.titulo}</h2>
              <p className="mt-2 text-tinta">{p.texto}</p>
            </div>
          </article>
        ))}
      </section>
      {text.hilo && (
        <section className="mx-auto max-w-[68ch]">
          <h2 className="text-xl font-bold text-bosque">El hilo entre las cartas</h2>
          <p className="mt-2 text-tinta">{text.hilo}</p>
        </section>
      )}
      <section className="mx-auto max-w-[68ch] rounded-lg bg-papel p-6 shadow-card">
        <h2 className="text-xl font-bold text-bosque">Síntesis</h2>
        <p className="mt-2 text-tinta">{text.sintesis}</p>
        <p className="mt-4 font-semibold text-miel-800">{text.consejo}</p>
      </section>
      <div className="mx-auto max-w-[68ch]"><EthicsNote /></div>
    </div>
  );
}
```

- [ ] **Step 3: `Picker.tsx` (cliente)**

```tsx
// webApp/src/components/tarot/Picker.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardBack from "@/components/tarot/CardBack";
import TarotCard from "@/components/tarot/TarotCard";
import SpreadLayout from "@/components/tarot/SpreadLayout";
import { cardByIndex } from "@/lib/tarot/cards";
import { encodeReading, type DrawnCard } from "@/lib/tarot/codec";
import { cryptoRng, drawReversed, shuffleDeck } from "@/lib/tarot/draw";
import { positionsFor, type Spread } from "@/lib/tarot/spreads";
import { cn } from "@/lib/utils/cn";

export default function Picker({ spread, count, reversedEnabled, question }: { spread: Spread; count: number; reversedEnabled: boolean; question: string | null }) {
  const router = useRouter();
  const positions = positionsFor(spread, count);
  // Se mezcla una vez por montaje: el abanico es la misma permutación mientras la persona elige.
  const deck = useMemo(() => shuffleDeck(cryptoRng()), []);
  const [chosen, setChosen] = useState<{ slot: number; card: DrawnCard }[]>([]);
  const taken = new Set(chosen.map((c) => c.slot));
  const current = positions[chosen.length];

  function pick(slot: number) {
    if (!current || taken.has(slot)) return;
    const card: DrawnCard = { indice: deck[slot]!, reversed: drawReversed(cryptoRng(), reversedEnabled && spread.allowReversed) };
    const next = [...chosen, { slot, card }];
    setChosen(next);
    if (next.length === positions.length) {
      const params = new URLSearchParams({ t: spread.slug, c: encodeReading({ spread: spread.slug, cards: next.map((n) => n.card) }) });
      if (question) params.set("q", question);
      router.push(`/tarot/lectura?${params}`);
    }
  }

  return (
    <div className="space-y-10">
      <p aria-live="polite" className="text-center text-lg font-semibold text-bosque">
        {current ? `Elegí la carta para: ${current.nombre}` : "Leyendo…"}
      </p>
      <SpreadLayout positions={positions} render={(p, i) => {
        const c = chosen[i];
        return c ? <TarotCard card={cardByIndex(c.card.indice)!} reversed={c.card.reversed} size="sm" /> : <div className="aspect-[1/1.7] w-16 rounded-md border border-dashed border-salvia" aria-label={`${p.nombre}, vacía`} />;
      }} />
      <ul className="flex flex-wrap justify-center gap-1" aria-label="Mazo mezclado, boca abajo">
        {deck.map((_, slot) => (
          <li key={slot}>
            <button type="button" onClick={() => pick(slot)} disabled={taken.has(slot) || !current} aria-label={`Carta ${slot + 1} del mazo`} className={cn("h-20 w-12 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-miel disabled:opacity-30", taken.has(slot) && "invisible")}>
              <CardBack />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Página `/tarot/[tirada]`** (formulario de preparación como `<form method="get">` hacia la misma ruta; con `?listo=1` muestra el `Picker`)

```tsx
// webApp/src/app/(marketing)/tarot/[tirada]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/atoms/Button";
import Icon from "@/components/atoms/Icon";
import Picker from "@/components/tarot/Picker";
import { MAX_QUESTION, sanitizeQuestion } from "@/lib/tarot/question";
import { spreadBySlug, SPREADS } from "@/lib/tarot/spreads";

type Search = { listo?: string; q?: string; inv?: string; n?: string };

export function generateStaticParams() {
  return SPREADS.map((s) => ({ tirada: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tirada: string }> }): Promise<Metadata> {
  const { tirada } = await params;
  const spread = spreadBySlug(tirada);
  if (!spread) return { title: "Tirada no encontrada" };
  return { title: `${spread.nombre}: tirada de tarot online`, description: spread.descripcion, alternates: { canonical: `/tarot/${tirada}` } };
}

export default async function TiradaPage({ params, searchParams }: { params: Promise<{ tirada: string }>; searchParams: Promise<Search> }) {
  const { tirada } = await params;
  const spread = spreadBySlug(tirada);
  if (!spread) notFound();
  const sp = await searchParams;
  const question = sanitizeQuestion(sp.q);
  const count = spread.cartas.includes(Number(sp.n)) ? Number(sp.n) : spread.cartas[0]!;
  const reversedEnabled = spread.allowReversed && sp.inv !== "0";

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <div className="mx-auto max-w-[1000px] px-6 pt-8">
        <Link href="/tarot" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline"><Icon name="arrow-left" />Todas las tiradas</Link>
      </div>
      <main className="mx-auto max-w-[1000px] px-6 pb-20 pt-6">
        <h1 className="text-display-lg leading-[1.08] tracking-[-0.025em]">{spread.nombre}</h1>
        <p className="mt-3 max-w-[56ch] text-suave">{spread.descripcion}</p>
        {sp.listo === "1" ? (
          <div className="mt-10">
            {question && <p className="mb-6 text-center text-tinta">Tu pregunta: «{question}»</p>}
            <Picker spread={spread} count={count} reversedEnabled={reversedEnabled} question={question} />
          </div>
        ) : (
          <form method="get" className="mt-10 max-w-[48ch] space-y-6">
            <input type="hidden" name="listo" value="1" />
            <label className="block">
              <span className="text-sm font-semibold text-bosque">Tu pregunta (opcional)</span>
              <input name="q" maxLength={MAX_QUESTION} defaultValue={question ?? ""} placeholder="¿Qué necesito ver hoy?" className="mt-2 w-full rounded-md border border-linea bg-papel px-4 py-3" />
              <span className="mt-1 block text-xs text-suave">Si ya preguntaste esto hoy, dejá reposar la respuesta.</span>
            </label>
            {spread.cartas.length > 1 && (
              <fieldset>
                <legend className="text-sm font-semibold text-bosque">Cantidad de cartas</legend>
                <div className="mt-2 flex gap-4">
                  {spread.cartas.map((n) => (
                    <label key={n} className="flex items-center gap-2"><input type="radio" name="n" value={n} defaultChecked={n === count} />{n} {n === 1 ? "carta" : "cartas"}</label>
                  ))}
                </div>
              </fieldset>
            )}
            {spread.allowReversed && (
              <label className="flex items-center gap-3">
                <input type="checkbox" name="inv" value="1" defaultChecked className="h-5 w-5" />
                <span className="text-sm text-tinta">Leer cartas invertidas</span>
              </label>
            )}
            {spread.allowReversed && <input type="hidden" name="inv" value="0" />}
            <Button type="submit" arrow>Mezclar</Button>
          </form>
        )}
      </main>
    </div>
  );
}
```

Nota sobre el checkbox: el `hidden inv=0` va **después** del checkbox para que, marcado, `sp.inv` sea `"1"` (la primera ocurrencia gana en `searchParams` de Next) y, desmarcado, sea `"0"`. Verificar en el navegador que desmarcar apaga las invertidas; si Next entrega la última ocurrencia, invertir el orden de los dos inputs.

- [ ] **Step 5: Página `/tarot/lectura`**

```tsx
// webApp/src/app/(marketing)/tarot/lectura/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/atoms/Button";
import ReadingView from "@/components/tarot/ReadingView";
import { decodeReading, encodeReading, readingSeed } from "@/lib/tarot/codec";
import { renderReading } from "@/lib/tarot/prose";
import { sanitizeQuestion } from "@/lib/tarot/question";
import { buildReading } from "@/lib/tarot/reading";

export const metadata: Metadata = { title: "Tu lectura de tarot", robots: { index: false, follow: false } };

export default async function LecturaPage({ searchParams }: { searchParams: Promise<{ t?: string; c?: string; q?: string }> }) {
  const sp = await searchParams;
  const reading = decodeReading(sp.t ?? "", sp.c ?? "");
  if (!reading) notFound();
  const question = sanitizeQuestion(sp.q);
  const facts = buildReading(reading, question);
  const text = renderReading(facts, readingSeed(reading));
  const shareHref = `/tarot/lectura?t=${reading.spread}&c=${encodeReading(reading)}`;

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <p className="text-sm font-semibold text-miel-800">{facts.spread.nombre}</p>
        <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{question ?? "Tu lectura"}</h1>
        <div className="mt-10"><ReadingView facts={facts} text={text} /></div>
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <ButtonLink href={`/tarot/${reading.spread}`} arrow>Tirar de nuevo</ButtonLink>
          <Link href={shareHref} className="text-sm font-semibold text-miel-800 hover:underline" data-testid="compartir">Enlace para compartir (sin tu pregunta)</Link>
        </div>
      </main>
    </div>
  );
}
```

El botón "Guardar en mi panel" se agrega en Task 11, cuando exista la action.

- [ ] **Step 6: Probar a mano y verificar**

Run: `cd webApp && npm run dev`. Hacer una PPF completa con pregunta; confirmar que la URL final lleva `t`, `c` y `q`, que el enlace de compartir no lleva `q`, que `/tarot/lectura?t=cruz-celta&c=1.2` da 404, que `/tarot/carta-del-dia` no muestra el interruptor de invertidas, y que sí/no permite 1 o 3.
Luego `npx tsc --noEmit && npm run lint && npm test`.

- [ ] **Step 7: Commit**

```bash
git add webApp/src/lib/tarot/question.ts webApp/src/lib/tarot/question.test.ts webApp/src/components/tarot/Picker.tsx webApp/src/components/tarot/ReadingView.tsx "webApp/src/app/(marketing)/tarot/[tirada]" "webApp/src/app/(marketing)/tarot/lectura/page.tsx"
git commit -m "feat(tarot): tirada interactiva con abanico de 78 y lectura determinista por URL

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Migración `tarot_readings` con RLS, grants y guard

**Files:**
- Create: `webApp/supabase/migrations/20261028100000_0071_tarot_readings.sql` (si ya existe un 0071 en `main` al momento de implementar, usar el siguiente libre y ajustar el nombre en todo este plan)
- Test: `webApp/supabase/tests/tarot-readings.test.mjs`

**Interfaces:**
- Produces: tabla `public.tarot_readings` (ver spec §4), función `public.guard_tarot_readings()`.

- [ ] **Step 1: Escribir el test PGlite que falla**

```js
// webApp/supabase/tests/tarot-readings.test.mjs
// Tarot · tarot_readings: fila propia, sin UPDATE, guard de integridad de la tirada.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOutsider = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);

const PPF = JSON.stringify([{ i: 0, r: true }, { i: 45, r: false }, { i: 12, r: false }]);

const save = (db, who, { spread = 'pasado-presente-futuro', question = null, cards = PPF, reversed = true } = {}) =>
  who(db, () =>
    attempt(
      db,
      `insert into public.tarot_readings (spread_id, question, cards, reversed_enabled) values ($1, $2, $3::jsonb, $4) returning id, user_id`,
      [spread, question, cards, reversed],
    ),
  );

describe('tarot_readings', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('la alumna guarda una tirada y user_id lo fija el trigger', async () => {
    const r = await save(db, asStudent);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].user_id, ID.student);
  });

  test('no se puede mandar user_id (columna fuera del grant de INSERT)', async () => {
    const r = await asStudent(db, () =>
      attempt(db, `insert into public.tarot_readings (user_id, spread_id, cards, reversed_enabled) values ($1, 'pasado-presente-futuro', $2::jsonb, true)`, [ID.otro, PPF]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });

  test('anon no inserta ni lee', async () => {
    const ins = await save(db, asAnon);
    assert.equal(ins.ok, false);
    const read = await asAnon(db, () => attempt(db, `select * from public.tarot_readings`));
    assert.equal(read.ok, false);
  });

  test('la tirada ajena se lee como 0 filas y no se borra', async () => {
    await save(db, asOutsider);
    const read = await asStudent(db, () => attempt(db, `select id from public.tarot_readings where user_id = $1`, [ID.otro]));
    assert.equal(read.rows.length, 0);
    const del = await asStudent(db, () => attempt(db, `delete from public.tarot_readings where user_id = $1 returning id`, [ID.otro]));
    assert.equal(del.rows.length, 0);
  });

  test('no hay UPDATE', async () => {
    const r = await asStudent(db, () => attempt(db, `update public.tarot_readings set question = 'x' where user_id = $1`, [ID.student]));
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });

  test('la dueña borra la suya', async () => {
    const del = await asStudent(db, () => attempt(db, `delete from public.tarot_readings where user_id = $1 returning id`, [ID.student]));
    assert.ok(del.rows.length >= 1);
  });

  for (const [nombre, args] of [
    ['cantidad incorrecta', { cards: JSON.stringify([{ i: 1, r: false }, { i: 2, r: false }]) }],
    ['índice fuera de rango', { cards: JSON.stringify([{ i: 1, r: false }, { i: 2, r: false }, { i: 78, r: false }]) }],
    ['índice repetido', { cards: JSON.stringify([{ i: 1, r: false }, { i: 2, r: false }, { i: 1, r: false }]) }],
    ['r no booleano', { cards: JSON.stringify([{ i: 1, r: 'sí' }, { i: 2, r: false }, { i: 3, r: false }]) }],
    ['invertida con reversed_enabled=false', { reversed: false }],
    ['carta del día invertida', { spread: 'carta-del-dia', cards: JSON.stringify([{ i: 5, r: true }]) }],
    ['tirada desconocida', { spread: 'herradura', cards: JSON.stringify([{ i: 1, r: false }]) }],
    ['pregunta con salto de línea', { question: 'hola\nchau' }],
    ['pregunta de 141', { question: 'a'.repeat(141) }],
  ]) {
    test(`rechaza ${nombre}`, async () => {
      const r = await save(db, asStudent, args);
      assert.equal(r.ok, false, nombre);
    });
  }

  test('sí/no acepta 1 y 3 cartas', async () => {
    assert.equal((await save(db, asStudent, { spread: 'si-o-no', cards: JSON.stringify([{ i: 7, r: false }]) })).ok, true);
    assert.equal((await save(db, asStudent, { spread: 'si-o-no', cards: JSON.stringify([{ i: 7, r: false }, { i: 8, r: true }, { i: 9, r: false }]) })).ok, true);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd webApp/supabase && node --test tests/tarot-readings.test.mjs`
Expected: FAIL (la tabla no existe).

- [ ] **Step 3: Escribir la migración**

```sql
-- Tarot · tiradas guardadas por usuarias logueadas. Las anónimas viven en la URL y no tocan la base.
--
-- POR QUE UN GUARD: RLS decide filas y los grants columnas, pero ninguno puede decir "una cruz celta
-- tiene 10 cartas distintas de 0..77". Sin eso, una fila imposible rompe la página que la renderiza.

create table public.tarot_readings (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  spread_id        text        not null
    check (spread_id in ('carta-del-dia', 'si-o-no', 'pasado-presente-futuro', 'cruz-celta')),
  question         text
    check (question is null or (char_length(question) between 1 and 140 and question !~ '[\n\r]')),
  cards            jsonb       not null,
  reversed_enabled boolean     not null,
  created_at       timestamptz not null default now(),
  constraint tarot_readings_question_no_locator check (not public.text_has_locator(question))
);

create index tarot_readings_user_idx on public.tarot_readings (user_id, created_at desc);

alter table public.tarot_readings enable row level security;

-- Whitelist por columna (ADR-008). user_id NO está en el INSERT: lo fija el guard.
revoke all on public.tarot_readings from public, anon, authenticated;
grant select (id, user_id, spread_id, question, cards, reversed_enabled, created_at) on public.tarot_readings to authenticated;
grant insert (spread_id, question, cards, reversed_enabled) on public.tarot_readings to authenticated;
grant delete on public.tarot_readings to authenticated;

create policy tarot_readings_read_own on public.tarot_readings
  for select to authenticated using (user_id = (select auth.uid()));

create policy tarot_readings_insert_own on public.tarot_readings
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy tarot_readings_delete_own on public.tarot_readings
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.guard_tarot_readings()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  expected int[];
  n int;
  elem jsonb;
  idx int;
  seen int[] := '{}';
begin
  new.user_id := (select auth.uid());
  if new.user_id is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;

  expected := case new.spread_id
    when 'carta-del-dia' then array[1]
    when 'si-o-no' then array[1, 3]
    when 'pasado-presente-futuro' then array[3]
    when 'cruz-celta' then array[10]
  end;

  if jsonb_typeof(new.cards) <> 'array' then
    raise exception 'cards debe ser un array' using errcode = '23514';
  end if;
  n := jsonb_array_length(new.cards);
  if not (n = any (expected)) then
    raise exception 'cantidad de cartas inválida para %', new.spread_id using errcode = '23514';
  end if;

  for elem in select * from jsonb_array_elements(new.cards) loop
    if jsonb_typeof(elem -> 'i') <> 'number' or jsonb_typeof(elem -> 'r') <> 'boolean' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    idx := (elem ->> 'i')::int;
    if idx < 0 or idx > 77 or (elem ->> 'i') <> idx::text then
      raise exception 'índice de carta fuera de rango' using errcode = '23514';
    end if;
    if idx = any (seen) then
      raise exception 'carta repetida' using errcode = '23514';
    end if;
    seen := seen || idx;
    if (elem ->> 'r')::boolean and (not new.reversed_enabled or new.spread_id = 'carta-del-dia') then
      raise exception 'invertida no admitida' using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

create trigger tarot_readings_guard
  before insert on public.tarot_readings
  for each row execute function public.guard_tarot_readings();
```

Si `public.text_has_locator` exige un argumento no nulo o no existe con esa firma, mirar `0012_locator_ascii_classes.sql` y usar `coalesce(question, '')`.

- [ ] **Step 4: Correr el test de la tabla y toda la suite de schema**

Run: `cd webApp/supabase && node --test tests/tarot-readings.test.mjs && npm test`
Expected: PASS. Si `locator-parity`/`locator-columns` fallan porque la columna `question` no está clasificada, seguir lo que diga el test (hay una lista de columnas de texto libre que hay que declarar como "texto libre con CHECK de forma"); clasificarla ahí.

- [ ] **Step 5: Aplicar en la base local**

Run: `cd webApp && npx supabase migration up` (o `npx supabase db reset` si el PO ya lo autorizó; el estado del engram dice que las migraciones se aplicaron a mano). Verificar: `psql` o el `psql()` del e2e con `select count(*) from public.tarot_readings`.

- [ ] **Step 6: Commit**

```bash
git add webApp/supabase/migrations/20261028100000_0071_tarot_readings.sql webApp/supabase/tests/tarot-readings.test.mjs
git commit -m "feat(tarot): tabla tarot_readings con RLS de dueña, grants por columna y guard de integridad

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Guardar y listar tiradas: actions, lectura guardada y panel

**Files:**
- Create: `webApp/src/lib/server/tarot.ts`
- Create: `webApp/src/app/(marketing)/tarot/actions.ts` + `actions.test.ts`
- Create: `webApp/src/components/tarot/SaveReadingButton.tsx`
- Create: `webApp/src/app/(marketing)/tarot/lectura/[id]/page.tsx`
- Create: `webApp/src/app/(app)/panel/tarot/page.tsx`
- Modify: `webApp/src/lib/rate-limit/limits.ts` (dos entradas)
- Modify: `webApp/src/app/(marketing)/tarot/lectura/page.tsx` (botón guardar)
- Modify: `webApp/src/app/(app)/panel/page.tsx:88` (enlace "Mis tiradas")

**Interfaces:**
- Consumes: `decodeReading`, `Reading` (Task 3); `buildReading`, `renderReading`, `readingSeed`; `sanitizeQuestion`; `ReadingView`; `withRateLimit`, `limitedState`, `ActionState`.
- Produces: `saveTarotReadingAction(_prev: ActionState, formData: FormData): Promise<ActionState & { id?: string }>` (campos `t`, `c`, `q`, `inv`), `deleteTarotReadingAction(_prev: ActionState, formData: FormData): Promise<ActionState>` (campo `id`), `getSavedReading(id: string): Promise<SavedReading | null>`, `listSavedReadings(): Promise<SavedReading[]>`, `type SavedReading = { id: string; reading: Reading; question: string | null; createdAt: string }`.

- [ ] **Step 1: Registrar los límites** en `limits.ts`, dentro de `RATE_LIMITS`:

```ts
  // Tarot: guardar tiradas desde la lectura pública.
  saveTarotReadingAction: { max: 10, windowSeconds: 3600 },
  deleteTarotReadingAction: { max: 30, windowSeconds: 600 },
```

- [ ] **Step 2: Test de las actions que falla**

```ts
// webApp/src/app/(marketing)/tarot/actions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { deleteTarotReadingAction, saveTarotReadingAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const INITIAL = { error: null, success: null };
const UID = "20000000-0000-4000-8000-00000000000a";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function client({ user = { id: UID } as { id: string } | null, insertError = null as { code: string } | null } = {}) {
  const insert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: insertError ? null : { id: "r-1" }, error: insertError }) }) });
  const del = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ insert, delete: del }) });
  return { insert, del };
}

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
  createClient.mockReset();
});

describe("saveTarotReadingAction", () => {
  it("rechaza una codificación inválida sin tocar Supabase", async () => {
    client();
    const r = await saveTarotReadingAction(INITIAL, form({ t: "cruz-celta", c: "1.2", inv: "1" }));
    expect(r.error).toMatch(/tirada/i);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve error de sesión", async () => {
    client({ user: null });
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", inv: "1" }));
    expect(r.error).toMatch(/sesión/);
  });

  it("inserta con la forma {i, r}, sin user_id, y devuelve el id", async () => {
    const { insert } = client();
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", q: "  ¿Vuelve?\n ", inv: "1" }));
    expect(r.error).toBeNull();
    expect(r.id).toBe("r-1");
    expect(insert).toHaveBeenCalledWith({ spread_id: "pasado-presente-futuro", question: "¿Vuelve?", cards: [{ i: 0, r: true }, { i: 45, r: false }, { i: 12, r: false }], reversed_enabled: true });
    expect(JSON.stringify(insert.mock.calls[0])).not.toContain("user_id");
  });

  it("si hay invertidas pero inv=0, rechaza antes de la base", async () => {
    client();
    const r = await saveTarotReadingAction(INITIAL, form({ t: "pasado-presente-futuro", c: "0r.45.12", inv: "0" }));
    expect(r.error).toMatch(/invertid/i);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("deleteTarotReadingAction", () => {
  it("borra por id con el cliente de sesión", async () => {
    const { del } = client();
    const r = await deleteTarotReadingAction(INITIAL, form({ id: "11111111-1111-4111-8111-111111111111" }));
    expect(r.error).toBeNull();
    expect(del).toHaveBeenCalled();
  });

  it("rechaza un id que no es uuid", async () => {
    client();
    const r = await deleteTarotReadingAction(INITIAL, form({ id: "x" }));
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
});
```

Run: `cd webApp && npx vitest run "src/app/(marketing)/tarot/actions.test.ts"` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `actions.ts` y `lib/server/tarot.ts`**

```ts
// webApp/src/app/(marketing)/tarot/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { decodeReading } from "@/lib/tarot/codec";
import { sanitizeQuestion } from "@/lib/tarot/question";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

const SESSION_EXPIRED: ActionState = { error: "Tu sesión venció. Volvé a entrar.", success: null };

export const saveTarotReadingAction = withRateLimit(
  "saveTarotReadingAction",
  async function saveTarotReadingAction(_prev: ActionState, formData: FormData): Promise<ActionState & { id?: string }> {
    const reading = decodeReading(String(formData.get("t") ?? ""), String(formData.get("c") ?? ""));
    if (!reading) return { error: "La tirada no es válida.", success: null };
    const reversedEnabled = String(formData.get("inv") ?? "1") !== "0";
    if (!reversedEnabled && reading.cards.some((c) => c.reversed)) {
      return { error: "La tirada tiene cartas invertidas pero las invertidas estaban apagadas.", success: null };
    }
    const question = sanitizeQuestion(String(formData.get("q") ?? ""));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;

    const { data, error } = await supabase
      .from("tarot_readings")
      .insert({ spread_id: reading.spread, question, cards: reading.cards.map((c) => ({ i: c.indice, r: c.reversed })), reversed_enabled: reversedEnabled })
      .select("id")
      .single();
    if (error || !data) return { error: "No se pudo guardar la tirada.", success: null };

    revalidatePath("/panel/tarot");
    return { error: null, success: "Tirada guardada.", id: data.id };
  },
  limitedState,
);

export const deleteTarotReadingAction = withRateLimit(
  "deleteTarotReadingAction",
  async function deleteTarotReadingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const id = z.string().uuid().safeParse(formData.get("id"));
    if (!id.success) return { error: "Tirada inválida.", success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;
    const { error } = await supabase.from("tarot_readings").delete().eq("id", id.data);
    if (error) return { error: "No se pudo borrar la tirada.", success: null };
    revalidatePath("/panel/tarot");
    return { error: null, success: "Tirada borrada." };
  },
  limitedState,
);
```

```ts
// webApp/src/lib/server/tarot.ts
import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Reading } from "@/lib/tarot/codec";
import { isSpreadSlug } from "@/lib/tarot/spreads";

export type SavedReading = { id: string; reading: Reading; question: string | null; createdAt: string };

const rowSchema = z.object({
  id: z.string(),
  spread_id: z.string(),
  question: z.string().nullable(),
  cards: z.array(z.object({ i: z.number().int(), r: z.boolean() })),
  created_at: z.string(),
});

function toSaved(row: unknown): SavedReading | null {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success || !isSpreadSlug(parsed.data.spread_id)) return null;
  const d = parsed.data;
  return { id: d.id, question: d.question, createdAt: d.created_at, reading: { spread: d.spread_id, cards: d.cards.map((c) => ({ indice: c.i, reversed: c.r })) } };
}

const COLUMNS = "id, spread_id, question, cards, created_at";

/** RLS ya filtra por dueña: una tirada ajena simplemente no vuelve. */
export async function getSavedReading(id: string): Promise<SavedReading | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("tarot_readings").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toSaved(data) : null;
}

export async function listSavedReadings(): Promise<SavedReading[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tarot_readings").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
  return (data ?? []).map(toSaved).filter((r): r is SavedReading => r !== null);
}
```

Run: `cd webApp && npx vitest run "src/app/(marketing)/tarot/actions.test.ts" src/lib/rate-limit` → PASS (incluido el guard de cobertura).

- [ ] **Step 4: Botón de guardar y página de lectura guardada**

```tsx
// webApp/src/components/tarot/SaveReadingButton.tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { saveTarotReadingAction } from "@/app/(marketing)/tarot/actions";

export default function SaveReadingButton({ t, c, q, inv }: { t: string; c: string; q: string | null; inv: boolean }) {
  const [state, action, pending] = useActionState(saveTarotReadingAction, ACTION_INITIAL_STATE);
  if (state.id) {
    return <Link href={`/tarot/lectura/${state.id}`} className="text-sm font-semibold text-exito hover:underline">Guardada. Verla en mi panel</Link>;
  }
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="t" value={t} />
      <input type="hidden" name="c" value={c} />
      {q && <input type="hidden" name="q" value={q} />}
      <input type="hidden" name="inv" value={inv ? "1" : "0"} />
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Guardando…" : "Guardar en mi panel"}</Button>
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
    </form>
  );
}
```

En `/tarot/lectura/page.tsx` (Task 9), leer la sesión con `createClient()` de `@/lib/supabase/server` y `auth.getUser()`; si hay usuaria, renderizar `<SaveReadingButton t={reading.spread} c={encodeReading(reading)} q={question} inv={reading.cards.some(c => c.reversed) || sp.inv !== "0"} />`; si no, `<ButtonLink href={`/entrar?next=${encodeURIComponent(currentPath)}`} variant="ghost">Creá tu cuenta para guardar tus tiradas</ButtonLink>`. La página pasa a ser dinámica (ya lo era por `searchParams`).

```tsx
// webApp/src/app/(marketing)/tarot/lectura/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReadingView from "@/components/tarot/ReadingView";
import { getSavedReading } from "@/lib/server/tarot";
import { readingSeed } from "@/lib/tarot/codec";
import { renderReading } from "@/lib/tarot/prose";
import { buildReading } from "@/lib/tarot/reading";

export const metadata: Metadata = { title: "Tirada guardada", robots: { index: false, follow: false } };

export default async function LecturaGuardadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getSavedReading(id);
  if (!saved) notFound();
  const facts = buildReading(saved.reading, saved.question);
  const text = renderReading(facts, readingSeed(saved.reading));
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <p className="text-sm font-semibold text-miel-800">{facts.spread.nombre} · {new Date(saved.createdAt).toLocaleDateString("es-AR")}</p>
        <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{saved.question ?? "Tu lectura"}</h1>
        <div className="mt-10"><ReadingView facts={facts} text={text} /></div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: `/panel/tarot` y el enlace en el panel**

```tsx
// webApp/src/app/(app)/panel/tarot/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import SiteHeader from "@/components/layout/SiteHeader";
import AppPageHeader from "@/components/layout/AppPageHeader";
import DeleteReadingButton from "@/components/tarot/DeleteReadingButton";
import TarotCard from "@/components/tarot/TarotCard";
import { listSavedReadings } from "@/lib/server/tarot";
import { cardByIndex } from "@/lib/tarot/cards";
import { spreadBySlug } from "@/lib/tarot/spreads";

export const metadata: Metadata = { title: "Mis tiradas", robots: { index: false, follow: false } };

export default async function PanelTarotPage() {
  const readings = await listSavedReadings();
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader eyebrow="Tarot" title="Mis tiradas" subtitle="Las lecturas que guardaste, de la más nueva a la más vieja." />
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        {readings.length === 0 ? (
          <div className="tarjeta flex flex-col items-start gap-4 p-8">
            <p className="max-w-[46ch]">Todavía no guardaste ninguna tirada. Tirá las cartas y, al final de la lectura, tocá «Guardar en mi panel».</p>
            <ButtonLink href="/tarot" arrow>Tirar las cartas</ButtonLink>
          </div>
        ) : (
          <ul className="space-y-4">
            {readings.map((r) => (
              <li key={r.id} className="tarjeta flex flex-wrap items-center gap-4 p-5">
                <div className="flex gap-1">
                  {r.reading.cards.slice(0, 3).map((c) => <TarotCard key={c.indice} card={cardByIndex(c.indice)!} reversed={c.reversed} size="sm" className="w-10" />)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-suave">{spreadBySlug(r.reading.spread)?.nombre} · {new Date(r.createdAt).toLocaleDateString("es-AR")}</p>
                  <Link href={`/tarot/lectura/${r.id}`} className="font-semibold text-bosque hover:underline">{r.question ?? "Sin pregunta"}</Link>
                </div>
                <DeleteReadingButton id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
```

```tsx
// webApp/src/components/tarot/DeleteReadingButton.tsx
"use client";

import { useActionState } from "react";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { deleteTarotReadingAction } from "@/app/(marketing)/tarot/actions";

export default function DeleteReadingButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteTarotReadingAction, ACTION_INITIAL_STATE);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label="Borrar tirada">Borrar</Button>
      {state.error && <p role="alert" className="text-xs text-error">{state.error}</p>}
    </form>
  );
}
```

En `webApp/src/app/(app)/panel/page.tsx`, junto al botón "Mis notas" (línea 88), agregar:

```tsx
          <ButtonLink href="/panel/tarot" variant="outline" size="sm">
            Mis tiradas
          </ButtonLink>
```

Agregar `DeleteReadingButton.tsx` a la lista de archivos de esta tarea.

- [ ] **Step 6: Verificar**

Run: `cd webApp && npx tsc --noEmit && npm run lint && npm test`. Luego en el navegador, logueada como `alumna@test.local`: tirar, guardar, ver en `/panel/tarot`, abrir `/tarot/lectura/<id>`, borrar. Con otra cuenta, abrir ese mismo `/tarot/lectura/<id>` → 404.

- [ ] **Step 7: Commit**

```bash
git add webApp/src/lib/rate-limit/limits.ts webApp/src/lib/server/tarot.ts "webApp/src/app/(marketing)/tarot/actions.ts" "webApp/src/app/(marketing)/tarot/actions.test.ts" "webApp/src/app/(marketing)/tarot/lectura" webApp/src/components/tarot/SaveReadingButton.tsx webApp/src/components/tarot/DeleteReadingButton.tsx "webApp/src/app/(app)/panel/tarot" "webApp/src/app/(app)/panel/page.tsx"
git commit -m "feat(tarot): guardar, listar y borrar tiradas de la usuaria con rate limit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: E2E, ADR-016, CLAUDE.md y engram

**Files:**
- Create: `webApp/e2e/tarot.spec.ts`
- Modify: `engram/02_architecture.md` (ADR-016), `engram/_state.md`, `engram/03_backlog.md`
- Modify: `CLAUDE.md` (sección "Routes that exist" + una línea en "Design language" sobre las cartas)

- [ ] **Step 1: E2E**

```ts
// webApp/e2e/tarot.spec.ts
import { expect, test, ALUMNA, assertStackUp, login } from "./fixtures";
import { psql } from "./db";

const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const limpiar = () => psql(`delete from public.tarot_readings where user_id = '${ALUMNA_ID}';`);

test.describe.configure({ mode: "serial" });
test.beforeAll(limpiar);
test.afterAll(limpiar);

test("anónima: PPF de punta a punta, la URL lleva la tirada y el enlace de compartir no lleva la pregunta", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot/pasado-presente-futuro");
  await page.getByLabel("Tu pregunta (opcional)").fill("¿Qué viene?");
  await page.getByRole("button", { name: "Mezclar" }).click();
  await expect(page.getByText("Elegí la carta para: Pasado")).toBeVisible();
  for (const n of [3, 17, 60]) await page.getByRole("button", { name: `Carta ${n} del mazo` }).click();
  await expect(page).toHaveURL(/\/tarot\/lectura\?t=pasado-presente-futuro&c=\d+r?\.\d+r?\.\d+r?&q=/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Qué viene?");
  const share = await page.getByTestId("compartir").getAttribute("href");
  expect(share).not.toContain("q=");
  await expect(page.getByRole("heading", { name: "Síntesis" })).toBeVisible();
});

test("una codificación inválida es 404", async ({ page }) => {
  const res = await page.goto("/tarot/lectura?t=cruz-celta&c=1.2");
  expect(res?.status()).toBe(404);
});

test("la ficha de una carta tiene su título y JSON-LD", async ({ page }) => {
  await page.goto("/tarot/cartas/la-luna");
  await expect(page).toHaveTitle(/La Luna/);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain('"Article"');
  await expect(page.getByRole("img", { name: "La Luna" })).toBeVisible();
});

test("alumna: guarda la tirada, la ve en el panel y la borra", async ({ page }) => {
  await login(page, ALUMNA);
  await page.goto("/tarot/lectura?t=pasado-presente-futuro&c=0r.45.12&q=Hola");
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: /Guardada/ })).toBeVisible();
  await expect.poll(() => psql(`select count(*) from public.tarot_readings where user_id = '${ALUMNA_ID}';`)).toBe("1");
  await page.goto("/panel/tarot");
  await expect(page.getByRole("link", { name: "Hola" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar tirada" }).click();
  await expect.poll(() => psql(`select count(*) from public.tarot_readings where user_id = '${ALUMNA_ID}';`)).toBe("0");
});
```

Run: `cd webApp && npx playwright test e2e/tarot.spec.ts` → PASS. Luego la suite entera: `npm run test:e2e`.

- [ ] **Step 2: ADR-016 en `engram/02_architecture.md`** (mismo formato que ADR-015)

```markdown
### ADR-016 · Tarot online: motor por reglas, lectura en la URL, historial solo logueadas — ACEPTADO (PO 2026-10-27)
**Contexto.** El PO pidió un tarot online al estilo losarcanos.com como puerta de entrada pública. La investigación
(`docs/superpowers/research/tarot/`) mostró que losarcanos tira solo con 22 mayores y concatena textos; que la IA en el
navegador no es viable para el público (Android gama media, iOS); y que los SVG del Rider en Commons pesan 3,5 MB por carta.
**Decisión.** (1) Motor puro en `src/lib/tarot/` con dataset propio de 78 cartas, reglas (dignidades, proporciones,
combos, quintaesencia, sí/no) y prosa por plantillas con semilla; sin IA. (2) La tirada anónima vive en la query string
(`t`, `c`, `q`); la página de lectura es determinista y no escribe. (3) `tarot_readings` solo para logueadas, RLS de
dueña, sin UPDATE, guard de integridad, grants por columna; `user_id` lo fija el trigger. (4) Cartas: escaneos de dominio
público del Rider 1909 en WebP por `next/image`, bajo ADR-015. (5) Invertidas 1/3 con interruptor, escuela "bloqueada".
**Consecuencias.** Cero costo por tirada. Toda regla nueva se prueba en Vitest sin base. Mejoras futuras (IA en servidor
con Haiku, Prompt API de Chrome, otras 11 tiradas, otras barajas) se agregan sin tocar el contrato de la URL.
```

- [ ] **Step 3: CLAUDE.md** — en "Routes that exist" agregar:

```
/tarot                      Tarot online (portada, 4 tiradas)
/tarot/[tirada]             Tirada interactiva
/tarot/lectura              Lectura por query string (noindex)
/tarot/lectura/[id]         Tirada guardada                    [auth]
/tarot/cartas · /tarot/cartas/[slug]   Las 78 fichas
/panel/tarot                Mis tiradas                        [auth]
```

y en el párrafo de raster de "Design language": "Las 78 cartas del tarot (`public/tarot/rws/*.webp`, dominio público, ver `CREDITS.md`) son la segunda fuente de raster permitida, también por `next/image`." En la tabla "Actual implementation state", sumar la tabla 23 y el motor `src/lib/tarot/`.

- [ ] **Step 4: Engram** — en `_state.md` agregar el bloque "Tarot online · spec 2026-10-27 · ADR-016 · rama `feature/tarot-online`" con los verificadores en verde y los números; en `03_backlog.md` anotar como deuda/futuro: las 11 tiradas restantes, IA opcional (Prompt API / Haiku), revisión de textos por la dueña o una docente de tarot, páginas de combinaciones, carta del día por fecha de nacimiento.

- [ ] **Step 5: Correr todos los verificadores**

```bash
cd webApp && npm test && npx tsc --noEmit && npm run lint && npm run test:e2e
cd webApp/supabase && npm test
bash webApp/scripts/check-seo.sh http://localhost:3000
```

Expected: todo verde.

- [ ] **Step 6: Commit y PR**

```bash
git add webApp/e2e/tarot.spec.ts engram CLAUDE.md
git commit -m "test(tarot): e2e de tirada, ficha y guardado; ADR-016 y documentación

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin feature/tarot-online
gh pr create --draft --title "Tarot online Rider-Waite (ADR-016)" --body "$(cat <<'EOF2'
Tarot online público: 78 cartas, 4 tiradas, lectura por reglas y plantillas, fichas SEO, guardado para logueadas.
Spec: docs/superpowers/specs/2026-10-27-tarot-online-design.md · Plan: docs/superpowers/plans/2026-10-27-tarot-online.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF2
)"
```

(`engram/` está gitignored: los cambios de engram no entran al commit, pero se hacen igual.)

---

## Autorrevisión del plan

- **Cobertura de la spec.** §1 rutas → Tasks 8, 9, 11. §2 motor → Tasks 1-6 y `question.ts` en 9. §3 datos e imágenes → Tasks 1, 2, 7. §4 persistencia → Tasks 10, 11. §5 SEO → Task 8. §6 pruebas → cada task tiene las suyas; PGlite en 10; e2e en 12. §7 verificadores → Task 12. Riesgo de imágenes → Task 7 paso 3. ADR-016 → Task 12.
- **Marcadores.** Ninguno. El único "verificar al implementar" es el número de migración (0071) y el nombre de la serie de Commons, ambos con instrucción concreta.
- **Consistencia de nombres.** `cardByIndex`, `cardBySlug`, `baseElement`, `CARDS` (T1); `spreadBySlug`, `positionsFor`, `isSpreadSlug`, `SPREADS` (T2); `shuffleDeck`, `drawReversed`, `cryptoRng`, `encodeReading`, `decodeReading`, `readingSeed`, `DrawnCard`, `Reading` (T3); `dignityBetween`, `yesNoVerdict`, `cardVerdict` (T4); `buildReading`, `classifyDomain`, `ReadingFacts`, `PlacedCard`, `Link` (T5); `renderReading`, `ReadingText` (T6); `TarotCard`, `cardImageSrc`, `CardBack`, `SpreadLayout` (T7); `EthicsNote` (T8); `sanitizeQuestion`, `MAX_QUESTION`, `Picker`, `ReadingView` (T9); `guard_tarot_readings` (T10); `saveTarotReadingAction`, `deleteTarotReadingAction`, `getSavedReading`, `listSavedReadings`, `SaveReadingButton`, `DeleteReadingButton` (T11). Usados con el mismo nombre en todas las tareas.

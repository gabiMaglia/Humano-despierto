# Tarot online Rider-Waite-Smith — spec de diseño

**Fecha:** 2026-10-27 · **Rama:** `feature/tarot-online` (desde `main` b7e6631, con Brote mergeado) ·
**ADR:** ADR-016 (a escribir en el primer ticket) · **Investigación:** `docs/superpowers/research/tarot/`

## Por qué

El PO quiere sumar un tarot online al sitio, al estilo de losarcanos.com, como **puerta de entrada
pública**: gratis, sin login, indexable, que invite al campus. La investigación mostró que losarcanos
tira solo con los 22 arcanos mayores, con 1/3 de invertidas, y que su "lectura" es texto por carta
y posición concatenado, sin relación entre cartas. La vara es superarlo: 78 cartas, lectura con hilo
entre posiciones, y fichas por carta con contenido propio.

## Decisiones del PO (2026-10-27, no se re-litigan)

1. **Rol:** puerta de entrada pública. Ruta `/tarot` sin login. Guardado solo para logueadas.
2. **Motor:** dataset + reglas + plantillas, **sin IA**. Se investigó IA en el navegador y no es
   viable para el público (Android de gama media, iOS limita memoria; la Prompt API de Chrome solo
   existe en escritorio). Queda como mejora progresiva de una fase posterior, no de esta.
3. **Cartas:** escaneos de dominio público del Rider de 1909 (Pamela Colman Smith) en WebP, por
   `next/image`. Brote (ADR-015) ya permite raster. Los 78 SVG de Commons se descartaron por peso
   (3,5 MB por carta, auto-trazados).
4. **Tiradas del MVP:** carta del día (1), sí/no (1 o 3), pasado-presente-futuro (3), cruz celta (10).
5. **Invertidas:** sí, probabilidad 1/3, con interruptor para la persona, default activado; apagadas
   fijas en carta del día. Escuela por defecto "bloqueada/interna" (no fatalista).
6. **Historial:** solo logueadas, tabla `tarot_readings` con RLS. Anónimas comparten por URL.
7. **Baraja:** solo Rider-Waite-Smith en esta fase. Orden RWS: VIII Fuerza, XI Justicia.

## Alcance

**Entra:** rutas públicas de tarot, motor de lectura, 78 fichas con SEO, 4 tiradas, guardado y
listado para logueadas, pipeline de imágenes, migración, tests.

**No entra (fases posteriores, ya investigadas):** las otras 11 tiradas de `tiradas.json`, IA
(Prompt API de Chrome o Haiku en servidor), otras barajas, carta del día por fecha de nacimiento,
"arcano de vida", páginas de combinaciones de pares, integración con lecciones de los cursos de tarot.

## 1. Rutas y flujo

Todas en el grupo `(marketing)` salvo el panel. Server Components por defecto.

| Ruta | Qué hace | Auth |
|---|---|---|
| `/tarot` | Portada: las 4 tiradas con descripción y cantidad de cartas; encuadre breve (qué es el tarot, cómo leerlo como espejo, aviso de no sustitución); enlace a las fichas. | no |
| `/tarot/[tirada]` | La tirada (`carta-del-dia`, `si-o-no`, `pasado-presente-futuro`, `cruz-celta`). 404 si el slug no existe. | no |
| `/tarot/lectura` | Resultado de una tirada codificada en la query string. Valida y renderiza; 404 si la codificación es inválida. | no |
| `/tarot/lectura/[id]` | Una tirada guardada. Solo su dueña (RLS); 404 para cualquier otra persona. | sí |
| `/tarot/cartas` | Índice de las 78 cartas por arcano y palo. | no |
| `/tarot/cartas/[slug]` | Ficha de una carta. `generateStaticParams` con los 78 slugs. | no |
| `/panel/tarot` | Lista de tiradas guardadas de la usuaria, con borrar. Entrada en la navegación del panel. | sí |

### Flujo de una tirada (`/tarot/[tirada]`)

1. **Preparación** (Server Component con un formulario cliente): pregunta opcional (máx. 140
   caracteres, sin saltos de línea), interruptor "leer cartas invertidas" (default activado; oculto
   y apagado en carta del día), y un texto corto: "si ya preguntaste esto hoy, dejá reposar la
   respuesta". Botón "Mezclar".
2. **Elección** (`'use client'`): el componente mezcla las 78 cartas con `crypto.getRandomValues`
   (sin reemplazo) y decide invertida por carta con probabilidad 1/3 si está activo. Muestra un abanico
   de dorsos; la posición a cubrir se anuncia ("Elegí la carta para: Pasado"). Cada toque da vuelta la
   carta y la ubica en el layout de la tirada. En sí/no, un selector previo elige 1 o 3 cartas.
3. **Lectura**: al completar, `router.push` a `/tarot/lectura?t=<tirada>&c=<codigo>&q=<pregunta>`.
   La pregunta viaja solo si la persona la escribió, y la página la muestra como encabezado; **no**
   se incluye en el enlace "Compartir" (se arma sin `q`).
4. **Guardar**: si hay sesión, la página de lectura muestra "Guardar en mi panel" (Server Action).
   Si no, muestra "Creá tu cuenta para guardar tus tiradas" apuntando a `/entrar`.

### Codificación de la URL (`codec.ts`)

`t` = slug de tirada. `c` = ids numéricos de carta (0..77, orden canónico del dataset) separados por
`.`, con sufijo `r` si está invertida: `c=0r.45.12`. Para sí/no, la cantidad (1 o 3) sale del largo.
Validación: tirada existente, cantidad exacta, ids en rango, sin repetidos, `r` solo si la tirada
admite invertidas. Cualquier fallo → `notFound()`. La página de lectura es determinista: misma URL,
mismo texto.

## 2. Motor de lectura — `webApp/src/lib/tarot/`

Librería pura: sin `server-only`, sin Supabase, sin React. Todo testeable en Vitest.

| Módulo | Responsabilidad |
|---|---|
| `data/cards.json` | Los 78 (copiado de `research/tarot/rider-waite-78.json`). Textos propios; `waite_divinatory` es dominio público. |
| `data/spreads.json` | Las 4 tiradas del MVP con posiciones y layout (subconjunto de `research/tarot/tiradas.json`). |
| `cards.ts` | Carga y valida con zod al importar; exporta `CARDS`, `cardById`, `cardBySlug`, tipos `Card`, `Suit`, `Arcana`. |
| `spreads.ts` | `SPREADS`, `spreadBySlug`, tipos `Spread`, `Position` (`n`, `nombre`, `significado`, `x`, `y`, `rotada`). |
| `draw.ts` | `shuffle(rng)` sin reemplazo y `drawReversed(rng, enabled)` con p = 1/3. Recibe el `rng` para que los tests sean deterministas. |
| `codec.ts` | `encodeReading` / `decodeReading` (ver arriba). Simétricos. |
| `reading.ts` | `buildReading(spread, drawn, question?) → ReadingFacts`. Reglas, sin prosa. |
| `prose.ts` | `renderReading(facts, seed) → ReadingText`. Plantillas con variantes. |
| `yes-no.ts` | Veredicto sí/no para 1 o 3 cartas. |

### `ReadingFacts` (lo que calcula `reading.ts`)

- **Por posición:** carta, invertida, significado base (derecha o invertida), palabras clave,
  y el texto de dominio si la pregunta se clasifica en amor / trabajo / dinero / salud por palabras
  clave simples (si no se clasifica, no hay dominio).
- **Hilo:** para cada par de posiciones consecutivas en el orden narrativo de la tirada, un conector
  causal según sean armónicas o tensas (ver dignidades). En PPF: pasado → presente → futuro. En cruz
  celta: el orden de Waite (1-2 núcleo, 3 base, 4 pasado, 5 posible, 6 futuro próximo, 7-10 columna).
- **Dignidades elementales** (Golden Dawn): fuego/aire y agua/tierra se refuerzan; fuego/agua y
  aire/tierra se debilitan; mismo elemento se intensifica. Se calcula entre vecinas del hilo y se
  expresa como `refuerza` / `debilita` / `intensifica` / `neutral`.
- **Proporciones:** cantidad de mayores (≥ 50 % = "fuerzas grandes"), palo dominante (≥ 50 % de los
  menores) y palo ausente, cantidad de cortes (≥ 2 = "hay personas involucradas"), proporción de
  invertidas (≥ 50 % = "bloqueos"), números repetidos (≥ 2 pips con el mismo número).
- **Combinaciones conocidas:** del catálogo de 41 pares de la investigación, las que estén presentes
  en la tirada (sin importar posición), máximo 2 por lectura.
- **Quintaesencia** (solo cruz celta): suma de los números de los mayores reducida a 1..22, y la carta
  mayor resultante como "carta de síntesis".
- **Sí/no:** por carta, `si_no` del dataset; invertida cambia "sí" a "depende" y "depende" a "no".
  Con 3 cartas, mayoría; la del centro desempata.

### `prose.ts`

Devuelve `{ apertura, panorama?, posiciones: [{ titulo, texto }], hilo, sintesis, consejo }`.
Cada bloque elige entre 3 o más variantes de plantilla con una semilla derivada de la codificación
de la tirada (misma URL → mismo texto). Reglas de estilo: rioplatense, cálido, sin fatalismo, sin
emojis, sin "la carta dice que", nunca inventa cartas que no están en la tirada. La invertida se
redacta como bloqueo o proceso interno, no como "mala suerte".

## 3. Datos e imágenes

- `cards.json` conserva los campos de la investigación: `id`, `numero`, `nombre_es`, `nombre_en`,
  `arcano`, `palo`, `elemento`, `astrologia`, `letra_hebrea`, `numerologia`, palabras clave,
  significados, dominios, `consejo`, `si_no`, `descripcion_imagen`, `waite_divinatory`.
  Se agrega `indice` (0..77) para el codec.
- **Imágenes:** `webApp/scripts/tarot-images.mjs` (se corre a mano una vez, no en CI) baja los 78
  escaneos de dominio público desde Wikimedia Commons, recorta márgenes, redimensiona a 600 px de alto
  y escribe `webApp/public/tarot/rws/<slug>.webp` con `sharp` (dependencia de desarrollo). Elige la
  serie entre "Roses and Lilies" y "Geldard" con una prueba de 5 cartas antes de bajar las 78.
  Deja `public/tarot/rws/CREDITS.md` con fuente, serie y licencia (PD, Smith † 1951). Presupuesto:
  ≤ 60 KB por carta, ≤ 4 MB en total. Las imágenes se commitean.
- **Dorso:** un SVG inline propio con tokens de Brote (`bosque`, `miel`, `salvia`).
- `alt` de cada carta: `nombre_es`. La invertida se muestra con `rotate-180` en CSS.

## 4. Persistencia y seguridad

**Migración `<timestamp>_0071_tarot_readings.sql`** (verificar el número libre al implementar):

```
tarot_readings
  id               uuid pk default gen_random_uuid()
  user_id          uuid not null references profiles(id) on delete cascade
  spread_id        text not null check (spread_id in ('carta-del-dia','si-o-no','pasado-presente-futuro','cruz-celta'))
  question         text null check (char_length(question) <= 140 and question !~ '[\n\r]')
  cards            jsonb not null   -- [{"i": 0..77, "r": bool}] en orden de posición
  reversed_enabled boolean not null
  created_at       timestamptz not null default now()
```

- RLS: `select`, `insert`, `delete` solo donde `user_id = auth.uid()`; **sin `update`**. `user_id`
  lo fija un trigger `BEFORE INSERT` desde `auth.uid()` (el cliente no lo manda). Rol leído de
  `profiles`, no del JWT (regla 3 de CLAUDE.md), aunque acá no hay distinción de rol.
- Grants: `REVOKE ALL` y `GRANT` por columna como whitelist (ADR-008): insert de `spread_id`,
  `question`, `cards`, `reversed_enabled`; select de todas; delete.
- Trigger de integridad `BEFORE INSERT`: cantidad de elementos de `cards` igual a la de la tirada
  (1 o 3 para sí/no, 1, 3, 10), cada `i` entero en 0..77, sin repetidos, `r` booleano, y `r = false`
  en todas si `reversed_enabled = false`. La base no acepta una tirada imposible.
- Sin localizadores ni contenido pago: no aplica ADR-003/009. Sí aplica ADR-009 al texto libre
  `question` solo si el barrido de localizadores lo exige; se revisa en el ticket.
- **Server Actions** (`src/app/(marketing)/tarot/actions.ts`): `saveTarotReadingAction` (valida con
  zod la misma codificación que el codec y hace el insert con el cliente de sesión) y
  `deleteTarotReadingAction`. Ambas en `RATE_LIMITS`: guardar 10/hora, borrar 30/10 min. Ninguna
  usa `service_role`.
- `/tarot/lectura` no escribe nada. No hay fila para anónimas. La pregunta nunca va al enlace
  compartido.
- Encuadre ético visible en `/tarot` y al pie de cada lectura: entretenimiento y reflexión; no
  sustituye consejo médico, legal, psicológico ni financiero.

## 5. SEO

- Fichas con `generateMetadata` (título "El Loco · significado en el tarot", descripción desde
  palabras clave) y JSON-LD `Article`. Índice `/tarot/cartas` con enlaces a las 78.
- `sitemap.ts` suma `/tarot`, las 4 tiradas, `/tarot/cartas` y los 78 slugs.
- `/tarot/lectura` y `/tarot/lectura/[id]` con `robots: noindex`.
- `check-seo.sh` debe pasar sobre `/tarot` y una ficha.

## 6. Pruebas

- **Vitest (`src/lib/tarot/*.test.ts`):** dataset con 78 entradas únicas y zod válido; codec simétrico
  y rechazo de cada tipo de URL inválida; `shuffle` sin repetidos con rng fijo; frecuencia de
  invertidas ≈ 1/3 en 10.000 tiradas con rng real (tolerancia ±3 puntos); dignidades para las 16
  combinaciones de elementos; proporciones en tiradas construidas a mano; sí/no en los 3 casos de
  orientación y en mayoría/desempate; quintaesencia con reducción y Loco; y un test exhaustivo:
  para las 4 tiradas × 78 cartas × 2 orientaciones × cada posición, `renderReading` no devuelve
  bloques vacíos ni placeholders (`{`, `undefined`).
- **Actions:** tests como los del resto del repo (`actions.test.ts`), más el guard de cobertura de
  rate limit.
- **PGlite (`webApp/supabase`):** RLS de `tarot_readings` (otra usuaria no ve ni borra), sin update,
  grants por columna, trigger de integridad con los casos inválidos, `user_id` fijado por trigger.
- **Playwright:** PPF de punta a punta como anónima (mezclar, elegir 3, leer, el enlace de compartir no
  trae `q`), guardar y ver en `/panel/tarot` como alumna, ficha de una carta con JSON-LD.

## 7. Verificadores (los de siempre)

`cd webApp && npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` ·
`cd webApp/supabase && npm test` · `bash webApp/scripts/check-seo.sh <url>`.

## Riesgos y supuestos

- Los escaneos de Commons varían en calidad; el script compara dos series antes de comprometerse.
  Si ninguna sirve, se reabre la decisión 3.
- Los textos de prosa son el corazón de la experiencia y van a necesitar una pasada de la dueña o de
  una docente de tarot. Se diseñan como datos (plantillas), no como código, para que esa revisión no
  requiera programar.
- Nada de losarcanos.com entra al código. `losarcanos-cartas.json` no está en el repo.

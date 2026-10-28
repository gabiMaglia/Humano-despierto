# Rediseño visual «Brote» (B4) — spec

**Fecha:** 2026-10-22 · **Rama:** `feature/rediseno-brote` (worktree `.claude/worktrees/rediseno-brote`, desde `origin/main` bbe7a19) · **ADR:** ADR-015 (a escribir en T-060)

## Por qué

La dueña pidió un estilo cercano a somosbuenavida.com: luminoso, cálido, con fotografía de naturaleza
y personas reales. Se exploraron 4 direcciones y 4 variantes de la elegida; el PO eligió **B4 «Brote 2»**.
Maquetas públicas: https://gabimaglia.github.io/humano-disenos/ (B4 = `b4-brote2.html`).
Copia de referencia en el repo: `design_handoff_humano_humano/reference/brote/b4-brote2.html`.

## Decisiones del PO (2026-10-22, no se re-litigan)

1. **Alcance: toda la app de una.** Las 33 rutas, incluidos paneles docente/admin y el player.
2. **Rama propia, sin mergear.** Al final queda un PR abierto contra `main`; el PO lo aprueba.
3. **Fotos: Unsplash verificadas** como placeholder, marcadas en código; cursos y guías usan sus
   portadas/avatares reales cuando existen.
4. **Se elimina el tema oscuro Cosmos.** Un solo tema, claro.

## Qué cambia en las reglas del proyecto (CLAUDE.md, «Design language»)

| Regla vieja | Regla nueva |
|---|---|
| Tema oscuro Cosmos + `pergamino` | Un solo tema claro «Brote». Sin `data-theme`. |
| Cinzel · Quicksand · Cormorant · Cardo | **Plus Jakarta Sans** (400/500/600/700/800) por `next/font`. Una sola familia. |
| Sin imágenes raster | **Raster permitido** para fotografía, siempre por `next/image`, con `alt` real y tamaño reservado. Hosts: `images.unsplash.com` (placeholder) y el Storage propio. Ilustración sigue siendo SVG inline. |
| Starfield, ZodiacWheel, marcas de agua romanas, canvas three.js del login | **Se borran** (y `three` sale de dependencias si nadie más la usa). |
| Glifos ☉ ☽ ✦ ◐ | Se mantiene **sin emojis**. Los glifos no son parte del lenguaje nuevo; donde funcionaban como ícono pasan a SVG de línea. |

El handoff `design_handoff_humano_humano/reference/design-system/` queda **histórico**; la fuente de
verdad pasa a ser `reference/brote/` + `src/styles/tokens.css`.

## Tokens (fuente única: `src/styles/tokens.css`, expuestos a Tailwind 4 vía `@theme`)

Nombres **semánticos**: no queda ningún `lila`, `cosmos`, `ink` ni `gold` en el código.

| Token | Valor | Uso | Contraste medido |
|---|---|---|---|
| `fondo` | `#FCFBF8` | fondo de página | — |
| `papel` | `#FFFFFF` | tarjetas, paneles | — |
| `salvia-100` | `#EEF3EC` | fondo de sección alterna | — |
| `salvia` | `#CFDCCB` | bordes suaves, chips | — |
| `linea` | `#E3E8E1` | divisores, bordes de input | — |
| `tinta` | `#2C3A31` | texto cuerpo | 11.55 fondo · 10.63 salvia-100 |
| `bosque` | `#1F2E24` | títulos, botón secundario, footer | 13.76 fondo |
| `bosque-700` | `#33473A` | hover de bosque | — |
| `suave` | `#5F6E65` | texto secundario, metadatos | 5.20 fondo · 4.78 salvia-100 |
| `miel` | `#C7922E` | botón primario (texto `bosque` encima: 5.14) | — |
| `miel-hover` | `#D9A23A` | hover primario | — |
| `miel-800` | `#8A6219` | enlaces y acento en texto | 5.28 fondo · 4.86 salvia-100 |
| `miel-100` | `#F7EBD0` | etiquetas («Gratis», «Nuevo») | 4.62 con miel-800 |
| `musgo` | `#5E7A66` | **sólo** íconos e ilustración (no texto) | 4.56 fondo |
| `error` | `#A8322A` | errores de formulario | 6.43 fondo |
| `exito` | `#2F6B45` | confirmaciones | 6.13 fondo |

Radios: `sm 8` · `md 12` · `lg 18` · `pill 9999`. Sombras: `card 0 13px 50px rgb(31 46 36/.10)` ·
`lift 0 30px 50px rgb(31 46 36/.20)` · `float 0 0 30px -2px rgb(0 0 0/.18)`.
Motion: `--ease cubic-bezier(.22,1,.36,1)` · `--circ cubic-bezier(.85,0,.15,1)`; reveal 1.1–1.2s,
hover 0.3s, tarjeta 0.85s. `prefers-reduced-motion` → sólo fade 200ms.

**Mapeo para el codemod** (uso actual → nuevo): `bg-cosmos-0`→`bg-fondo` · `bg-cosmos-surface`/`-elev`/`-1`/`-2`→`bg-papel` o `bg-salvia-100` (según rol) ·
`text-ink`→`text-tinta` · `text-ink-soft`/`text-ink-faint`→`text-suave` · `border-lila-300*`→`border-linea` ·
`text-lila-*`→`text-bosque` (títulos) o `text-miel-800` (acento/enlace) · `text-gold-400`→`text-miel-800` ·
`bg-gold-400`/`bg-lila-300` (botones)→ componente `Button` · gradientes Cosmos → se quitan.
El codemod es el punto de partida, **no** el final: cada pantalla se revisa a ojo.

## Componentes base (T-060)

`Button` (primary miel / secondary bosque / outline / ghost; min-height 48, sm 40; chevron que se
desplaza 4px; focus visible) · `SiteHeader` (transparente sobre hero → sólido al pasar el hero;
**menú móvil** con panel, Escape, foco devuelto) · `SiteFooter` (bosque, 4 columnas) · `Reveal`
(visible en reposo; sólo anima lo que arranca fuera de pantalla) · `CourseCard` (imagen 4:3 + tarjeta
blanca superpuesta, rating o «Curso nuevo, todavía sin reseñas», toda la tarjeta clickeable) ·
`LeafIllustration` (SVG de la maqueta) · `Rating` · `WhatsAppFloat` (sólo si existe
`NEXT_PUBLIC_WHATSAPP_URL`; sin esa variable no se dibuja) · `BackToTop`.

## Pantallas (orden de tickets)

- **T-061 Público:** `/` (estructura de B4 con datos reales: hero con foto + cita, manifiesto,
  cursos destacados, cifra, guías, «Empezá por la clase gratuita»), `/cursos`, `/cursos/[slug]`,
  `/guias`, `/guias/[slug]`, `/diario`, `/diario/[slug]`, `/certificado/[code]`, `not-found`,
  `global-error`, imagen OG (`src/lib/og/brand.tsx`).
- **T-062 Acceso:** `/entrar`, `/entrar/recuperar`, `/entrar/nueva-clave`, `/invitacion/invalida`. Sin three.js.
- **T-063 Alumna:** `/panel`, `/panel/perfil`, `/panel/notas`, `/circulo`, `/circulo/[curso]`, `/leccion/[id]`.
- **T-064 Docente y admin:** `/panel/docente/**`, `/panel/admin/**`.

## Reglas de contenido

- La cita del hero y los textos de la portada viven en `src/content/landing.ts` (tipado, editable).
- «La primera clase es gratis» sólo se afirma de un curso que **tiene** una lección `is_preview`. En la
  portada se dice «Muchos cursos tienen una clase gratuita» salvo que todos la tengan.
- Las cifras salen de la base (ya existen las queries de T-053). Nada inventado en producción.
- Sin estrellas cuando no hay reseñas (regla R-01).
- Placeholders Unsplash: lista cerrada y verificada en `src/content/placeholder-photos.ts`, cada uno con
  `alt` que describe lo que se ve. Prohibido el id `1469474968028-56623f02e42e` (es la foto de somosbuenavida.com).

## Lo que NO se toca

Schema, migraciones, RLS, Server Actions, lógica de `src/lib/server/**`, rutas y sus contratos.
Si una pantalla necesita un dato que no existe, se anota como deuda, no se agrega columna.

## CSP (T-052 ya en main)

`img-src` es una lista en `src/lib/security/csp.ts`: se agrega `https://images.unsplash.com`, con su test.
`font-src 'self'` alcanza porque `next/font` sirve las fuentes desde el propio origen.

## Verificación (por ticket)

`npx tsc --noEmit` · `npm run lint` · `npm test` (Vitest) · `npm run test:e2e` (Playwright; ajustar
selectores rotos por el rediseño, nunca borrar una aserción de comportamiento) ·
`cd supabase && npm test` (no debería moverse) · capturas de cada ruta tocada a 1440 px y 390 px.
Contraste: ningún texto por debajo de 4.5:1.

# Handoff · Humano demasiado Humano · Plataforma de cursos holísticos

## Overview
**Humano demasiado Humano** es una escuela online de oficios holísticos: tarot, astrología, herbalismo, reiki, magia y disciplinas afines. Esta entrega contiene el diseño completo de **9 pantallas hi-fi** (desktop + mobile) más un **sistema de diseño** listo para integrar en Tailwind. El destino es **un proyecto Next.js (App Router) con Tailwind v3+** y datos mockeados (sin backend real todavía).

## About the Design Files
Los archivos de la carpeta `reference/` son **mockups hi-fi escritos en HTML + React/Babel inline + CSS** — funcionan como referencia visual y de comportamiento, no como código de producción. La tarea es **recrear estas pantallas en Next.js usando React Server/Client Components, App Router, Tailwind y un patrón de mock data colocalizada** (carpeta `lib/mocks/`). El HTML inline que se ve en `reference/hifi/*.jsx` y `*.css` se debe **portear a JSX modular + Tailwind** apoyándose en `reference/design-system/tailwind.config.js`.

No reutilices los `.html` directamente. Sí copiá tokens, gradientes, animaciones y copy textual.

## Fidelity
**Hi-fi** — los colores, tipografías, glifos, espaciado y micro-interacciones son finales y deben reproducirse pixel-perfect. Las únicas decisiones abiertas son: estructura de carpetas Next.js, librería de forms (sugerido: `react-hook-form` + `zod`), librería de animación (sugerido: `framer-motion` para reemplazar las animaciones CSS donde haga falta orquestación).

---

## Stack recomendado

```
Next.js 14+ (App Router)
React 18
TypeScript (estricto)
Tailwind CSS 3.4+
@next/font (Google Fonts: Cinzel, Quicksand, Cormorant Garamond, Cardo)
Framer Motion (animaciones complejas: zodiac wheel, breathe, parallax)
clsx + tailwind-merge (cn helper)
zustand (estado: tema, tweaks, sesión mock)
zod + react-hook-form (Checkout)
```

## Estructura sugerida

```
app/
  (marketing)/
    page.tsx                  → Landing (hifi/Landing.html)
    cursos/page.tsx           → Catálogo
    cursos/[slug]/page.tsx    → Detalle de curso
    maestras/[slug]/page.tsx  → Perfil de maestra
    diario/page.tsx           → Blog índice
    circulo/page.tsx          → Comunidad (puede requerir auth)
  (app)/
    panel/page.tsx            → Dashboard estudiante (auth)
    leccion/[id]/page.tsx     → Reproductor (auth)
    inscribirme/[curso]/page.tsx → Checkout
  layout.tsx                   → Fonts + theme provider + starfield global

components/
  cosmos/                     → primitives reutilizables
    Starfield.tsx
    ZodiacWheel.tsx
    GoldButton.tsx
    Eyebrow.tsx
    RomanNumber.tsx
    MoonGlyph.tsx
    Divider.tsx
  layout/
    Nav.tsx
    Footer.tsx
  landing/HeroAsymmetric.tsx, MaestrasGrid.tsx, ...
  catalog/FilterSidebar.tsx, CourseCard.tsx
  course/Pergamino.tsx, ModuleAccordion.tsx
  player/Stage.tsx, NotesPanel.tsx, ChapterList.tsx
  checkout/Stepper.tsx, PlanCard.tsx, OrderSummary.tsx
  community/ChannelList.tsx, ThreadCard.tsx
  dashboard/MoonPhaseCard.tsx, ProgressRing.tsx

lib/
  mocks/
    courses.ts        → catálogo + detalle
    maestras.ts
    user.ts           → estudiante mock "Lía Marechal"
    threads.ts        → comunidad
    posts.ts          → blog
    lessons.ts
  utils/
    cn.ts
    roman.ts          → número → romano
    moon-phase.ts     → fecha → fase

styles/
  globals.css         → @import fonts, tokens.css, base layer

tailwind.config.js    → COPIAR de reference/design-system/
```

---

## Sistema de diseño — tokens canónicos

### Paleta · Cosmos (dark, default)
```
bg-0          #0a0418   fondo profundo
bg-1          #140828   fondo elevado
bg-2          #1f0f3a   fondo card
surface       #1a0e2e   card base
surface-elev  #2a1a4d   card elevada / hover
line          rgba(196,181,253,0.18)
line-strong   rgba(196,181,253,0.40)
ink           #ede4ff   texto principal
ink-soft      #b8a8d0   texto secundario
ink-faint     #8070a0   texto muted / labels
lila-300      #c4b5fd   accent primario
lila-400      #a78bfa
lila-600      #7c3aed   accent profundo
gold-400      #f5d76e   accent ceremonial / CTAs
gold-500      #d4a843
magenta       #ec4899   accent ocasional
```

### Paleta · Pergamino (light)
```
bg-0          #f5efe2
bg-1          #ebe2ce
surface-elev  #ffffff
ink           #1f1430
lila          #5b2a86
gold          #b8893a
```

### Tipografía
| Rol | Familia | Uso |
|-----|---------|-----|
| Display | **Cinzel** 400/500/600/700 | Títulos H1-H4, números romanos, eyebrows |
| Body | **Quicksand** 300/400/500/600 | Párrafos UI, formularios, navegación |
| Quote | **Cormorant Garamond** italic | Citas, bajadas en cursiva, voz emocional |
| Alt display | **Cardo** | Variante "manuscrito" (tweak) |

### Escala
```
display-xl    clamp(48px, 7vw, 96px) / 1.0  / +6% letter-spacing
display-lg    clamp(36px, 5vw, 72px) / 1.05 / +5%
display-md    clamp(28px, 3.5vw, 44px) / 1.1 / +4%
h2            28px / 500 / +0.5px
h3            22px / 500 / +0.5px
h4            18px / 500 / +0.5px
body          14px / 1.55 / 0
quote         17px italic / 1.6
eyebrow       10-11px / 600 / +0.22em uppercase
eyebrow-sm    9px / +0.22em uppercase
```

### Radius
```
sm    4px   inputs
md    6px   cards / buttons
lg    8px   surfaces grandes
pill  100px chips, pills, search
```

### Sombras
```
cosmos-card   0 20px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px line
gold-glow     0 0 30px -10px rgba(245,215,110,0.4)
lila-glow     0 0 40px -10px rgba(196,181,253,0.35)
```

### Animaciones (CSS keyframes)
```
breathe    5s ease-in-out infinite     opacity 0.7→1, scale 1→1.04 (glifos centrales)
wheelSpin  60s linear infinite          rotate 0→360 (rueda zodiacal, conic-gradient rays)
twinkle    3s ease-in-out infinite      opacity 0.3→1 (estrellas)
ping       1.6s                         estado online en avatares
```

### Iconografía
**No emojis.** Glifos Unicode: `☉ ☽ ✦ ◐ ◑ ○ ● ☾ ♀ ♂ ♃ ♄ ⚯ ✧ ✎ ▷`. Lunas como state-icon (○ próximo, ◐ en curso, ◑ cerrando, ● completo). Numeración pública en romanos: I, II, III, MMXXVI, CDXVIII.

### Patrones recurrentes
- **Marca de agua romana**: número grande (64-140px) en `gold` con `opacity: 0.15-0.18`, posición `top:18 right:22`.
- **Divider ceremonial**: línea + glifo centrado + línea.
  ```jsx
  <div className="cd-divider"><span className="line"/><span className="symbol">EYEBROW</span><span className="line"/></div>
  ```
- **Starfield global**: `.starfield` div fijo con 3-5 radial-gradients + `twinkle`.
- **Vignette cósmico**: gradiente radial elíptico desde el centro al `bg-0`.

---

## Pantallas

### I · Landing (`/`)
- Hero asimétrico: izquierda copy + CTAs, derecha **rueda zodiacal SVG** (3 anillos contrarrotantes, hexagrama central, fases lunares orbitales)
- Strip de **valores** (3 columnas: Linaje · Práctica · Círculo)
- Grid de **cohortes próximas** (3 cursos featured con romanos)
- Sección **maestras** (4 retratos circulares con glifo)
- Sección **diario** (3 entradas recientes con fase lunar)
- Strip **boletín lunar** + footer ceremonial

Mock data: `lib/mocks/courses.ts` (3 featured), `maestras.ts` (4), `posts.ts` (3 latest)

### II · Catálogo (`/cursos`)
- Hero strip con buscador + glifo cósmico
- **Sidebar sticky**: búsqueda, disciplina (Tarot/Astro/Herbal/Reiki/Oficio/Magia), nivel (Iniciación/Aprendiz/Maestría), duración, fase lunar de inicio, modalidad
- Grid 3-col de course cards (romano + título + maestra + meta + price)
- Pills activos arriba con clear-all
- Mobile: filtros en bottom-sheet

### III · Detalle de curso (`/cursos/[slug]`)
"Pergamino narrativo" centrado, ancho legible (~720px):
- Header ceremonial: 2 glifos rotando lentos · eyebrow "UN CURSO DE" · título display-xl con palabra clave en italic-lila · bajada en quote
- Stats romanos en línea (XXI sesiones · X semanas · Cohorte XII)
- **Acordeón de módulos** (5-7 módulos, cada uno con 3-5 lecciones)
- Maestra inline: avatar circular + bio corta
- **Pricing card** sticky lateral con CTA dorado grande "Sellar el pacto"
- Testimonios en quote tipográfico grande

### IV · Maestra (`/maestras/[slug]`)
- Hero 2 cols: izquierda glifo solar + nombre display + rol italic + stats romanos
- Derecha: **carta natal SVG** (placeholder con casas, planetas, líneas)
- Bio narrativa en columnas tipo periódico
- Cursos de la maestra (cards)
- "Voces de quienes pasaron" (testimonios)

### V · Dashboard (`/panel`) [auth mock]
- Saludo "Bienvenida de vuelta, Lía"
- **Card lunar** destacada (fase actual + glosa)
- Strip "Próximas sesiones live" (3 fechas)
- **Mis cursos** con progress rings
- Bitácora reciente (mini-blog del estudiante)
- Card "El círculo" (preview del foro)

### VI · Reproductor (`/leccion/[id]`) [auth mock]
- **Stage 16:9** con tirada de cruz celta (10 cartas SVG, 2 centrales con halo)
- Top bar: ← Volver · breadcrumb (II · Las tiradas · Lección VII) · badge cohorte
- Overlay con eyebrow live + título + meta
- **Controls**: tiempo mono dorado, scrubber lila→gold, marcadores de capítulo, bookmark/CC/speed
- Capítulos clickeables (5)
- **Aside con tabs**: Módulos · Notas · Recursos
  - Notas: textarea + lista con timestamp dorado
  - Recursos: PDFs/audio + card próximo encuentro live

### VII · Checkout (`/inscribirme/[curso]`)
- Stepper 4 pasos en romanos (Cohorte · Plan · Datos · Pacto)
- 3 plan cards (Pago único / Tres lunas / Beca parcial) con badge "★ MÁS ELEGIDO"
- Form: nombre, email, tel, fecha+lugar nacimiento (para carta natal), pregunta poética
- Métodos: tarjeta · MercadoPago · transferencia
- Aside resumen sticky: card con borde dorado, romano de marca de agua, info curso, cohorte con barra de plazas, inclusiones, totales, código de invitación, card "¿Dudás antes de cruzar?"
- CTA grande "Sellar el pacto · $280 ↦"

**Validación zod**:
```ts
const checkoutSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  birthDate: z.string(), // dd/mm/yyyy
  birthPlace: z.string().optional(),
  intention: z.string().max(280).optional(),
  plan: z.enum(['full','three','beca']),
  paymentMethod: z.enum(['card','mp','transfer']),
  acceptTerms: z.literal(true),
  newsletter: z.boolean(),
});
```

### VIII · Diario (`/diario`)
- Hero centrado + buscador pill
- Strip de categorías horizontales con conteos
- **Featured** card-bordes-dorados con arte cósmico animado (glifo + rayos cónicos rotantes + estrellas)
- Lista 6 entradas con romano + mini-arte + fase lunar
- Aside: boletín lunar (input+botón), las plumas (4 maestras), serie en curso

### IX · Comunidad (`/circulo`) [auth mock]
- Hero centrado con 3 stats romanos (CDXVIII estudiantes · XXIV círculos · IX maestras)
- **Layout 3 cols**:
  - **Izq**: 7 canales (Plaza mayor · Astrología · Tarot · Herbalismo · Reiki · Oficio · Encuentros) + "Código del círculo" (4 reglas)
  - **Centro**: composer + tabs (Recientes/Sin responder/Mías) + hilos (uno anclado con pill dorado)
  - **Der**: encuentros próximos, "en el círculo ahora" con dot online pulsante, ritual semanal

---

## Mock data — guía mínima

```ts
// lib/mocks/courses.ts
export const COURSES = [
  { slug: 'tarot-iniciatico', num: 'II', title: 'Tarot iniciático', subtitle: 'los 22 arcanos como espejo del alma',
    maestra: 'sol-mayor', discipline: 'Tarot', level: 'Maestría',
    weeks: 10, sessions: 21, priceFull: 280, priceMonthly: 100,
    cohort: { date: '2026-05-06', spotsTaken: 12, spotsTotal: 15 },
    moonPhase: 'crescent',
    modules: [...], includes: [...]
  },
  ...
];

// lib/mocks/user.ts
export const ME = { name: 'Lía Marechal Iturri', sign: 'cancer', cohort: 'XV',
  enrolledCourses: ['tarot-iniciatico'], moonAffinity: 'crescent', avatarGlyph: '☽' };
```

Todos los datos visibles en los archivos `reference/hifi/*.jsx` están hardcodeados con consts arriba (constantes `LANDING`, `CATALOG`, `COURSE`, `MAESTRA`, `DASHBOARD`, `PLAYER`, `CHECKOUT`, `BLOG`, `COM`). Copiá literalmente esas constantes a `lib/mocks/`.

---

## Tweaks (opcionales)
La versión actual expone un panel "Tweaks" con tema (Cosmos/Pergamino), familia display (Cinzel/Cormorant/Cardo), densidad (Compacto/Normal/Aireado). En Next.js: implementarlo con `next-themes` + un Zustand store + atributos `data-theme` / `data-font` / `data-density` en `<html>`. Variables CSS responden vía `tokens.css`.

---

## Animaciones críticas
1. **ZodiacWheel**: 3 anillos SVG concéntricos con `animation: wheelSpin` (60s) en sentidos opuestos. Con Framer Motion: `<motion.g animate={{rotate:360}} transition={{duration:60,repeat:Infinity,ease:'linear'}}/>`.
2. **Glifos breathing**: glifos hero (☉ ✦) con keyframe `breathe` 5s.
3. **Starfield twinkle**: usar 3 layers `<div>` con radial-gradients y delays distintos.
4. **Hover de cards**: translateY(-4px) + border-color gold + box-shadow gold-glow, transition 0.25s.
5. **Pin/star** en hilo anclado: pill dorado absoluto top:-8px left:18px.

---

## Assets
- **Sin imágenes raster.** Toda la iconografía es Unicode + SVG inline (rueda zodiacal, carta natal, tirada tarot — todo SVG).
- Fuentes vía `next/font/google`: Cinzel, Quicksand, Cormorant_Garamond, Cardo.
- Si en el futuro necesitás retratos de maestras: placeholders circulares con glifo + initial sobre gradient `radial-gradient(circle at 30% 30%, #7c3aed, #0a0418)`.

---

## Files en este handoff
```
reference/
  Portada.html              → índice navegable de las 9 pantallas
  hifi/                     → 9 pantallas hi-fi (HTML + JSX inline + CSS)
    Landing.html, landing.css, desktop.jsx, mobile.jsx, zodiac-wheel.jsx
    Catalogo.html, catalog.css, catalog.jsx
    Curso.html, course-detail.css, course-detail.jsx
    Maestra.html, maestra.css, maestra.jsx
    Dashboard.html, dashboard.css, dashboard.jsx
    Reproductor.html, player.css, player.jsx
    Checkout.html, checkout.css, checkout.jsx
    Blog.html, blog.css, blog.jsx
    Comunidad.html, comunidad.css, comunidad.jsx
  design-system/
    tokens.css              → CSS variables crudas (cosmos + pergamino)
    tailwind.config.js      → CONFIG TAILWIND COMPLETA — copiar a la raíz del proyecto Next
    index.html              → catálogo visual de paleta, tipo, glifos, componentes
    README.md               → guía de instalación
```

## Cómo correr la referencia localmente
1. Servir la carpeta con cualquier static server: `npx serve reference/`
2. Abrir `Portada.html` para navegar las 9 pantallas
3. Cada pantalla tiene panel **Tweaks** abajo a la derecha para alternar tema/fuente/densidad

## Primer prompt para Claude Code
> "Soy desarrollador. Inicializá un proyecto Next.js 14 con App Router, TypeScript estricto y Tailwind. Copiá `reference/design-system/tailwind.config.js` a la raíz, importá las fuentes en `app/layout.tsx` con next/font/google, y creá la estructura de carpetas descrita en el README. Empezá implementando la pantalla **I · Landing** copiando la data de `reference/hifi/desktop.jsx` (constantes LANDING) a `lib/mocks/landing.ts`. Reemplazá las clases CSS por clases Tailwind apoyándote en los tokens de la config. Mantené la animación de la rueda zodiacal con framer-motion."

Después se itera pantalla por pantalla en este orden: Landing → Catálogo → Curso → Maestra → Checkout → Dashboard → Reproductor → Blog → Comunidad.

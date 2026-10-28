# PROMPT PARA CLAUDE (VS Code)

> Copiá todo desde acá hacia abajo y pegalo en Claude. Completá los campos `[[ ... ]]` antes de enviarlo (o dejalos y Claude te va a preguntar).

---

## 0. Rol y objetivo

Actuá como **Brand Designer + Design Engineer senior**. Vas a crear desde cero una **marca propia** y su **sitio web** para una escuela/plataforma de formaciones holísticas online.

El sitio de referencia es `somosbuenavida.com`. Lo uso **solo como referencia de look & feel** (estructura, ritmo, tipo de animaciones, sensación). **No copies** su logo, nombre, textos, fotos ni ilustraciones: todo eso tiene que ser original. La marca nueva tiene que sentirse de la misma familia estética, pero distinguible y mejor resuelta según estándares actuales (accesibilidad AA, performance, mobile-first, design tokens).

**Datos de mi marca** (completar):

- Nombre: `[[NOMBRE DE LA MARCA]]`
- Tagline: `[[FRASE CORTA]]`
- Público: `[[ej. mujeres y hombres 28–55, LATAM, interesados en terapias, coaching, autoconocimiento]]`
- Oferta: `[[ej. cursos, talleres, charlas gratuitas, campus virtual]]`
- Diferencial: `[[qué me hace distinto]]`
- Símbolo/arquetipo que me gusta: `[[ej. semilla, árbol, ola, sol, mandala, espiral]]`

---

## 1. Identikit de la referencia (lo que relevé del sitio)

### 1.1 Stack original (solo contexto)
WordPress 6.8 + tema **Ave (Liquid Themes)** + WPBakery + WooCommerce. Las animaciones salen del motor "custom animations" de Liquid (split-text por líneas, entradas por scroll, hovers con easing). Nosotros lo vamos a replicar con código propio y moderno.

### 1.2 Personalidad / look & feel
- **Cálido, sereno, espiritual pero "académico"**: mucho blanco, tipografía geométrica limpia, un único acento dorado/ocre.
- Fotografía de **naturaleza con luz suave** (bosque con bokeh, piedras apiladas en río) + fotos de **personas reales** en contextos humanos (familia, aula, retrato contemplativo).
- Mucho aire: secciones altas, una idea por bloque, textos cortos.
- Logo: **espiral tipo nautilus/caracol** (crecimiento, trascendencia) en ocre, con wordmark redondeado en bold. En el hero aparece en **blanco** sobre foto.
- Tono de voz: segunda persona cercana, voseo rioplatense ("Descubrinos", "Conócenos", "Seguinos"), verbos de transformación ("acompañamos", "trascender", "ser más humanos").

### 1.3 Paleta medida (valores computados reales)

| Rol | Color | Uso en la referencia |
|---|---|---|
| Acento primario | `#DB9C2B` (ocre/mostaza dorado) | Botones, logo, detalles |
| Títulos | `#060221` (azul noche casi negro) | H2 de secciones |
| Texto cuerpo | `#828282` (gris medio) | Párrafos (≈ 60% del texto) |
| Texto secundario | `#98A2AA` (gris azulado) | Footer, metadatos |
| Gris oscuro | `#676767` | Textos de apoyo |
| Fondo base | `#FFFFFF` | Casi todo el sitio |
| Fondo alternativo | `#FAF9F5` (blanco hueso cálido) | Bloques puntuales |
| Footer | `#2D323D` (grafito azulado) + títulos blancos | Pie de página |
| WhatsApp | `#25D366` | Botón flotante |
| Overlay hero | `rgba(0,0,0,0.35)` | Sobre la foto de fondo |

No usa gradientes. Es una paleta **monocromática neutra + un solo acento cálido**.

### 1.4 Tipografía
- Familia única: **Poppins** (Google Fonts), pesos 400 / 500 / 600.
- **H2 de sección**: 44px · weight 600 · line-height 1.1 (48.4px) · letter-spacing **-1px** · color `#060221`. Usa "fittext" fluido entre **32px y 44px**.
- **Body**: 16px · 400 · line-height **1.9** (30.4px) — interlineado muy generoso, sensación de calma.
- **Lead/intro**: 18–20px.
- **Botones**: 15px · 500.
- **Títulos del footer**: 18px · 500 · blanco.
- Tamaños presentes: 14 / 15 / 16 / 18 / 20 / 44px (escala corta, saltos grandes entre body y display).
- Sin mayúsculas forzadas (no usa `text-transform`).

### 1.5 Formas, radios y sombras
- **Botones pill** (radio completo, `9999px`), fondo ocre, texto blanco, ícono chevron `›` a la derecha, transición 0.3s.
- Radios secundarios: 8px (inputs/imágenes chicas), 12px, 16px (cards).
- Sombras suaves y grandes, nunca duras:
  - Card flotante: `0 13px 50px rgba(0,0,0,0.10)`
  - Imagen destacada: `0 30px 50px rgba(0,0,0,0.17)`
  - Elementos flotantes: `0 0 30px -2px rgba(0,0,0,0.15)`
  - Header sticky: sombra difusa al despegarse.

### 1.6 Estructura de la home (orden de secciones)
1. **Header** blanco: logo a la izquierda, hamburguesa/nav a la derecha. **Sticky** a partir de la primera sección (con sombra suave). Submenús con fade al hover.
2. **Hero full-viewport**: foto de bosque con overlay oscuro, lockup del logo grande en blanco centrado, 2 líneas de subtítulo blanco ("Formaciones holísticas de excelencia académica. / Acompañamos a los seres a trascender."), CTA pill ocre "Descubrinos ›".
3. **Bloque manifiesto**: H2 grande en 2 líneas + párrafo + CTA "Conócenos ›" + imagen grande con sombra profunda (piedras apiladas).
4. **Grilla de formaciones** ("Charlas, Talleres y Cursos"): cards tipo portfolio → imagen grande con el título del curso sobreimpreso en una banda translúcida oscura con texto dorado en mayúsculas, y una **card blanca superpuesta** que sobresale por debajo de la imagen (desplazada hacia adentro ~30px) con el nombre del curso.
5. **Contador/texto rotativo**: "Más de 5000 horas de …" (texto que rota/aparece).
6. **Footer** grafito `#2D323D` en 4 columnas: Sobre nosotros · Mapa del sitio · Redes · Contacto + barra inferior con links y ©.
7. **Flotantes**: botón WhatsApp abajo-izquierda (verde, con tooltip "¿Necesitas ayuda?" animado) y botón "volver arriba" circular blanco abajo-derecha.

### 1.7 Animaciones (parámetros reales extraídos)

| Animación | Disparador | Detalle |
|---|---|---|
| **Split-text por líneas** en H2 | Al entrar en viewport | Cada línea se revela desde una máscara (`overflow:hidden` + `translateY(100%)→0`). Duración **700ms**, stagger **100ms** por línea, easing **easeOutQuint**. |
| **Fade-up de hijos** | En viewport | `translateY(51px), opacity 0 → 0, 1`. Duración **1200ms**, stagger 100ms, easeOutQuint. |
| **Entrada de cards** | En viewport, una por una al hacerse visibles | 700ms, delay 100ms, easeOutQuint. |
| **Hover en card de curso** | mouseenter / mouseleave | La card de texto sube `translateY(0 → -70px)` en **850ms easeInOutCirc** (vuelta 700ms); el texto interno se re-anima por líneas con delay 280ms y stagger 60ms. |
| **Transform genérico** | hover | `transform 0.3s cubic-bezier(0.22, 0.665, 0.34, 0.875)` |
| **Lazy-load de imágenes** | carga | `opacity 0 → 1` en **1s** |
| **Header sticky** | pasa la 1ª sección | Se fija con fondo blanco + sombra |
| **Submenús** | hover | fade |
| **Botones** | hover | todo en 0.3s (cambio de fondo/elevación) |
| **Tooltip WhatsApp** | loop | ciclo de 20s lineal (aparece/desaparece) |

Sensación general: **lento, suave, con desaceleración larga** (easeOutQuint). Nada rebota ni gira. Todo "respira".

Equivalentes de easing:
- easeOutQuint → `cubic-bezier(0.22, 1, 0.36, 1)`
- easeInOutCirc → `cubic-bezier(0.85, 0, 0.15, 1)`

---

## 2. Qué mejorar respecto de la referencia (estándares de mercado)

1. **Contraste AA**: el gris `#828282` sobre blanco da ≈3.9:1 (no pasa AA para texto normal) y texto blanco sobre `#DB9C2B` da ≈2.3:1. En mi marca: texto cuerpo ≥ 4.5:1 y botones con texto oscuro sobre el acento, o un acento más profundo para fondos con texto blanco.
2. **Fotos con texto incrustado** (los títulos de curso están dentro de la imagen): en mi marca, el texto siempre en HTML (SEO, accesibilidad, i18n).
3. **`prefers-reduced-motion`**: desactivar split-text y desplazamientos; dejar solo fades cortos.
4. **Performance**: imágenes AVIF/WebP con `srcset`, LCP del hero < 2.5s, fuentes con `font-display: swap` y subset latin.
5. **Design tokens** centralizados (no valores sueltos).
6. Agregar lo que falta para conversión: prueba social (testimonios, docentes), FAQ, newsletter, próximas fechas, precios/planes claros.

---

## 3. Lo que tenés que hacer

### Fase A — Plataforma de marca (entregá esto primero y esperá mi OK)
1. **Brand brief** de 1 página: propósito, misión, visión, valores (3–5), arquetipo de marca, personalidad (4 adjetivos + 4 "no somos"), promesa.
2. **Tono de voz**: principios, 5 ejemplos "decimos / no decimos", microcopy de CTAs.
3. **3 propuestas de concepto de logo** (en SVG): un símbolo orgánico propio (no espiral nautilus) + wordmark. Versiones: color, monocromo, negativo (blanco), favicon 32px, avatar redes.
4. **Paleta propia** inspirada en la referencia pero distinta: 1 acento cálido (dorado/terracota/ámbar a definir), 1 oscuro profundo para títulos, neutros cálidos, 1 color secundario suave opcional (salvia/arena). Escala 50–900 por color, roles semánticos y **tabla de contraste WCAG** verificada.
5. **Tipografía**: pareja display + texto (alternativas a Poppins: p. ej. *Outfit*, *Plus Jakarta Sans*, *Manrope*, *Urbanist*; o serif display tipo *Fraunces* / *DM Serif Display* para un toque más editorial). Escala fluida con `clamp()`.
6. **Dirección de arte fotográfica**: tipo de imágenes, luz, encuadres, tratamiento (grano, calidez), qué evitar.

### Fase B — Design system (tokens)
Generá `tokens.css` (custom properties) + `tailwind.config` con:
```
color.*, font.family.*, font.size.* (clamp), line-height (body 1.75–1.9, display 1.05–1.1),
letter-spacing (display -0.02em), radius (sm 8, md 12, lg 16, pill 9999),
shadow (card: 0 13px 50px rgb(0 0 0/.10); lift: 0 30px 50px rgb(0 0 0/.17); float: 0 0 30px -2px rgb(0 0 0/.15)),
spacing (base 8px; secciones 96–160px desktop / 64–96 mobile),
container (max 1200–1240px, gutter 16px mobile / 24 tablet / 32 desktop),
motion.duration (fast 300, base 700, slow 1200), motion.ease (outQuint, inOutCirc, soft: cubic-bezier(.22,.665,.34,.875)),
z-index, breakpoints (sm 640, md 768, lg 1024, xl 1280)
```

### Fase C — Sitio
**Stack**: Next.js (App Router) + TypeScript + Tailwind + **Motion (Framer Motion)** para reveals y hovers (o GSAP + SplitText si hace falta más control). Fuentes con `next/font`. Contenido en archivos tipados (`/content/*.ts`) listo para migrar a un CMS.

**Componentes**:
- `Header` sticky (aparece con sombra después del hero; menú mobile full-screen con fade).
- `Hero` full-viewport: foto/video con overlay, logo-lockup, subtítulo en 2 líneas, CTA pill. Leve parallax o Ken Burns muy lento en la imagen (scale 1 → 1.06 en 20s).
- `SplitHeading`: revela por líneas (máscara + translateY 100%→0, 700ms, stagger 100ms, outQuint, `once: true`, `amount: 0.3`).
- `Reveal` (fade-up 51px→0, 1200ms, stagger 100ms).
- `Button` pill: variantes primary / secondary / ghost / sobre-foto; ícono chevron que se desplaza 4px a la derecha en hover; elevación con sombra; focus visible.
- `CourseCard`: imagen 4:3 con radio, card de texto superpuesta que sobresale abajo (inset 30px, sombra card); hover → la card sube −70px en 850ms inOutCirc, la imagen hace zoom 1.05, el título se re-revela por líneas.
- `StatsRotator`: "Más de [[N]] horas de [[formación / acompañamiento / práctica]]" con palabra rotativa (fade + slide vertical) y contador animado al entrar.
- `Testimonials`, `Faq` (acordeón), `Newsletter`, `UpcomingDates`.
- `Footer` oscuro en 4 columnas + barra legal.
- `FloatingWhatsApp` (abajo-izq, tooltip que aparece a los pocos segundos) y `BackToTop` (círculo blanco con sombra float, abajo-der, aparece tras 600px de scroll).
- `LazyImage`: blur-up / fade de 1s.

**Páginas**: Inicio, Conócenos, Cursos y Talleres (listado + detalle), Charlas gratuitas, Recursos, Blog, Contacto, Campus (link externo).

**Home** (en este orden): Hero → Manifiesto (H2 + texto + CTA + imagen con sombra profunda) → Formaciones (grilla 3 col desktop / 1 col mobile) → Stats rotativo → Método/beneficios (3–4 ítems con íconos lineales) → Testimonios → Próximas fechas → Newsletter → FAQ → Footer.

### Reglas de animación
- Todo entra **una sola vez** al hacer scroll; nada se repite al volver a subir.
- Solo `transform` y `opacity` (sin animar layout).
- Ningún reveal supera 1.2s; stagger máximo 100ms.
- Con `prefers-reduced-motion: reduce` → solo fade de 200ms.
- Hovers solo en dispositivos con `(hover: hover)`.

### Criterios de aceptación
- Lighthouse ≥ 95 en Performance, Accessibility, Best Practices y SEO (mobile).
- Contraste AA en todo el texto; navegación completa con teclado; `alt` en todas las imágenes.
- Responsive impecable desde 360px; sin scroll horizontal.
- Metadata, Open Graph, `sitemap.xml`, `robots.txt`, schema.org `EducationalOrganization` + `Course`.
- Imágenes placeholder libres de derechos (Unsplash) claramente marcadas para reemplazar.

### Forma de trabajo
1. Antes de codear, mostrame la **Fase A** y esperá mi aprobación.
2. Después generá tokens + una página `/styleguide` que muestre colores, tipografías, botones, cards y animaciones en vivo.
3. Recién ahí armá la home y luego el resto de las páginas.
4. Commits chicos y descriptivos. Si algo es ambiguo, preguntá.

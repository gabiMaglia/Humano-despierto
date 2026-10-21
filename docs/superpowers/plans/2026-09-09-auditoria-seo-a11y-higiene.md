# Auditoría ejecutable — SEO, a11y e higiene de release · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los hallazgos de la auditoría pre-producción que no dependen de cuentas externas ni de decisiones del PO: E-01 (SEO), X-01 (a11y), A-03 (Node), S-04 (cabeceras) y C-02 (`href="#"`).

**Architecture:** No hay lógica de negocio nueva ni migraciones. Se agregan tres archivos de convención de Next (`robots.ts`, `sitemap.ts`, `generateMetadata` por ruta), se corrigen dos componentes de cliente por accesibilidad, y se suma un verificador `check-seo.sh` en el estilo del `check-adr004.sh` que ya existe — sobre el **HTML servido**, no sobre el código.

**Tech Stack:** Next.js 16 (App Router, convenciones de metadata), React 19, TypeScript strict, bash + curl para verificación.

**Spec:** `docs/superpowers/specs/2026-09-09-auditoria-pre-produccion.md`

## Global Constraints

- **`webApp` no tiene runner de tests.** Verificación = `npm run lint` + `npx tsc --noEmit` + scripts sobre HTTP servido. **No introducir vitest/jest/playwright en este plan** — es una decisión de arquitectura que le corresponde al PO, y queda anotada como D-10 al final.
- **§4 del diseño:** sin emojis, sin raster. Glifos Unicode únicamente (`☉ ☽ ✦ ◐ ◑ ○ ● ✧`).
- **TypeScript strict.** Sin `any`, sin `@ts-ignore`.
- **Sin comentarios** salvo que el POR QUÉ no sea obvio. El proyecto comenta el porqué, no el qué.
- **`SITE_URL` es server-only, sin prefijo `NEXT_PUBLIC_`.** Ya existe esa convención en `src/lib/server/mail/notify.ts`.
- **`SUPABASE_SERVICE_ROLE_KEY` nunca lleva `NEXT_PUBLIC_`.**
- Rutas públicas (indexables): `/`, `/cursos`, `/cursos/[slug]`, `/diario`, `/diario/[slug]`, `/guias`, `/guias/[slug]`, `/entrar`, `/certificado/[code]`.
- Rutas privadas (excluidas del índice): `/panel/*`, `/leccion/*`, `/circulo/*`, `/inscribirme/*`.
- Comando de dev usado por los verificadores: `npx next dev --webpack --port 3000`.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/server/site-url.ts` | **Crear.** Única fuente del host absoluto. Hoy vive privada dentro de `notify.ts`; el sitemap la necesita también, y duplicarla es cómo se termina con dos hosts distintos. |
| `src/lib/server/mail/notify.ts` | **Modificar.** Consume el módulo nuevo, borra su copia privada. |
| `src/app/robots.ts` | **Crear.** Excluye las rutas privadas, apunta al sitemap. |
| `src/app/sitemap.ts` | **Crear.** Rutas estáticas + cursos, posts y guías publicados. |
| `src/app/(marketing)/cursos/page.tsx` | **Modificar.** `metadata` estático. |
| `src/app/(marketing)/cursos/[slug]/page.tsx` | **Modificar.** `generateMetadata` desde el curso. |
| `src/app/(marketing)/diario/page.tsx` | **Modificar.** `metadata` estático. |
| `src/app/(marketing)/diario/[slug]/page.tsx` | **Modificar.** `generateMetadata` desde el post. |
| `src/app/(marketing)/guias/page.tsx` | **Modificar.** `metadata` estático. |
| `src/app/(marketing)/guias/[slug]/page.tsx` | **Modificar.** `generateMetadata` desde la guía. |
| `src/app/(marketing)/entrar/page.tsx` | **Modificar.** `metadata` con `robots: { index: false }`. |
| `src/app/layout.tsx` | **Modificar.** `metadataBase` + plantilla de título. |
| `src/components/course/CurriculumAccordion.tsx` | **Modificar.** `aria-expanded`/`aria-controls`, botón real, glifos rotulados. |
| `src/components/player/LessonPlayer.tsx` | **Modificar.** Tabs con `role="tablist"` y flechas. |
| `src/app/(app)/inscribirme/[curso]/page.tsx` | **Modificar.** C-02, el `href="#"`. |
| `next.config.ts` | **Modificar.** Cabeceras de seguridad (S-04). |
| `package.json` | **Modificar.** `engines.node` (A-03). |
| `scripts/check-seo.sh` | **Crear.** Verificador sobre HTML servido, estilo `check-adr004.sh`. |

---

## Task 1: Extraer `getSiteUrl` a un módulo propio

**Files:**
- Create: `webApp/src/lib/server/site-url.ts`
- Modify: `webApp/src/lib/server/mail/notify.ts:20-31`

**Interfaces:**
- Consumes: nada.
- Produces: `getSiteUrl(): string` — host absoluto sin barra final. Lo consumen Task 3 (sitemap) y Task 4 (metadata).

- [ ] **Step 1: Crear el módulo**

Crear `webApp/src/lib/server/site-url.ts`:

```ts
import 'server-only';

/** `SITE_URL` (server-only, sin `NEXT_PUBLIC_`) es la única fuente del host absoluto que sale de
 * este servidor: los links DENTRO de un mail y las URLs canónicas del sitemap y del Open Graph.
 * Nunca el host del request que lo disparó — en dev es el puerto suelto de cada worktree y en
 * producción sería el URL interno equivocado. Sin la env seteada nada se rompe, pero el link no
 * sirve fuera de esta máquina: por eso el fallback queda, y nunca en silencio. */
export function getSiteUrl(): string {
  const configured = process.env.SITE_URL;
  if (!configured) {
    console.error("[site-url] SITE_URL no está seteada — los links absolutos apuntan a localhost.");
  }
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}
```

- [ ] **Step 2: Apuntar `notify.ts` al módulo nuevo**

En `webApp/src/lib/server/mail/notify.ts`, borrar el bloque `function getSiteUrl()` completo
(comentario incluido) y agregar el import junto a los demás:

```ts
import { getSiteUrl } from "@/lib/server/site-url";
```

Las llamadas a `getSiteUrl()` en el archivo no cambian: misma firma, mismo comportamiento.

- [ ] **Step 3: Verificar que nada se rompió**

```bash
cd webApp && npx tsc --noEmit && npm run lint
```
Esperado: sin errores. Si `tsc` marca `getSiteUrl` como no usado en `notify.ts`, es que quedó una
definición duplicada — borrar la vieja.

- [ ] **Step 4: Commit**

```bash
git add webApp/src/lib/server/site-url.ts webApp/src/lib/server/mail/notify.ts
git commit -m "refactor(seo): getSiteUrl sale de notify.ts a modulo propio

El sitemap y el Open Graph necesitan el mismo host absoluto que los mails.
Dos copias de esta funcion es como se termina con dos hosts distintos.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: `robots.ts`

**Files:**
- Create: `webApp/src/app/robots.ts`

**Interfaces:**
- Consumes: `getSiteUrl()` de Task 1.
- Produces: `/robots.txt` servido.

- [ ] **Step 1: Crear el archivo**

```ts
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/server/site-url";

/** Las rutas privadas ya exigen sesión, pero un crawler igual las pide: sin esta exclusión
 * terminan como soft-404 o como "página sin contenido" en el índice. Es también lo que vuelve
 * aceptable el 200 de `notFound()` en `/panel/docente/cursos/[courseId]` (C-01 de la auditoría):
 * ese 200 solo miente si Googlebot llega a verlo. */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel/", "/leccion/", "/circulo/", "/inscribirme/"],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Verificar servido**

Con el dev server corriendo (`npx next dev --webpack --port 3000`):
```bash
curl -s http://localhost:3000/robots.txt
```
Esperado: las cuatro líneas `Disallow:` y la línea `Sitemap:`.

- [ ] **Step 3: Commit**

```bash
git add webApp/src/app/robots.ts
git commit -m "feat(seo): robots.txt excluye panel, leccion, circulo e inscribirme (E-01)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: `sitemap.ts`

**Files:**
- Create: `webApp/src/app/sitemap.ts`

**Interfaces:**
- Consumes: `getSiteUrl()` (Task 1) · `getPublishedCourses()` de `@/lib/server/courses` ·
  `getPublishedPosts()` de `@/lib/server/diario` · `getPublicTeachers()` de `@/lib/server/guias`.
- Produces: `/sitemap.xml`.

**Antes de escribir código:** abrir los tres módulos y confirmar los nombres de campo reales del
tipo devuelto (`slug`, y si existe algún `updatedAt`/`publishedAt`). No inventar campos — el plan
usa `slug` porque es el que las rutas dinámicas ya consumen; si el tipo trae fecha, usarla como
`lastModified`, y si no, omitir la propiedad en vez de inventar `new Date()`.

- [ ] **Step 1: Crear el archivo**

```ts
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/server/site-url";
import { getPublishedCourses } from "@/lib/server/courses";
import { getPublishedPosts } from "@/lib/server/diario";
import { getPublicTeachers } from "@/lib/server/guias";

/** Solo contenido publicado, y sale de la base — no de una lista escrita a mano que se
 * desactualiza el día que alguien despublica un curso. Misma doctrina que los conteos de T-019:
 * un sitemap que promete URLs que dan 404 es peor que no tener sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${site}/`, priority: 1 },
    { url: `${site}/cursos`, priority: 0.9 },
    { url: `${site}/guias`, priority: 0.8 },
    { url: `${site}/diario`, priority: 0.7 },
  ];

  const [cursos, posts, guias] = await Promise.all([
    getPublishedCourses(),
    getPublishedPosts(),
    getPublicTeachers(),
  ]);

  return [
    ...estaticas,
    ...cursos.map((c) => ({ url: `${site}/cursos/${c.slug}`, priority: 0.8 })),
    ...guias.map((g) => ({ url: `${site}/guias/${g.slug}`, priority: 0.6 })),
    ...posts.map((p) => ({ url: `${site}/diario/${p.slug}`, priority: 0.5 })),
  ];
}
```

- [ ] **Step 2: Ajustar al tipo real**

```bash
cd webApp && npx tsc --noEmit
```
Si `tsc` se queja de `slug` en alguno de los tres, corregir al nombre real del campo. **No
silenciar con `any`.**

- [ ] **Step 3: Verificar servido y que no filtre borradores**

```bash
curl -s http://localhost:3000/sitemap.xml | grep -c "<url>"
```
Esperado: 4 estáticas + los publicados. **Contrastar contra la base**: el número de `/cursos/` en
el sitemap tiene que ser igual al de cursos con `status = 'published'`. Un curso en `draft` en el
sitemap es una fuga de contenido no publicado.

- [ ] **Step 4: Commit**

```bash
git add webApp/src/app/sitemap.ts
git commit -m "feat(seo): sitemap.xml desde la base, solo contenido publicado (E-01)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Metadata en las rutas públicas

**Files:**
- Modify: `webApp/src/app/layout.tsx` (bloque `metadata`)
- Modify: `webApp/src/app/(marketing)/cursos/page.tsx`
- Modify: `webApp/src/app/(marketing)/cursos/[slug]/page.tsx`
- Modify: `webApp/src/app/(marketing)/diario/page.tsx`
- Modify: `webApp/src/app/(marketing)/diario/[slug]/page.tsx`
- Modify: `webApp/src/app/(marketing)/guias/page.tsx`
- Modify: `webApp/src/app/(marketing)/guias/[slug]/page.tsx`
- Modify: `webApp/src/app/(marketing)/entrar/page.tsx`

**Interfaces:**
- Consumes: `getSiteUrl()` (Task 1), y en las dinámicas la misma función de carga que la página ya
  usa para su contenido.
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: `metadataBase` y plantilla de título en el layout raíz**

En `webApp/src/app/layout.tsx`, reemplazar el `export const metadata` existente por:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Humano Despierto — Escuela Holística",
    template: "%s — Humano Despierto",
  },
  description: "Una escuela para oficios sutiles del alma. Astrología, tarot, herbalismo y reiki por guías con linaje.",
};
```

Agregar `import { getSiteUrl } from "@/lib/server/site-url";`.

`metadataBase` es lo que vuelve absolutas las URLs de Open Graph; sin él Next emite un warning en
build y las URLs salen relativas, que en un preview de WhatsApp no resuelven.

- [ ] **Step 2: Metadata estático en las tres listas**

En `cursos/page.tsx`, `diario/page.tsx` y `guias/page.tsx`, agregar arriba del componente. **Nota:
el `title` no repite "Humano Despierto"** — lo agrega la plantilla del Step 1.

```ts
// cursos/page.tsx
export const metadata: Metadata = {
  title: "Cursos",
  description: "Tarot, astrología, herbalismo, reiki y magia. Cursos on-demand con guías de linaje.",
};
```

```ts
// diario/page.tsx
export const metadata: Metadata = {
  title: "Diario",
  description: "Escritos de las guías de la escuela sobre los oficios sutiles del alma.",
};
```

```ts
// guias/page.tsx
export const metadata: Metadata = {
  title: "Guías",
  description: "Quiénes enseñan en Humano Despierto y qué linaje traen.",
};
```

Cada archivo necesita `import type { Metadata } from "next";`.

- [ ] **Step 3: `generateMetadata` en las tres dinámicas**

Patrón para `cursos/[slug]/page.tsx` — **el `params` se usa de verdad**, que es justo la trampa
documentada en CLAUDE.md ("dynamic routes may discard their param"):

```ts
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Curso no encontrado" };
  return {
    title: course.title,
    description: course.subtitle ?? course.intro ?? undefined,
    alternates: { canonical: `/cursos/${slug}` },
    openGraph: {
      title: course.title,
      description: course.subtitle ?? course.intro ?? undefined,
      url: `/cursos/${slug}`,
      type: "website",
    },
  };
}
```

Repetir el mismo patrón, adaptado, en:
- `diario/[slug]/page.tsx` con `getPostBySlug(slug)` → `title: post.title`, descripción desde
  `excerpt`, canonical `/diario/${slug}`.
- `guias/[slug]/page.tsx` con `getTeacherBySlug(slug)` → `title: teacher.fullName`, descripción
  desde `bio`, canonical `/guias/${slug}`.

**Confirmar los nombres de campo reales** en cada tipo antes de escribir; no inventarlos.

Next deduplica la llamada dentro del mismo render, así que llamar al mismo loader en
`generateMetadata` y en el componente no duplica la consulta.

- [ ] **Step 4: `/entrar` fuera del índice**

```ts
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: true },
};
```

Una pantalla de login no aporta nada al índice y compite con la home por la marca.

- [ ] **Step 5: Verificar**

```bash
cd webApp && npx tsc --noEmit && npm run lint
```

Con el server levantado, confirmar que cada ruta trae su propio `<title>`:
```bash
for p in / /cursos /diario /guias /entrar; do
  printf '%s → ' "$p"
  curl -s "http://localhost:3000$p" | grep -o '<title>[^<]*</title>' | head -1
done
```
Esperado: cinco títulos **distintos**. Si dos coinciden, esa ruta no tomó su metadata.

Y una dinámica con dos slugs distintos, que es donde vive la trampa del `params` descartado:
```bash
curl -s http://localhost:3000/cursos/<slug-A> | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3000/cursos/<slug-B> | grep -o '<title>[^<]*</title>'
```
Esperado: **distintos**. Iguales = el `params` se está descartando.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/app
git commit -m "feat(seo): metadata por ruta publica + canonical + OG (E-01)

20 de 22 paginas compartian el title del layout raiz. Las dinamicas usan el
param de verdad — verificado con dos slugs distintos, que es exactamente la
trampa que CLAUDE.md documenta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Accesibilidad del acordeón de currículum

**Files:**
- Modify: `webApp/src/components/course/CurriculumAccordion.tsx`

**Interfaces:** ninguna nueva. Cambio interno del componente.

**Contexto:** medición de la auditoría — **2 ocurrencias** de `aria-*`/`role=`/`onKeyDown`/`tabIndex`
en todo el archivo. Es el componente por el que pasa toda persona que evalúa comprar un curso.

- [ ] **Step 1: Leer el archivo entero antes de tocarlo**

```bash
cd webApp && cat src/components/course/CurriculumAccordion.tsx
```
Identificar: qué elemento abre/cierra un módulo, cómo se guarda el estado abierto, y dónde se
pintan los glifos de estado (`states.set(lesson.id, ...)` en la línea 53).

- [ ] **Step 2: El disparador tiene que ser un `<button>`**

Si el que abre el módulo es un `<div onClick>`, cambiarlo a `<button type="button">`. Un `div` con
`onClick` **no recibe foco ni responde a Enter/Espacio** — es la causa raíz, y agregarle `tabIndex`
y `onKeyDown` a mano es reimplementar peor lo que el navegador ya hace.

```tsx
<button
  type="button"
  onClick={() => toggle(module.id)}
  aria-expanded={isOpen}
  aria-controls={`modulo-panel-${module.id}`}
  id={`modulo-trigger-${module.id}`}
  className={/* conservar las clases que ya tenía el elemento */}
>
```

Y el panel que se despliega:
```tsx
<div
  id={`modulo-panel-${module.id}`}
  role="region"
  aria-labelledby={`modulo-trigger-${module.id}`}
  hidden={!isOpen}
>
```

**Nota:** si el patrón actual es no renderizar el panel cuando está cerrado, mantener eso y omitir
`hidden` — `aria-controls` puede apuntar a un elemento ausente sin romper nada. No cambiar la
estrategia de renderizado, solo agregar la semántica.

- [ ] **Step 3: Rotular los glifos de estado**

Los glifos que salen de `states` (`preview`/`locked`/completado) transmiten información y hoy son
mudos para un lector de pantalla. Cada uno necesita texto:

```tsx
<span aria-hidden="true">{STATE_GLYPH[state]}</span>
<span className="sr-only">{STATE_LABEL[state]}</span>
```

con
```tsx
const STATE_LABEL: Record<LessonState, string> = {
  preview: "Vista previa gratuita",
  locked: "Requiere inscripción",
  completed: "Completada",
};
```
Ajustar las claves a las que el archivo ya usa. Si `globals.css` no define `.sr-only`, agregarla:

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

Los glifos **decorativos** (los que no cargan estado) llevan `aria-hidden="true"` y nada más.

- [ ] **Step 4: Verificar con teclado, que es la única prueba que vale**

```bash
cd webApp && npx tsc --noEmit && npm run lint
```

Después, en el navegador sobre `/cursos/<slug>`: **sin tocar el mouse**, Tab hasta el primer
módulo, Enter para abrir, Tab para recorrer las lecciones, Enter en una de vista previa.

Esperado: el foco se ve siempre, cada módulo abre con Enter **y con Espacio**, y el foco nunca
queda atrapado. Si el foco es invisible sobre el fondo `#0a0418`, agregar un `focus-visible` con el
lila `#c4b5fd` — un foco que no se ve es lo mismo que no tenerlo.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/components/course/CurriculumAccordion.tsx webApp/src/styles/globals.css
git commit -m "fix(a11y): el acordeon de curriculum es operable por teclado (X-01)

El disparador era un div con onClick: sin foco, sordo a Enter y Espacio.
Pasa a button con aria-expanded/aria-controls. Los glifos de estado dejan de
ser mudos — §4 los usa para transmitir informacion, asi que necesitan texto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Accesibilidad de las pestañas del player

**Files:**
- Modify: `webApp/src/components/player/LessonPlayer.tsx:275` (el `.map` de tabs) y el panel que renderiza

**Interfaces:** ninguna nueva.

**Contexto:** **1 sola ocurrencia** de `aria-*`/`role=`/`onKeyDown` en 300+ líneas. Las tabs son
`["modulos", "notas", "recursos"]` (línea 275) y el estado es `tab`.

- [ ] **Step 1: Envolver las tabs en un `tablist`**

```tsx
<div role="tablist" aria-label="Contenido de la lección">
  {(["modulos", "notas", "recursos"] as const).map((t) => (
    <button
      key={t}
      type="button"
      role="tab"
      id={`tab-${t}`}
      aria-selected={tab === t}
      aria-controls={`panel-${t}`}
      tabIndex={tab === t ? 0 : -1}
      onClick={() => setTab(t)}
      className={/* conservar las clases existentes */}
    >
      {TAB_LABEL[t]}
    </button>
  ))}
</div>
```

`tabIndex={-1}` en las no seleccionadas es intencional y es el patrón ARIA: el grupo de tabs es
**una sola parada** de Tab, y adentro se navega con flechas.

- [ ] **Step 2: Flechas izquierda/derecha**

En el contenedor `role="tablist"`:

```tsx
const TABS = ["modulos", "notas", "recursos"] as const;

function handleTabKeys(e: React.KeyboardEvent) {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  const i = TABS.indexOf(tab);
  const next = e.key === "ArrowRight"
    ? TABS[(i + 1) % TABS.length]
    : TABS[(i - 1 + TABS.length) % TABS.length];
  setTab(next);
  document.getElementById(`tab-${next}`)?.focus();
}
```
y `onKeyDown={handleTabKeys}` en el `tablist`. Extraer `TABS` a constante del módulo y usarla
también en el `.map` del Step 1, para que no haya dos listas que puedan divergir.

- [ ] **Step 3: Los paneles**

Cada panel de contenido:
```tsx
<div id={`panel-${t}`} role="tabpanel" aria-labelledby={`tab-${t}`} tabIndex={0}>
```

- [ ] **Step 4: El iframe de YouTube necesita título**

Buscar dónde se monta el player (`containerId` = `yt-player-${data.lessonId}`). Si la IFrame API
crea el `<iframe>`, pasar el título por `playerVars`/atributos del contenedor; si el iframe se
escribe en JSX, agregarle `title={data.lessonTitle}` (o el campo real). **Un iframe sin `title` es
un fallo de a11y de manual** y acá es el contenido principal de la pantalla.

- [ ] **Step 5: Verificar**

```bash
cd webApp && npx tsc --noEmit && npm run lint
```

En `/leccion/<id>` **sin mouse**: Tab hasta las tabs (una sola parada), flechas para cambiar,
Tab de nuevo para entrar al panel. El contenido que se muestra tiene que corresponder a la tab
marcada `aria-selected="true"`.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/components/player/LessonPlayer.tsx
git commit -m "fix(a11y): tabs del player con roles ARIA y navegacion por flechas (X-01)

Tambien title en el iframe de YouTube: era el contenido principal de la
pantalla y no tenia nombre accesible.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: `engines.node` y cabeceras de seguridad

**Files:**
- Modify: `webApp/package.json`
- Modify: `webApp/next.config.ts`

**Interfaces:** ninguna.

- [ ] **Step 1: Declarar el runtime (A-03)**

En `webApp/package.json`, después de `"private"`:
```json
  "engines": {
    "node": ">=22.0.0"
  },
```

**No se hace el upgrade de Node en esta tarea** — cambiar el runtime obliga a re-correr los 384
tests, el build y el harness, y eso es un ticket propio. Declarar el piso es lo que hace visible la
deuda; hoy nadie sabe contra qué runtime se probó esto.

- [ ] **Step 2: Cabeceras de seguridad (S-04)**

En `webApp/next.config.ts`:

```ts
import type { NextConfig } from "next";

/** S-04 de la auditoría. Sin CSP todavía: el player embebe YouTube y una CSP correcta necesita
 * `frame-src` afinado más una pasada de verificación real, que es un ticket propio. Estas cuatro
 * no tienen ese riesgo y hoy no hay ninguna. `/certificado/<código>` es público y embebible por
 * cualquiera, que es la razón concreta de `X-Frame-Options`. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verificar que el player sigue vivo**

```bash
curl -sI http://localhost:3000/ | grep -iE "x-frame-options|x-content-type|referrer-policy|permissions-policy"
```
Esperado: las cuatro.

**Y después abrir `/leccion/<id>` en el navegador y reproducir.** `X-Frame-Options: SAMEORIGIN`
controla que *a nosotros* nos embeban, no a quién embebemos nosotros — el player no debería verse
afectado, pero es exactamente el tipo de suposición que hay que mirar en vez de asumir.

- [ ] **Step 4: Commit**

```bash
git add webApp/package.json webApp/next.config.ts
git commit -m "chore(sec): engines.node y cabeceras de seguridad (A-03, S-04)

CSP queda afuera a proposito: el player embebe YouTube y una CSP correcta
necesita frame-src afinado mas verificacion real. Ticket propio.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: El botón muerto del checkout (C-02)

**Files:**
- Modify: `webApp/src/app/(app)/inscribirme/[curso]/page.tsx`

- [ ] **Step 1: Encontrarlo**

```bash
cd webApp && grep -n 'href="#"' -r src/
```

- [ ] **Step 2: Darle destino o sacarlo**

"Pedir conversación" está en la pantalla donde alguien decide inscribirse — el peor lugar posible
para un botón muerto. El destino correcto **depende del PO**, así que la acción por defecto de esta
tarea es **sacar el elemento**, no inventarle un destino.

Un botón ausente es honesto; uno que no hace nada le enseña a la usuaria que la interfaz miente.

Si al ejecutar esto el PO ya definió destino, usarlo. Si no: borrar el elemento y dejar la nota en
el commit.

- [ ] **Step 3: Verificar que no quedan más**

```bash
cd webApp && grep -rn 'href="#"' src/ ; echo "exit=$?"
```
Esperado: sin resultados.

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add webApp/src/app/\(app\)/inscribirme
git commit -m "fix: sacar el boton muerto Pedir conversacion del checkout (C-02)

Sin destino definido por el PO. Un boton ausente es honesto; uno que no hace
nada, en la pantalla donde alguien decide inscribirse, ensena que la interfaz
miente. Vuelve cuando tenga destino.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: `check-seo.sh` — que esto no se vuelva a romper

**Files:**
- Create: `webApp/scripts/check-seo.sh`

**Interfaces:**
- Consumes: la app servida en `$BASE`.
- Produces: un verificador para el gate, junto a `check-adr004.sh`.

**Por qué:** es la lección de T-014 aplicada a SEO. Un invariante que se verifica a mano se rompe
la próxima vez que alguien agrega una ruta. Y se verifica sobre **HTML servido**, que es donde
Googlebot lo lee, no sobre el código.

- [ ] **Step 1: Escribir el script**

```bash
#!/usr/bin/env bash
# E-01 · Toda ruta publica tiene su propio <title>, y las privadas estan fuera del indice.
#
# Por que sobre HTTP y no sobre el codigo: `generateMetadata` puede existir y aun asi no
# aplicarse — el caso real de este proyecto es una ruta dinamica que descarta su `params` y
# sirve el mismo contenido para todo slug (CLAUDE.md lo documenta como trampa conocida). Eso
# se ve en el HTML servido y no se ve en el codigo.
#
# Uso:  bash scripts/check-seo.sh [base_url]     (default http://localhost:3000)
set -uo pipefail
BASE=${1:-http://localhost:3000}
fail=0

title_of() { curl -s "$BASE$1" | grep -o '<title>[^<]*</title>' | head -1 | sed 's/<[^>]*>//g'; }

echo "== titles unicos por ruta publica =="
declare -A seen
for p in / /cursos /diario /guias /entrar; do
  t=$(title_of "$p")
  if [ -z "$t" ]; then
    echo "  FALLA  $p — sin <title>"; fail=1; continue
  fi
  if [ -n "${seen[$t]:-}" ]; then
    echo "  FALLA  $p — comparte title con ${seen[$t]}: '$t'"; fail=1
  else
    seen[$t]="$p"; echo "  ok     $p — '$t'"
  fi
done

echo "== robots.txt =="
r=$(curl -s "$BASE/robots.txt")
for d in /panel/ /leccion/ /circulo/ /inscribirme/; do
  if grep -q "Disallow: $d" <<<"$r"; then echo "  ok     Disallow $d"
  else echo "  FALLA  falta Disallow $d"; fail=1; fi
done
grep -q "Sitemap:" <<<"$r" && echo "  ok     linea Sitemap" || { echo "  FALLA  sin linea Sitemap"; fail=1; }

echo "== sitemap.xml =="
n=$(curl -s "$BASE/sitemap.xml" | grep -c "<loc>")
if [ "$n" -ge 4 ]; then echo "  ok     $n URLs"; else echo "  FALLA  solo $n URLs"; fail=1; fi
# Ninguna ruta privada puede aparecer en el sitemap.
for d in /panel /leccion /circulo /inscribirme; do
  if curl -s "$BASE/sitemap.xml" | grep -q "<loc>[^<]*$d"; then
    echo "  FALLA  el sitemap expone $d"; fail=1
  else echo "  ok     sitemap sin $d"; fi
done

[ "$fail" -eq 0 ] && echo "SEO OK" || echo "SEO CON FALLAS"
exit "$fail"
```

- [ ] **Step 2: Correrlo y que dé verde**

```bash
cd webApp && bash scripts/check-seo.sh http://localhost:3000
```
Esperado: `SEO OK`, exit 0. **Si falla, el arreglo va en el código, no en el script.**

- [ ] **Step 3: Probar que el verificador sabe fallar**

Comentar el `title` de `/cursos` momentáneamente, correr el script, confirmar que reporta FALLA, y
revertir. **Un verificador que nunca se vio en rojo no prueba nada** — es la misma disciplina que
los tests de mutación de `supabase/`, que revierten una capa por vez.

- [ ] **Step 4: Commit**

```bash
chmod +x webApp/scripts/check-seo.sh
git add webApp/scripts/check-seo.sh
git commit -m "test(seo): check-seo.sh verifica titles, robots y sitemap sobre HTML servido

Cuarto verificador, al lado de check-adr004.sh. Verificado en rojo antes de
darlo por bueno.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Gate final del plan

Los cuatro verificadores en verde, más los dos del webApp:

```bash
cd webApp/supabase && npm test                       # 384 tests
bash webApp/supabase/harness/b1-postgrest-attacks.sh
bash webApp/scripts/check-adr004.sh http://localhost:3000
bash webApp/scripts/check-seo.sh   http://localhost:3000
cd webApp && npx tsc --noEmit && npm run lint
```

Y el recorrido manual que ningún verificador puede hacer — es la lección de `4dcfcba`, el bug donde
ninguna card linkeaba al detalle y **todo daba verde igual**: 200 en todas las páginas, datos
correctos, tests pasando. Hacía falta navegar.

**Sólo con teclado**, sin tocar el mouse: `/` → `/cursos` → abrir un curso → abrir un módulo del
acordeón → `/leccion/<id>` → cambiar de tab con flechas.

## Fuera de alcance, y por qué

- **A-01, A-02, D-01** — necesitan las cuentas del PO (Supabase, YouTube) y una instancia real.
- **S-01** — decisión de producto del PO entre intervalos o aceptación explícita.
- **S-02 rate limiting** — ticket propio; toca 7 Server Actions y necesita decidir dónde vive el
  contador.
- **S-03 D-06 OpenAPI** — se verifica y se cierra contra la instancia real, no contra PGlite.
- **E-02 `opengraph-image.tsx`** — genera un PNG desde JSX. Necesita confirmación explícita del PO
  de que no viola §4 en espíritu.
- **O-01 observabilidad** — hay que elegir proveedor. Decisión del PO.
- **CSP** — ver Task 7 Step 2.

## Deuda que este plan descubre

**D-10 · `webApp` no tiene runner de tests.** Ninguno: ni vitest, ni jest, ni playwright. Los 384
tests están todos en `supabase/`. El frontend se sostiene con `tsc`, `lint`, dos scripts sobre HTTP
y navegación manual — que es cómo `4dcfcba` (ninguna card linkeaba al detalle) sobrevivió a todos
los verificadores. **Elegir runner es decisión del PO** y por eso este plan no lo hace: agregarlo de
prepo es la clase de cambio estructural que corresponde a un ADR, no a una tarea de auditoría.

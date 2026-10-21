# T-027 · Ficha de curso completa · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la ficha pública de curso diga lo que Udemy dice — qué vas a aprender, qué necesitás saber, cuánto dura de verdad — y **cerrar S-05** en la misma pasada.

**Architecture:** Una migración agrega cinco columnas a `courses` y **un guard trigger que cierra S-05** sobre toda su superficie de texto servida a `anon`. Los agregados (lecciones, horas, inscriptas) se **derivan en la consulta**, nunca se guardan. La UI suma secciones a la ficha existente y campos al formulario docente.

**Tech Stack:** Postgres 17 (Supabase), PGlite para tests, Next.js 16 App Router, React 19, Zod, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-09-09-paridad-udemy-design.md` (T-027) · `docs/superpowers/specs/2026-09-09-auditoria-pre-produccion.md` (S-05)

## Global Constraints

- **Migración:** archivo `20260909120000_0023_course_landing_fields.sql`. El **nombre entero** lo fija este plan, no sólo el número — Supabase indexa por el timestamp del prefijo, y el timestamp tiene que ascender junto con el número. Última aplicada hoy: `20260811210000` (0022).
- **R-1 · Grants como whitelist.** Toda columna nueva se agrega **a mano** a `0003_privileges.sql`. Una columna que no se agrega, no existe para el cliente.
- **R-3 · ADR-009 en las dos mitades.** `text_has_locator` en `CHECK` (forma) **y** `body_has_known_locator` en guard trigger (coincidencia exacta). La segunda no puede ir en un `CHECK`: lee otras tablas.
- **R-4 · `status`, `featured`, `published_at` y `teacher_id` fuera de los grants del cliente.** No se tocan.
- **ADR-004:** ninguna pantalla promete fecha, cohorte ni clase en vivo. `check-adr004.sh` lo verifica.
- **§4:** sin emojis ni raster. Glifos Unicode; informativos con `aria-label`/`.sr-only`, decorativos con `aria-hidden`.
- **Money/tiempo enteros**: `price_cents`, `duration_seconds`. Formatear es de la vista.
- **TypeScript strict**, sin `any`. Comentarios sólo para el POR QUÉ.
- Verificadores: `cd webApp/supabase && npm test` · `b1-postgrest-attacks.sh` · `check-adr004.sh` (**con `COOKIE=`**) · `check-seo.sh` · `tsc` + `lint`.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `webApp/supabase/migrations/20260909120000_0023_course_landing_fields.sql` | **Crear.** 5 columnas + CHECKs de forma + **guard de S-05**. |
| `webApp/supabase/migrations/20260805120200_0003_privileges.sql` | **Modificar.** Grants de las 5 columnas nuevas (R-1). |
| `webApp/supabase/tests/course-landing.test.mjs` | **Crear.** Mutación: S-05 y los CHECKs nuevos. |
| `webApp/supabase/tests/seed.mjs` | **Modificar.** Sembrar los campos nuevos en `courseA`. |
| `webApp/supabase/harness/b1-postgrest-attacks.sh` | **Modificar.** Ataque de S-05 sobre HTTP (R-6). |
| `webApp/src/lib/server/courses.ts` | **Modificar.** `CourseDetail` suma campos + agregados derivados. |
| `webApp/src/lib/validation/teacher.ts` | **Modificar.** Zod de los campos nuevos. |
| `webApp/src/app/(marketing)/cursos/[slug]/page.tsx` | **Modificar.** Secciones nuevas. |
| `webApp/src/components/teacher/CourseForm.tsx` | **Modificar.** Campos nuevos. |
| `webApp/src/app/(app)/panel/docente/actions.ts` | **Modificar.** Persistir los campos nuevos. |

---

## Task 1: Migración — columnas nuevas y el guard de S-05

**Files:**
- Create: `webApp/supabase/migrations/20260909120000_0023_course_landing_fields.sql`
- Modify: `webApp/supabase/migrations/20260805120200_0003_privileges.sql` (bloque `courses`, ~línea 35-49)

**Interfaces:**
- Produces: columnas `learning_objectives text[]`, `prerequisites text[]`, `description text`, `language char(2)`, `promo_video_id text` en `public.courses`; trigger `courses_locator_guard`.

- [ ] **Step 1: Escribir la migración**

```sql
-- T-027 · Campos de la ficha de curso + S-05.
--
-- POR QUE EL GUARD VA EN ESTE ARCHIVO Y NO EN UNO PROPIO.
-- S-05 (auditoria 2026-09-09) es una fuga que YA EXISTE: `body_has_known_locator` -la mitad de
-- ADR-009 que hace coincidencia EXACTA contra `lessons.video_id` y `lesson_resources`- se aplico
-- a `campus_posts` (0016) y `diario_posts` (0018/0020), y nunca a `courses`. Reproducido: una
-- docente escribe el video_id real de una leccion paga en `courses.intro` desde su formulario
-- normal, y sale a `anon` sin sesion por PostgREST.
--
-- Esta migracion agrega TRES campos de texto mas a esa misma superficie servida a `anon`. Sumar
-- campos a una superficie con esta fuga la agranda, asi que el guard entra ACA: el ticket que
-- ensancha el agujero es el que lo tapa.
--
-- POR QUE TRIGGER Y NO CHECK. `body_has_known_locator` consulta otras tablas: un CHECK no puede
-- llevar subconsulta y ademas debe ser inmutable. Mismo patron exacto que `guard_diario_posts()`.
--
-- POR QUE LAS DOS MITADES Y NO SOLO LA EXACTA. `text_has_locator` (forma) atrapa URLs que todavia
-- no son de nadie; `body_has_known_locator` atrapa el id de 11 caracteres que no tiene forma de
-- URL. Ninguna cubre a la otra — es la leccion que le costo a T-022 un rechazo de QA.

alter table public.courses
  add column learning_objectives text[]  not null default '{}',
  add column prerequisites       text[]  not null default '{}',
  add column description         text,
  add column language            char(2) not null default 'es',
  add column promo_video_id      text;

-- `language`: dos letras minusculas. Cerrado por dominio, no por texto libre.
alter table public.courses
  add constraint courses_language_format check (language ~ '^[a-z]{2}$');

-- Mismo CHECK de formato que `lessons.video_id` (0001): el id de YouTube es exactamente
-- [A-Za-z0-9_-]{11}. Pegar la URL entera falla aca, igual que en lecciones.
alter table public.courses
  add constraint courses_promo_video_id_format
    check (promo_video_id is null or promo_video_id ~ '^[A-Za-z0-9_-]{11}$');

-- Mitad 1 de ADR-009 (forma), igual que 0008 hizo con el resto de las columnas de `courses`.
alter table public.courses
  add constraint courses_description_no_locator
    check (not public.text_has_locator(description)),
  add constraint courses_learning_objectives_no_locator
    check (not public.array_has_locator(learning_objectives)),
  add constraint courses_prerequisites_no_locator
    check (not public.array_has_locator(prerequisites));

-- ---------------------------------------------------------------- S-05 · mitad 2, exacta
-- Cubre TODA la superficie de `courses` legible por `anon`, no solo lo que agrega T-027: la
-- fuga preexistente esta en `intro`, `title` y `subtitle`.
--
-- SIN bypass de service_role, a proposito. En `guard_diario_posts` el bypass existe para que la
-- moderacion pueda actuar sobre un post ya escrito. Aca no hay nada equivalente: publicar un
-- curso no reescribe su prosa, y un localizador pago en el catalogo publico es igual de grave lo
-- escriba quien lo escriba. Menos superficie, menos que razonar.
create or replace function public.guard_courses_locator()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  campo text;
begin
  foreach campo in array array[
    coalesce(new.title, ''), coalesce(new.title_em, ''), coalesce(new.subtitle, ''),
    coalesce(new.intro, ''), coalesce(new.description, ''), coalesce(new.slug, '')
  ] loop
    if public.body_has_known_locator(campo) then
      raise exception 'un campo publico de courses contiene un localizador de contenido pago'
        using errcode = '42501';
    end if;
  end loop;

  foreach campo in array (coalesce(new.learning_objectives, '{}') || coalesce(new.prerequisites, '{}')) loop
    if public.body_has_known_locator(campo) then
      raise exception 'un campo publico de courses contiene un localizador de contenido pago'
        using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;

create trigger courses_locator_guard
  before insert or update on public.courses
  for each row execute function public.guard_courses_locator();
```

- [ ] **Step 2: Grants (R-1)**

En `20260805120200_0003_privileges.sql`, bloque `courses`, agregar las cinco columnas a los tres
grants. **`select` las cinco; `insert`/`update` también las cinco** — son datos que la docente
escribe. `status`/`featured`/`published_at`/`teacher_id` no se tocan.

```sql
grant select (id, slug, title, title_em, subtitle, intro, discipline, level, price_cents,
              currency, roman_num, moon_glyph, includes, teacher_id, status, featured,
              published_at, created_at, updated_at,
              learning_objectives, prerequisites, description, language, promo_video_id)
  on public.courses to anon, authenticated;
```
y lo análogo en el `grant insert (...)` y el `grant update (...)` (sin `teacher_id` en el update,
como ya está).

- [ ] **Step 3: Aplicar y verificar que el guard existe**

```bash
cd webApp && npx supabase migration up
docker exec supabase_db_webApp psql -U postgres -c "\d public.courses" | grep -E "learning_objectives|prerequisites|description|language|promo_video_id|courses_locator_guard"
```

- [ ] **Step 4: Reproducir S-05 y confirmar que AHORA falla**

Es el paso que da valor a todo lo demás. Con el `video_id` real del seed:

```bash
vid=$(docker exec supabase_db_webApp psql -U postgres -t -A -c "select video_id from public.lessons where video_id is not null limit 1;")
tid=$(docker exec supabase_db_webApp psql -U postgres -t -A -c "select id from public.profiles where role='teacher' limit 1;")
docker exec supabase_db_webApp psql -U postgres -c "
set local role authenticated;
set local request.jwt.claims = '{\"sub\":\"$tid\",\"user_role\":\"teacher\"}';
insert into public.courses (slug, title, intro, discipline, level, teacher_id)
values ('fuga-test-t027', 'Prueba', 'Mira: $vid', 'tarot', 'inicial', '$tid');"
```
Esperado: **ERROR 42501**. Antes de esta migración el mismo comando daba `INSERT 0 1`.

Repetir con el localizador en `description` y en `learning_objectives` — el guard tiene dos bucles
distintos y hay que ver fallar los dos, no uno.

- [ ] **Step 5: Commit**

```bash
git add webApp/supabase/migrations
git commit -m "feat(db): campos de ficha de curso + guard de localizadores (T-027, S-05)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Tests de mutación

**Files:**
- Create: `webApp/supabase/tests/course-landing.test.mjs`
- Modify: `webApp/supabase/tests/seed.mjs`

**Interfaces:**
- Consumes: `bootDatabase`, `asUser`, `attempt` de `../harness/db.mjs`; `seed`, `ID`, `SECRET` de `./seed.mjs`.

- [ ] **Step 1: Escribir el test, siguiendo el estándar de `campus-posts.test.mjs`**

Cada caso ejecuta el DML del atacante con `SET ROLE` y claims, y afirma **sobre el SQLSTATE**.

```js
// T-027 · Ficha de curso + S-05 — TEST DE MUTACION REAL.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';

const asTeacherA = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);

const insertCourse = (db, cols, vals) =>
  asTeacherA(db, () =>
    attempt(
      db,
      `insert into public.courses (slug, title, discipline, level, teacher_id, ${cols})
       values ('t027-x', 'Prueba', 'tarot', 'inicial', $1, ${vals}) returning id`,
      [ID.teacherA],
    ),
  );

describe('T-027 · campos de ficha + S-05', () => {
  let db;
  before(async () => { ({ db } = await bootDatabase()); await seed(db); });
  after(async () => db?.close());

  describe('S-05 · coincidencia exacta contra localizadores pagos', () => {
    test('el video_id real en `intro` es rechazado', async () => {
      const r = await insertCourse(db, 'intro', `'Mira esto: ${SECRET.videoId}'`);
      assert.equal(r.ok, false, 'el video_id paso a un campo servido a anon');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el video_id real en `description` es rechazado', async () => {
      const r = await insertCourse(db, 'description', `'Mira esto: ${SECRET.videoId}'`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el drive_file_id real en un objetivo es rechazado', async () => {
      const r = await insertCourse(db, 'learning_objectives', `array['Bajar ${SECRET.driveFileId}']`);
      assert.equal(r.ok, false, 'el bucle de arrays del guard no cubre learning_objectives');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('prosa legitima con la palabra video NO se bloquea', async () => {
      const r = await insertCourse(db, 'description', `'Cada leccion es un video corto.'`);
      assert.equal(r.ok, true, 'falso positivo: el guard bloquea prosa normal');
    });
  });

  describe('CHECKs de dominio', () => {
    test('promo_video_id no acepta una URL entera', async () => {
      const r = await insertCourse(db, 'promo_video_id', `'https://youtu.be/dQw4w9WgXcQ'`);
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('promo_video_id acepta un id de 11 caracteres', async () => {
      const r = await insertCourse(db, 'promo_video_id', `'aBcD1234_-x'`);
      assert.equal(r.ok, true);
    });

    test('language rechaza un valor de 3 letras', async () => {
      const r = await insertCourse(db, 'language', `'esp'`);
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });
});
```

**Nota sobre el slug repetido:** `slug` es `unique`, así que los casos que esperan `ok: true`
chocarían entre sí. Al escribir el test, dar a cada caso un slug propio (`t027-a`, `t027-b`, …) —
parametrizar `insertCourse` con el slug es lo más simple. **No dejarlo como está arriba.**

- [ ] **Step 2: Verificar que los tests fallan ANTES de que el guard exista**

```bash
cd webApp/supabase
# Comentar el `create trigger courses_locator_guard` en la migración, recrear la base y correr:
npm test -- --test-name-pattern="S-05"
```
Esperado: los tres casos de S-05 **fallan**. Restaurar el trigger después.

Sin este paso el verde no distingue "protegido" de "el ataque estaba mal escrito" — es la
disciplina que el resto de la suite ya sigue.

- [ ] **Step 3: Correr la suite completa**

```bash
cd webApp/supabase && npm test 2>&1 | tail -8
```
Esperado: 384 + los nuevos, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/tests
git commit -m "test(db): mutacion de S-05 y de los CHECKs de T-027

Verificados en rojo con el trigger comentado antes de darlos por buenos.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: El ataque de S-05 sobre HTTP (R-6)

**Files:**
- Modify: `webApp/supabase/harness/b1-postgrest-attacks.sh`

- [ ] **Step 1: Leer el archivo y copiar el patrón de un ataque existente**

```bash
cd webApp/supabase && grep -n "^attack\|^  ok\|^  FALLA" harness/b1-postgrest-attacks.sh | head -20
```
Seguir la forma que el script ya usa. No inventar una nueva.

- [ ] **Step 2: Sumar el ataque**

Como docente autenticada, `POST /rest/v1/courses` con el `video_id` real del seed en `intro`.
Esperado: **rechazo**. Es el mismo ataque del test de mutación, pero **sobre PostgREST** — que es
la superficie que PGlite no ejercita (A-01 de la auditoría).

- [ ] **Step 3: Correr el harness**

```bash
bash webApp/supabase/harness/b1-postgrest-attacks.sh 2>&1 | tail -6
```
Esperado: `B-1 OK`.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/harness
git commit -m "test(b1): ataque de S-05 sobre PostgREST real

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Los agregados derivados en `courses.ts`

**Files:**
- Modify: `webApp/src/lib/server/courses.ts` (`CourseDetail`, `getCourseBySlug`)

**Interfaces:**
- Produces: `CourseDetail` suma `learningObjectives: string[]`, `prerequisites: string[]`,
  `description: string | null`, `language: string`, `promoVideoId: string | null`,
  `studentCount: number`. Ya existen `lessonCount` y `totalDurationSeconds`.

- [ ] **Step 1: Leer `getCourseBySlug` entero**

```bash
cd webApp && sed -n '160,240p' src/lib/server/courses.ts
```
Ver cómo se arman hoy `lessonCount` y `totalDurationSeconds` — los agregados nuevos siguen ese
mismo camino, no uno paralelo.

- [ ] **Step 2: Sumar las columnas al `select` y al mapeo**

Agregar `learning_objectives, prerequisites, description, language, promo_video_id` al `select` y
al tipo `CourseDetailRow`, y mapearlos en el objeto devuelto (`snake_case` → `camelCase`, como el
resto).

- [ ] **Step 3: `studentCount` derivado, no guardado**

```ts
// Derivado, nunca una columna: `student_count` es mentira en cuanto alguien se da de baja.
// `head: true` pide solo el conteo — no trae filas.
const { count } = await supabase
  .from("enrollments")
  .select("id", { count: "exact", head: true })
  .eq("course_id", row.id)
  .eq("status", "active");
```

**Verificar que `enrollments` es legible en este contexto.** Si RLS impide a `anon` contar
inscripciones ajenas —que es lo probable y lo correcto— el conteo tiene que salir por
`service_role` o por una función `security definer` que devuelva **sólo el número**. No relajar
RLS: exponer *cuántas* alumnas hay es distinto de exponer *quiénes*, y sólo lo primero es
aceptable.

- [ ] **Step 4: Verificar**

```bash
cd webApp && npx tsc --noEmit && npm run lint
curl -s http://localhost:3000/cursos/tarot-iniciatico -o /dev/null -w "%{http_code}\n"
```

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/server/courses.ts
git commit -m "feat(cursos): la ficha trae objetivos, requisitos e inscriptas derivadas (T-027)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Las secciones nuevas en la ficha

**Files:**
- Modify: `webApp/src/app/(marketing)/cursos/[slug]/page.tsx`

- [ ] **Step 1: "Lo que vas a aprender" y "Requisitos"**

Seguir el patrón que la página ya usa para `includes` (`SectionDivider label="Qué recibes"` +
lista). **Cada sección se omite entera si su array está vacío** — nada de encabezados huérfanos.

Los glifos de viñeta van `aria-hidden` (§4, R-7): son decorativos, el texto ya está.

- [ ] **Step 2: Descripción larga**

Debajo de `intro`, partida en párrafos con el mismo `split(/\n{2,}/)` que usan
`diario/[slug]` y `guias/[slug]`. No inventar un tercer método.

- [ ] **Step 3: Ficha técnica**

Idioma, duración total, nº de lecciones, inscriptas y "última actualización" (`updated_at`).
Reusar `StatBlock`, que ya está en esta página. **`formatTotalDuration` ya existe** — no escribir
otro formateador.

**ADR-004:** "última actualización" es una fecha **pasada**, no una fecha de inicio. Redactarla
sin ambigüedad ("Actualizado en marzo de 2026") y confirmar con `check-adr004.sh`.

- [ ] **Step 4: Video promocional**

Se ve **sin inscripción**. Un `<iframe>` de `youtube-nocookie.com` con `title` (X-01) alcanza —
**no montar el `LessonPlayer`**, que arrastra progreso, notas y capítulos que acá no aplican.
Se omite entero si `promoVideoId` es `null`.

- [ ] **Step 5: Verificar**

```bash
cd webApp && npx tsc --noEmit && npm run lint
bash scripts/check-seo.sh http://localhost:3000
COOKIE="<cookie>" bash scripts/check-adr004.sh http://localhost:3000
```

Y **abrir la página en el navegador**: un curso con los campos cargados y otro sin ellos. El
segundo no puede mostrar secciones vacías. Es la lección de `4dcfcba` — los verificadores no
detectan una sección huérfana.

- [ ] **Step 6: Commit**

```bash
git add "webApp/src/app/(marketing)/cursos/[slug]/page.tsx"
git commit -m "feat(cursos): objetivos, requisitos, descripcion y video promocional (T-027)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: El formulario docente

**Files:**
- Modify: `webApp/src/lib/validation/teacher.ts` (`courseFormSchema`)
- Modify: `webApp/src/components/teacher/CourseForm.tsx`
- Modify: `webApp/src/app/(app)/panel/docente/actions.ts`

- [ ] **Step 1: Zod**

Sumar al `courseFormSchema`, con `noLocator` en todos los de texto — son la traducción legible del
`CHECK`, y si fueran más permisivos la docente vería un `23514` crudo:

```ts
description: noLocator(z.string().trim().max(8000).optional().or(z.literal("")), "descripción"),
learningObjectives: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "qué vas a aprender"),
prerequisites: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "requisitos"),
language: z.string().trim().toLowerCase().regex(/^[a-z]{2}$/, "El idioma son 2 letras (ej: es).").default("es"),
promoVideoId: z
  .string().trim()
  .regex(/^[A-Za-z0-9_-]{11}$/, "Es el id del video (11 caracteres), no la URL entera.")
  .optional().or(z.literal("")),
```

**Los dos arrays reusan `includesToArray`** (una línea = un ítem). Ese helper ya existe y ya es el
contrato que la docente conoce del campo "qué incluye". No inventar otro separador.

**Lo que Zod NO puede cubrir:** la coincidencia exacta de S-05 necesita leer `lessons`, así que la
única defensa real es el guard de la DB. El Server Action tiene que **atrapar el `42501` y
traducirlo** a un mensaje legible, o la docente ve un error crudo del motor.

- [ ] **Step 2: Los campos en el formulario**

Seguir el `inputClass` y la estructura de label que el archivo ya usa. Los dos arrays y la
descripción son `<textarea>`; el placeholder de los arrays dice **"uno por línea"**.

- [ ] **Step 3: Persistir en el action**

Leer los campos nuevos del `formData`, mapear `""` → `null` para los de texto (como ya hace con
`subtitle`/`intro`), y `includesToArray` para los dos arrays.

- [ ] **Step 4: Traducir el 42501 del guard**

```ts
// El guard de S-05 lo levanta la DB, no Zod: Zod no puede leer `lessons` para saber si un id de
// 11 caracteres es un video real del catalogo. Sin esta traduccion la docente ve un error crudo.
if (error?.code === "42501") {
  return { error: "Alguno de los campos públicos contiene un identificador de contenido pago. Sacalo antes de guardar." };
}
```
Ajustar a la forma de retorno de error que el action ya usa.

- [ ] **Step 5: Verificar a mano, que es lo único que prueba esto**

`npx tsc --noEmit && npm run lint`, y después **en el navegador**, como docente:
1. Cargar un curso con objetivos y requisitos → se guardan y se ven en la ficha.
2. Pegar una URL de YouTube entera en el video promocional → error legible de Zod.
3. **Pegar el `video_id` real de una lección del catálogo en la descripción** → error legible, no
   un `42501` crudo. Ése es el camino que S-05 abrió y el que hay que ver cerrado desde la UI.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/validation/teacher.ts webApp/src/components/teacher/CourseForm.tsx "webApp/src/app/(app)/panel/docente/actions.ts"
git commit -m "feat(docente): campos de ficha en el formulario de curso (T-027)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Gate final

```bash
cd webApp/supabase && npm test
bash webApp/supabase/harness/b1-postgrest-attacks.sh
COOKIE="<cookie>" bash webApp/scripts/check-adr004.sh http://localhost:3000
bash webApp/scripts/check-seo.sh http://localhost:3000
cd webApp && npx tsc --noEmit && npm run lint
```

Los cinco en verde, **y el recorrido a mano**: ficha con todos los campos, ficha sin ninguno
(nada huérfano), y el intento de fuga desde el formulario docente rechazado con mensaje legible.

## Criterios de la spec, y dónde los cierra este plan

| Criterio T-027 | Tarea |
|---|---|
| 1 · objetivos, requisitos, descripción, idioma, duración, lecciones, inscriptas; vacíos se omiten | 4, 5 |
| 2 · video promocional sin inscripción, sin player paralelo | 5 |
| 3 · bio de la guía con link a `/guias/[slug]` | **ya existe** — `CourseDetail.teacherBio` está en el tipo. Verificar que la página lo renderiza; si no, sumarlo en la Tarea 5. |
| 4 · última actualización desde `updated_at` | 5 |
| 5 · la docente edita todo, arrays como lista | 6 |
| 6 · los agregados coinciden con la base | 4 |
| **S-05** (auditoría) | 1, 2, 3 |

## Riesgo declarado

`intro` hoy hace de descripción. Este plan **no migra datos**: `description` nace `null` y `intro`
queda intacta. La ficha muestra `intro` como párrafo de portada y `description` debajo si existe.
Nadie pierde texto y ninguna ficha existente cambia de aspecto. Si el PO prefiere consolidar,
es un ticket propio con su propia migración de datos.

# T-036 · Los guards prueban también su camino legítimo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ningún guard trigger pueda hacer inalcanzable la operación que la aplicación necesita, y que un test lo verifique — incluido el aviso automático cuando aparece un trigger nuevo sin su caso.

**Architecture:** Un test nuevo (`guard-reachability.test.mjs`) con un caso escrito a mano por cada trigger, afirmando que la operación **legítima pasa**. Encima, una meta-aserción que enumera los triggers desde `pg_trigger` y falla si aparece uno que nadie declaró. Los tests de ataque existentes prueban que lo prohibido no pasa; éste prueba que lo permitido sí.

**Tech Stack:** Postgres 17 (Supabase) · PGlite 0.5 · `node --test` (sin framework).

**Spec:** `docs/superpowers/specs/2026-09-10-adr-011-guard-triggers.md` · Autoridad: **ADR-011** en `engram/02_architecture.md`

---

## AVISO AL EJECUTOR — dos correcciones a la spec, medidas hoy

La spec se escribió antes de T-035 y dice **12 guards**. Medido el 2026-09-10 contra la base real:

**Son 17 con `guard` en el nombre, en 11 tablas** — T-035 agregó seis.

**Y hay un trigger que impone un invariante y NO se llama `guard`:** `lesson_progress_monotonic`
(de `0009`, el tope de tasa del reloj). Puede bloquear una operación perfectamente legítima —que el
progreso avance— y un filtro por nombre lo dejaría afuera.

**Consecuencia de diseño, y es la decisión central de este plan:** la meta-aserción **no filtra por
nombre**. Enumera *todos* los triggers no internos y exige que cada uno esté en la lista de casos
**o** en una lista de exentos justificada. Los `*_set_updated_at` van exentos porque estampan un
timestamp y no tienen ningún `raise` — no pueden bloquear nada.

Filtrar por `like '%guard%'` habría dejado un agujero del mismo tipo que ADR-010 vino a cerrar:
cobertura que depende de cómo alguien nombró algo.

## Global Constraints

- **Este ticket no crea migraciones... salvo que encuentre un bug.** Si un caso falla, es un bug
  vivo y se arregla acá, con su migración. El nombre sería
  `20260910120000_0026_<lo-que-corresponda>.sql` — timestamp posterior a `20260910110000` (0025).
- **Toda migración que crea funciones termina con `revoke execute on all functions in schema public
  from public;`** — regla de `0005:153` / `0006:233`.
- **No se relaja ningún guard para que un caso pase.** Si el camino legítimo está bloqueado, la
  pregunta es por qué la app necesita esa operación, no cómo apagar la defensa.
- **Verificadores del gate:** `cd webApp/supabase && npm test` · `bash webApp/supabase/harness/b1-postgrest-attacks.sh` · `bash webApp/scripts/check-adr004.sh <url>` (con `COOKIE=`) · `bash webApp/scripts/check-seo.sh <url>`.
- **Sin comentarios salvo que el POR QUÉ no sea obvio.**
- Base de partida: **428 tests**, 24 migraciones, última `20260910110000_0025`.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `webApp/supabase/tests/guard-reachability.test.mjs` | **Crear.** Un caso por trigger + la meta-aserción. Archivo propio: no es un test de ataque y mezclarlo con los que sí lo son confunde qué prueba qué. |
| `webApp/supabase/tests/seed.mjs` | **Modificar sólo si hace falta.** El caso de `certificates_guard_insert` necesita un curso con todas sus lecciones completas por una alumna. |
| `webApp/supabase/migrations/20260910120000_0026_*.sql` | **Crear sólo si un caso falla.** |

---

## Task 1: El esqueleto y la meta-aserción

**Files:**
- Create: `webApp/supabase/tests/guard-reachability.test.mjs`

**Interfaces:**
- Consumes: `bootDatabase`, `asUser`, `attempt` de `../harness/db.mjs` · `seed`, `ID`, `SECRET` de `./seed.mjs`.
- Produces: la constante `CASOS` (mapa `trigger → descripción`), que el Task 2 llena.

**Por qué la meta-aserción va primero:** define el contrato. Escrita después, la tentación es
ajustarla a los casos que uno ya escribió en vez de al revés.

- [ ] **Step 1: Escribir el archivo con la meta-aserción y CERO casos**

```js
// ADR-011 · Un guard trigger tambien se prueba por el lado LEGITIMO.
//
// POR QUE EXISTE. Los tests de ataque prueban que lo prohibido no pasa. Ninguno prueba que lo
// permitido si. Esa mitad faltante dejo pasar el mismo bug DOS VECES:
//
//   0017 · el guard de inmutabilidad de `certificates` rechazaba todo UPDATE, incluido el que
//          dispara `on delete set null`. Una cuenta con certificado NO SE PODIA DAR DE BAJA.
//   0024 · el guard de `course_reviews` exigia `is_admin()` para tocar `hidden_*`, pero con
//          service_role `auth.uid()` es null. LA MODERACION QUEDABA INALCANZABLE.
//
// Los dos dieron verde en toda la suite mientras rompian una funcion del producto.
//
// POR QUE LOS CASOS SE ESCRIBEN A MANO. "Cual es la operacion legitima" es semantica del dominio,
// no una propiedad del esquema: no hay nada en el catalogo que diga que borrar una cuenta tiene
// que poder anular su certificado. Lo que SI se automatiza es el aviso -- la meta-asercion de
// abajo -- para que un trigger nuevo no entre sin su caso.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

// Triggers que NO pueden bloquear nada y por eso no necesitan caso. Se enumeran a mano para que
// agregar uno exija justificarlo -- misma friccion que EXENTAS_POR_ENUM en locator-free-text.
//
// `*_set_updated_at` estampan `now()` en una columna y no tienen un solo `raise` en su cuerpo.
// Un trigger que no puede levantar no puede hacer inalcanzable nada.
const EXENTOS_NO_BLOQUEAN = [
  'campus_posts_set_updated_at',
  'course_modules_set_updated_at',
  'courses_set_updated_at',
  'diario_posts_set_updated_at',
  'enrollments_set_updated_at',
  'lesson_chapters_set_updated_at',
  'lesson_notes_set_updated_at',
  'lesson_resources_set_updated_at',
  'lessons_set_updated_at',
  'profiles_set_updated_at',
  // Estos dos SI escriben, pero solo derivan `published_at` de `status` para satisfacer el CHECK
  // `published_at_matches_status`. Tampoco tienen `raise`: no pueden bloquear, solo corregir.
  'courses_sync_published_at',
  'diario_posts_sync_published_at',
];

// Cada entrada declara el trigger y QUE OPERACION protege de volverse inalcanzable. El texto va
// en el nombre del test para que un fallo diga que se rompio sin abrir el archivo.
// Se llena en el Task 2.
const CASOS = {};

describe('ADR-011 · ningun guard hace inalcanzable la operacion legitima', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- la meta-asercion
  test('todo trigger de la base tiene caso de alcanzabilidad o exencion justificada', async () => {
    // NO se filtra por `like '%guard%'`. `lesson_progress_monotonic` impone un invariante y no se
    // llama guard: filtrar por nombre haria que la cobertura dependa de como alguien bautizo algo,
    // que es el mismo agujero que ADR-010 vino a cerrar en la otra mitad de ADR-009.
    const enLaDb = (
      await db.query(`
        select t.tgname
          from pg_trigger t
          join pg_class c on c.oid = t.tgrelid
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and not t.tgisinternal
         order by 1
      `)
    ).rows.map((r) => r.tgname);

    const declarados = new Set([...Object.keys(CASOS), ...EXENTOS_NO_BLOQUEAN]);
    const huerfanos = enLaDb.filter((t) => !declarados.has(t));

    assert.deepEqual(
      huerfanos,
      [],
      `triggers sin caso de alcanzabilidad ni exencion: ${huerfanos.join(', ')}. ` +
        `Aparecio un trigger nuevo y nadie probo su camino legitimo — que es exactamente como ` +
        `0017 y 0024 llegaron al repo.`,
    );
  });

  // La meta-asercion tambien tiene que apuntar al reves: un caso para un trigger que ya no existe
  // es un caso que no prueba nada y da verde para siempre.
  test('no hay casos declarados para triggers que ya no existen', async () => {
    const enLaDb = new Set(
      (
        await db.query(`
          select t.tgname from pg_trigger t
            join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and not t.tgisinternal
        `)
      ).rows.map((r) => r.tgname),
    );
    const fantasmas = [...Object.keys(CASOS), ...EXENTOS_NO_BLOQUEAN].filter((t) => !enLaDb.has(t));
    assert.deepEqual(fantasmas, [], `casos/exenciones de triggers inexistentes: ${fantasmas.join(', ')}`);
  });
});
```

- [ ] **Step 2: Correr y ver la lista de huérfanos**

```bash
cd webApp/supabase && node --test tests/guard-reachability.test.mjs 2>&1 | grep -A4 "triggers sin caso"
```

**Esperado: FALLA**, listando los 18 triggers que necesitan caso (17 con `guard` en el nombre más
`lesson_progress_monotonic`).

**Anotar la lista exacta.** Es el alcance del Task 2, y sale de la base, no de este plan.

- [ ] **Step 3: Commit del esqueleto en rojo**

```bash
git add webApp/supabase/tests/guard-reachability.test.mjs
git commit -m "test(db): meta-asercion de alcanzabilidad — EN ROJO, lista los triggers sin caso

No filtra por 'like %guard%' a proposito: lesson_progress_monotonic impone un
invariante y no se llama guard. Filtrar por nombre haria que la cobertura
dependa de como alguien bautizo algo — el mismo agujero que ADR-010 cerro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Los casos de alcanzabilidad

**Files:**
- Modify: `webApp/supabase/tests/guard-reachability.test.mjs` (la constante `CASOS` y los `test`)

**Interfaces:**
- Consumes: `CASOS` y el `describe` del Task 1.
- Produces: 18 casos, uno por trigger.

**Cómo escribir cada caso.** La pregunta del checklist de ADR-011 es *"X tiene que poder hacer Y"*.
Cada test ejecuta Y como X y afirma `r.ok === true`. **Un caso que sólo comprueba que algo falla no
pertenece a este archivo** — eso ya lo cubren los tests de ataque.

- [ ] **Step 1: Declarar los 18 en `CASOS`**

```js
const CASOS = {
  // --- los dos que YA se rompieron. Estos dos casos son la razon de ser del archivo.
  certificates_guard_immutable: 'borrar la cuenta anula el certificado (on delete set null) — bug de 0017',
  course_reviews_guard: 'service_role oculta una resena — bug de 0024',

  // --- estado de servidor
  courses_guard: 'service_role publica y despublica un curso',
  courses_guard_insert: 'la docente crea un curso, que nace en draft',
  lessons_guard: 'service_role carga video_id + duration_seconds y publica (T-005 c.4b)',
  diario_posts_guard: 'service_role publica un post del diario',
  enrollments_guard: 'service_role otorga y revoca una inscripcion',
  profiles_guard: 'la docente edita su bio sin tocar su rol',
  certificates_guard_insert: 'service_role emite el certificado de un curso completo',

  // --- progreso
  lesson_progress_guard_insert: 'la alumna guarda progreso real y la fila nace incompleta',
  lesson_progress_monotonic: 'el progreso avanza dentro del tope de tasa de 0009',

  // --- moderacion
  campus_posts_guard: 'la moderadora hace soft delete con autor y motivo',

  // --- localizadores (T-035). De estos seis, TRES nunca se verificaron por el lado legitimo:
  //     course_modules, lesson_chapters y lesson_resources. Este ticket existe en parte por eso.
  courses_locator_guard: 'la docente edita la ficha de su curso con prosa normal',
  lessons_locator_guard: 'la docente renombra una leccion con prosa normal',
  course_modules_locator_guard: 'la docente renombra un modulo con prosa normal',
  lesson_chapters_locator_guard: 'la docente crea y renombra un capitulo',
  lesson_resources_locator_guard: 'la docente renombra un recurso',
  profiles_locator_guard: 'el hook de alta crea el perfil y la docente edita su bio',
};
```

- [ ] **Step 2: Escribir los casos, empezando por los dos bugs conocidos**

Van primero porque son los que ya se rompieron una vez y su forma es la referencia del resto.

```js
  describe('los dos que ya se rompieron', () => {
    test(`certificates_guard_immutable · ${CASOS.certificates_guard_immutable}`, async () => {
      // La cadena real: borrar `auth.users` cascadea a `profiles`, y de ahi el `on delete set
      // null` de `certificates.user_id` dispara un UPDATE sobre una fila que el guard de
      // inmutabilidad ve. Antes de 0017 ese UPDATE se rechazaba y la cuenta quedaba imborrable.
      await db.exec(`reset role;`);
      const r = await attempt(db, `delete from auth.users where id = $1`, [ID.student]);
      assert.equal(
        r.ok,
        true,
        `el guard de inmutabilidad bloquea el on-delete-set-null (bug de 0017): ${r.message}`,
      );
    });

    test(`course_reviews_guard · ${CASOS.course_reviews_guard}`, async () => {
      await db.exec(`reset role;`);
      const r = await attempt(
        db,
        `update public.course_reviews
            set hidden_at = now(), hidden_by = $1, hidden_reason = 'spam'
          where course_id = $2 returning id`,
        [ID.admin, ID.courseA],
      );
      assert.equal(r.ok, true, `la moderacion legitima quedo bloqueada (bug de 0024): ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila — el caso no probo nada');
      await db.query(
        `update public.course_reviews set hidden_at = null, hidden_by = null, hidden_reason = null
          where course_id = $1`,
        [ID.courseA],
      );
    });
  });
```

**Ojo con el orden.** El caso de `certificates` **borra `ID.student`**, y `ID.student` es la autora
de la reseña del seed y la dueña del progreso. Si corre primero, rompe los casos que vienen después.

**La salida: que el caso de `certificates` sea el ÚLTIMO del archivo.** Es más simple que sembrar un
usuario aparte, y queda documentado en un comentario:

```js
// Este caso va AL FINAL a proposito: borra `ID.student`, que es la autora de la resena del seed y
// la duena del progreso. Corriendolo antes, los casos siguientes se quedan sin fila.
```

- [ ] **Step 3: Escribir los casos de estado de servidor**

```js
  describe('estado de servidor · service_role sigue pudiendo lo suyo', () => {
    test(`courses_guard · ${CASOS.courses_guard}`, async () => {
      await db.exec(`reset role;`);
      const publicar = await attempt(
        db,
        `update public.courses set status = 'published', published_at = now() where id = $1 returning id`,
        [ID.courseDraft],
      );
      assert.equal(publicar.ok, true, `service_role no pudo publicar: ${publicar.message}`);
      assert.equal(publicar.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');

      const despublicar = await attempt(
        db,
        `update public.courses set status = 'draft', published_at = null where id = $1 returning id`,
        [ID.courseDraft],
      );
      assert.equal(despublicar.ok, true, `service_role no pudo despublicar: ${despublicar.message}`);
    });

    test(`courses_guard_insert · ${CASOS.courses_guard_insert}`, async () => {
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id)
           values ('t036-curso-nuevo', 'Curso nuevo', 'tarot', 'inicial', $1) returning status`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, true, `la docente no pudo crear un curso: ${r.message}`);
      assert.equal(r.rows[0].status, 'draft', 'el curso no nacio en draft');
    });

    test(`lessons_guard · ${CASOS.lessons_guard}`, async () => {
      await db.exec(`reset role;`);
      const r = await attempt(
        db,
        `update public.lessons set video_id = 'aBcD1234_-x', duration_seconds = 600, is_published = true
          where id = $1 returning is_published`,
        [ID.lessonA],
      );
      assert.equal(r.ok, true, `service_role no pudo cargar video y publicar: ${r.message}`);
      assert.equal(r.rows[0].is_published, true);
    });

    test(`diario_posts_guard · ${CASOS.diario_posts_guard}`, async () => {
      await db.exec(`reset role;`);
      const r = await attempt(
        db,
        `update public.diario_posts set status = 'published', published_at = now()
          where id = $1 returning status`,
        [ID.postDraftB],
      );
      assert.equal(r.ok, true, `service_role no pudo publicar un post: ${r.message}`);
    });

    test(`enrollments_guard · ${CASOS.enrollments_guard}`, async () => {
      await db.exec(`reset role;`);
      const alta = await attempt(
        db,
        `insert into public.enrollments (user_id, course_id, granted_by) values ($1, $2, $3) returning id`,
        [ID.otro, ID.courseB, ID.admin],
      );
      assert.equal(alta.ok, true, `service_role no pudo otorgar una inscripcion: ${alta.message}`);

      const baja = await attempt(
        db,
        `update public.enrollments set status = 'revoked' where user_id = $1 and course_id = $2 returning status`,
        [ID.otro, ID.courseB],
      );
      assert.equal(baja.ok, true, `service_role no pudo revocar: ${baja.message}`);
    });

    test(`profiles_guard · ${CASOS.profiles_guard}`, async () => {
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(db, `update public.profiles set bio = $1 where id = $2 returning id`, [
          'Trabajo con tarot desde 2019.',
          ID.teacherA,
        ]),
      );
      assert.equal(r.ok, true, `la docente no pudo editar su bio: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });
  });
```

- [ ] **Step 4: El caso de `certificates_guard_insert`, que necesita precondición**

Este guard exige que **todas** las lecciones publicadas del curso estén completas para esa alumna.
Es el más caro de montar y por eso va con su propia preparación:

```js
    test(`certificates_guard_insert · ${CASOS.certificates_guard_insert}`, async () => {
      await db.exec(`reset role;`);
      // Precondicion: la alumna completa TODAS las lecciones publicadas de courseA. `completed` es
      // derivada (ADR-007) y nadie la declara, asi que se cruza el umbral escribiendo el reloj.
      const lecciones = (
        await db.query(
          `select id, duration_seconds from public.lessons where course_id = $1 and is_published`,
          [ID.courseA],
        )
      ).rows;
      assert.ok(lecciones.length > 0, 'el seed no tiene lecciones publicadas en courseA');

      for (const l of lecciones) {
        await db.query(
          `insert into public.lesson_progress (user_id, lesson_id, seconds_watched)
           values ($1, $2, $3)
           on conflict (user_id, lesson_id) do update set seconds_watched = excluded.seconds_watched`,
          [ID.student, l.id, l.duration_seconds],
        );
      }

      const r = await attempt(
        db,
        `insert into public.certificates (user_id, course_id, code) values ($1, $2, $3) returning id`,
        [ID.student, ID.courseA, 't036-codigo-de-prueba'],
      );
      assert.equal(r.ok, true, `service_role no pudo emitir un certificado legitimo: ${r.message}`);
    });
```

**Si este caso falla porque el seed no permite montar la precondición** —por ejemplo, porque
`duration_seconds` es 0 en alguna lección y entonces `completed` no se cruza nunca (ADR-007)—
**la salida NO es bajar el listón del caso**: es sembrar en `seed.mjs` un curso completable, y
anotarlo en el commit. Ese es el único cambio a `seed.mjs` que este ticket contempla.

- [ ] **Step 5: Los casos de progreso, moderación y localizadores**

```js
  describe('progreso', () => {
    test(`lesson_progress_guard_insert · ${CASOS.lesson_progress_guard_insert}`, async () => {
      const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, lesson_id, seconds_watched)
           values ($1, $2, 30) returning completed`,
          [ID.student, ID.lessonPreviewB],
        ),
      );
      assert.equal(r.ok, true, `la alumna no pudo guardar progreso real: ${r.message}`);
      assert.equal(r.rows[0].completed, false, 'la fila deberia nacer incompleta');
    });

    test(`lesson_progress_monotonic · ${CASOS.lesson_progress_monotonic}`, async () => {
      // El tope de 0009 es 2N + margen entre escrituras, medido con el reloj del SERVIDOR. Un
      // avance chico tiene que pasar; si no pasa, el tope quedo tan ajustado que el progreso
      // normal es inalcanzable — que es exactamente lo que este archivo busca.
      const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(
          db,
          `update public.lesson_progress set seconds_watched = 35 where user_id = $1 and lesson_id = $2
            returning seconds_watched`,
          [ID.student, ID.lessonPreviewB],
        ),
      );
      assert.equal(r.ok, true, `el progreso normal quedo bloqueado por el tope: ${r.message}`);
    });
  });

  describe('moderacion', () => {
    test(`campus_posts_guard · ${CASOS.campus_posts_guard}`, async () => {
      await db.exec(`reset role;`);
      const post = (
        await db.query(
          `insert into public.campus_posts (course_id, author_id, body)
           values ($1, $2, 'Mensaje de prueba') returning id`,
          [ID.courseA, ID.student],
        )
      ).rows[0];

      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(
          db,
          `update public.campus_posts
              set deleted_at = now(), deleted_by = $1, deleted_reason = 'fuera de tema'
            where id = $2 returning id`,
          [ID.teacherA, post.id],
        ),
      );
      assert.equal(r.ok, true, `la moderadora no pudo hacer soft delete: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });
  });

  describe('localizadores (T-035) · prosa normal no se bloquea', () => {
    const comoDocente = (fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);

    test(`courses_locator_guard · ${CASOS.courses_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.courses set intro = $1 where id = $2 returning id`, [
          'Un recorrido por los 22 arcanos, con ejercicios de lectura.',
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test(`lessons_locator_guard · ${CASOS.lessons_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.lessons set title = $1 where id = $2 returning id`, [
          'Clase 3 — los arcanos menores',
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test(`course_modules_locator_guard · ${CASOS.course_modules_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.course_modules set title = $1 where id = $2 returning id`, [
          'Modulo II — el viaje del heroe',
          ID.moduleA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test(`lesson_chapters_locator_guard · ${CASOS.lesson_chapters_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.lesson_chapters set label = $1 where id = $2 returning id`, [
          'Apertura del arcano',
          ID.chapterA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test(`lesson_resources_locator_guard · ${CASOS.lesson_resources_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.lesson_resources set name = $1 where id = $2 returning id`, [
          'Manual v2.1',
          ID.resourceA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test(`profiles_locator_guard · ${CASOS.profiles_locator_guard}`, async () => {
      // El INSERT es el camino del hook `handle_new_user`, que es donde un guard sobre `profiles`
      // puede romper el alta de cuenta entera.
      await db.exec(`reset role;`);
      const alta = await attempt(
        db,
        `insert into public.profiles (id, full_name, role) values ($1, 'Alta de prueba', 'student')
         returning id`,
        ['11111111-1111-4111-8111-111111111111'],
      );
      assert.equal(alta.ok, true, `el guard rompe el alta de perfil: ${alta.message}`);

      const edicion = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(db, `update public.profiles set bio = $1 where id = $2 returning id`, [
          'Ensenio tarot desde 2019.',
          ID.teacherA,
        ]),
      );
      assert.equal(edicion.ok, true, edicion.message);
    });
  });
```

**El `assert` de filas alcanzadas está en casi todos a propósito.** Un `UPDATE` que no toca ninguna
fila devuelve `ok: true` y no prueba nada — es el modo de falla vacuo que este proyecto ya arrastró
dos veces y que T-035 volvió a encontrar.

- [ ] **Step 6: Correr y ver qué falla**

```bash
cd webApp/supabase && node --test tests/guard-reachability.test.mjs 2>&1 | tail -25
```

**Es razonable que algo falle.** Dos de las once tablas ya tuvieron este bug, y los seis guards de
localizadores tienen un día de vida. Si falla algo:

1. **No relajar el guard para que el caso pase.** Primero entender si la operación es realmente
   legítima.
2. Si lo es, **es un bug vivo** → Task 3.
3. Si no lo es, el caso está mal planteado → corregir el caso y explicar por qué en un comentario.

- [ ] **Step 7: Commit**

```bash
git add webApp/supabase/tests/guard-reachability.test.mjs
git commit -m "test(db): 18 casos de alcanzabilidad, uno por trigger

Los tests de ataque prueban que lo prohibido no pasa; estos prueban que lo
permitido si. Es la mitad que faltaba y que dejo pasar el mismo bug dos veces
(0017 certificados, 0024 resenas).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Arreglar lo que aparezca

**Files:**
- Create: `webApp/supabase/migrations/20260910120000_0026_<nombre-segun-el-bug>.sql` — **sólo si el Task 2 encontró un bug real.**

**Si el Task 2 pasó entero, esta tarea no existe.** Saltear al Task 4 y decirlo en el commit — es un
resultado válido y vale la pena registrarlo: significa que los 18 caminos legítimos funcionan.

- [ ] **Step 1: Reproducir el fallo aislado**

Antes de escribir una migración, reproducir el caso solo contra la base real:

```bash
docker exec supabase_db_webApp psql -U postgres -c "<la operacion legitima que fallo>"
```
Si contra Postgres real **no** falla pero contra PGlite sí, el problema puede ser una diferencia de
motor — el proyecto ya documentó que PGlite (18.3) y Supabase (17.6) no son la misma versión, y que
todo cambio con semántica de motor conviene probarlo en las dos.

- [ ] **Step 2: Decidir invariante o permiso (ADR-011)**

> **Invariante ⇒ sin bypass. Permiso ⇒ con bypass.**

Si la operación legítima pasa por `service_role` y el guard la bloquea, y lo que el guard protege es
un **permiso**, la corrección es `is_service_context()` — como en `0024`. Si es un **invariante**, la
corrección es otra: acotar la condición del guard para que no atrape el caso legítimo, como hizo
`0017`.

- [ ] **Step 3: Escribir la migración y verificar**

```bash
cd webApp && npx supabase db reset 2>&1 | tail -2
cd supabase && node --test tests/guard-reachability.test.mjs 2>&1 | tail -6
npm test 2>&1 | tail -5
```
Los dos en verde. **Y correr B-1**: aflojar un guard puede abrir un ataque que antes se rechazaba.

```bash
bash webApp/supabase/harness/b1-postgrest-attacks.sh 2>&1 | tail -2
```

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/migrations
git commit -m "fix(db): <el bug que aparecio> (T-036)

Encontrado por el test de alcanzabilidad. Es el tercer caso de la misma familia
que 0017 y 0024.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Probar que la meta-aserción avisa

**Files:**
- Modify: `webApp/supabase/tests/guard-reachability.test.mjs`

**Por qué:** la meta-aserción es lo único de este ticket que protege el futuro. Si no avisa cuando
debe, el archivo es una foto de hoy y nada más.

- [ ] **Step 1: Agregar el caso que crea un trigger nuevo y espera el aviso**

```js
  // Este caso prueba LA META-ASERCION, no un guard. Sin el, el archivo protege el presente y nada
  // mas: el dia que alguien agregue un trigger sin caso, el aviso tiene que saltar.
  test('meta · un trigger nuevo sin caso hace fallar la meta-asercion', async () => {
    await db.exec(`reset role;`);
    await db.exec(`
      create trigger t036_trigger_intruso before update on public.lessons
      for each row execute function public.guard_locator_exacto('title');
    `);
    try {
      const enLaDb = (
        await db.query(`
          select t.tgname from pg_trigger t
            join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and not t.tgisinternal
        `)
      ).rows.map((r) => r.tgname);
      const declarados = new Set([...Object.keys(CASOS), ...EXENTOS_NO_BLOQUEAN]);
      const huerfanos = enLaDb.filter((t) => !declarados.has(t));
      assert.deepEqual(
        huerfanos,
        ['t036_trigger_intruso'],
        'la meta-asercion no detecto un trigger nuevo sin caso — no protege nada',
      );
    } finally {
      await db.exec(`reset role;`);
      await db.exec(`drop trigger if exists t036_trigger_intruso on public.lessons;`);
    }
  });
```

**Sin transacción a propósito.** Es la lección de T-035: cuando algo falla dentro de un `BEGIN`
explícito, Postgres aborta la transacción y el `reset role` de limpieza revienta con `25P02`,
arrastrando al caso siguiente. Acá no hay error esperado, pero el patrón se mantiene por
consistencia y porque el `drop` explícito es más legible que un rollback implícito.

- [ ] **Step 2: Verificar que el caso sabe fallar**

Comentar el `create trigger` momentáneamente y correr: el caso tiene que **fallar** (no encuentra
el huérfano que espera). Descomentarlo después. Es el meta-control del meta-control, y es barato.

- [ ] **Step 3: Suite completa**

```bash
cd webApp/supabase && npm test 2>&1 | tail -5
```
Esperado: 0 fail. **Anotar el total.**

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/tests/guard-reachability.test.mjs
git commit -m "test(db): la meta-asercion avisa ante un trigger nuevo sin caso

Verificado creando un trigger intruso y exigiendo que aparezca en la lista de
huerfanos. Sin esto, el archivo seria una foto de hoy.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Cerrar ADR-011 en el engram

**Files:**
- Modify: `engram/02_architecture.md` (ADR-011)

**Nota:** `engram/` está gitignored por decisión del proyecto — este cambio no va a git y eso está
bien. La spec en `docs/` es lo versionado.

- [ ] **Step 1: Actualizar el conteo y el resultado**

ADR-011 dice "hay 12 guard triggers". Corregirlo a **17 con `guard` en el nombre, más
`lesson_progress_monotonic`**, y agregar el resultado real del Task 2: cuántos casos pasaron a la
primera y qué bug apareció, si apareció.

Si el Task 2 pasó entero, escribirlo: *"los 18 caminos legítimos verificados, ninguno bloqueado"*.
Un ADR que registra que no había nada roto vale tanto como uno que registra un arreglo — evita que
alguien vuelva a auditarlo desde cero.

- [ ] **Step 2: Anotar la decisión de no filtrar por nombre**

Agregar a ADR-011: la meta-aserción **no filtra por `like '%guard%'`** porque
`lesson_progress_monotonic` impone un invariante y no se llama guard. Es la misma clase de agujero
que ADR-010 cerró, y conviene que quede escrito para que nadie lo "simplifique" después.

---

## Gate final

```bash
cd webApp/supabase && npm test
bash webApp/supabase/harness/b1-postgrest-attacks.sh
COOKIE="<cookie>" bash webApp/scripts/check-adr004.sh http://localhost:3000
bash webApp/scripts/check-seo.sh http://localhost:3000
cd webApp && npx tsc --noEmit && npm run lint
```

**Sin recorrido manual.** Este ticket no toca la interfaz: es todo esquema y tests. Si el Task 3
llegó a existir —o sea, si hubo que aflojar un guard— entonces sí hace falta probar a mano la
operación que estaba rota, porque un test verde sobre una operación de producto no reemplaza verla
funcionar.

## Cobertura de los criterios de la spec

| Criterio ADR-011 | Task |
|---|---|
| 1 · ADR con las cinco preguntas y la regla del bypass | Ya escrito · Task 5 lo corrige |
| 2 · un caso por tabla con guard | 2 |
| 3 · meta-aserción, verificada en rojo | 1, 4 |
| 4 · cada caso verificado en rojo | 2 (Step 6), 4 (Step 2) |
| 5 · si un caso falla, es bug vivo y se arregla acá | 3 |
| 6 · `npm test` en verde | 4 |

## Riesgos declarados

**El caso de `certificates` borra `ID.student`.** Va último. Si por alguna razón hay que moverlo,
hay que sembrar un usuario propio para él — no reordenar y esperar que salga bien.

**El caso de `lesson_progress_monotonic` depende del reloj.** El tope de `0009` se mide contra el
reloj del servidor entre dos escrituras. En una suite que corre en milisegundos, un avance de 5
segundos podría **exceder** el tope y fallar por una razón que no es un bug. Si eso pasa, el ajuste
correcto es un avance más chico —1 segundo— y **no** tocar el tope.

**PGlite no es Supabase.** Todo lo de este archivo corre contra PGlite 18.3, y producción es 17.6.
Si un caso se comporta distinto en las dos, gana lo que diga Postgres real — y ése es justamente el
bloqueante A-01 de la auditoría, que sigue abierto.

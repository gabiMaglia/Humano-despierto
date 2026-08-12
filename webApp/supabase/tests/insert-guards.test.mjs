// T-011 · El patron "protegido en UPDATE, abierto en INSERT" — TEST DE MUTACION REAL.
//
// Mismo estandar que `rls-mutation.test.mjs`: cada caso ejecuta el DML del atacante contra un
// Postgres de verdad con `SET ROLE authenticated` y los claims del JWT en `request.jwt.claims`,
// como los deja PostgREST. El bloque final revierte UNA capa por vez y afirma que el ataque
// vuelve a pasar: sin eso, un verde no distingue "protegido" de "el ataque estaba mal escrito".

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';

// lessonA dura 3138 s ⇒ el umbral del 90 % cae en 2824.2: 2824 no completa, 2825 si.
const DURACION_LESSON_A = 3138;
const UMBRAL_LESSON_A = 2825;

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOwnerTeacher = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const progresoDe = async (db, lessonId) =>
  (
    await db.query(
      `select seconds_watched, completed, completed_at from public.lesson_progress
       where user_id = $1 and lesson_id = $2`,
      [ID.student, lessonId],
    )
  ).rows[0];

/** Ataque del hallazgo: auto-certificarse una leccion con 1 segundo visto. */
const AUTOCERTIFICAR = `
  insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at)
  values ($1, $2, $3, 1, true, now())`;

// ---------------------------------------------------------------------------
// T-015 · el guard de UPDATE (0008) acota cuanto puede subir `seconds_watched` segun el tiempo
// de reloj real transcurrido desde `old.last_seen_at` — que el propio guard escribe SIEMPRE con
// `now()`, nunca con lo que declare el cliente. Los tests de UMBRAL/MONOTONIA de mas abajo (T-011)
// escriben saltos grandes en una sola sentencia sin que pase tiempo real entre escrituras: eso es
// EXACTAMENTE lo que T-015 deja de permitir. `retrasarReloj` los desacopla del tope (que se prueba
// aparte, en su propio describe) apagando el trigger SOLO para la escritura de preparacion — la
// escritura bajo prueba siempre pasa con el trigger prendido.
const retrasarReloj = async (db, lessonId, segundosAtras) => {
  await db.exec(`alter table public.lesson_progress disable trigger lesson_progress_monotonic;`);
  try {
    await db.query(
      `update public.lesson_progress set last_seen_at = now() - ($1 || ' seconds')::interval where lesson_id = $2`,
      [segundosAtras, lessonId],
    );
  } finally {
    await db.exec(`alter table public.lesson_progress enable trigger lesson_progress_monotonic;`);
  }
};

// ---------------------------------------------------------------------------
// T-012 · H-1 · el oraculo.
// Una leccion dentro del curso BORRADOR de otra docente: `lessons_read` (0004:71-73) exige
// `can_read_course(course_id) and (is_published or owns_course)`, y un borrador ajeno no cumple
// ninguna de las dos ⇒ la RLS la oculta por completo.
// ---------------------------------------------------------------------------
const MODULO_OCULTO = '50000000-0000-4000-8000-0000000000dd';
const LESSON_OCULTA = '60000000-0000-4000-8000-0000000000dd';
const DURACION_OCULTA = 4321;
const UMBRAL_OCULTO = Math.ceil(DURACION_OCULTA * 0.9); // 3889

const sembrarLeccionOculta = async (db) => {
  await db.exec(`
    insert into public.course_modules (id, course_id, position, title)
      values ('${MODULO_OCULTO}', '${ID.courseDraft}', 1, 'Modulo del borrador');
    insert into public.lessons (id, course_id, module_id, position, title, duration_seconds, is_published)
      values ('${LESSON_OCULTA}', '${ID.courseDraft}', '${MODULO_OCULTO}', 1, 'Oculta', ${DURACION_OCULTA}, false);
  `);
};

/**
 * Busqueda binaria del menor N que completa: es `ceil(0.9 * duration_seconds)`, de donde la
 * duracion sale exacta. Devuelve `{denied}` si la funcion no es invocable.
 */
const oraculo = async (db, lessonId, run) => {
  let lo = 0;
  let hi = 100000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = await run(() =>
      attempt(db, `select public.lesson_progress_completes($1, $2) as c`, [lessonId, mid]),
    );
    if (!r.ok) return { denied: r.code, pasos: 0 };
    if (r.rows[0].c) hi = mid;
    else lo = mid + 1;
  }
  // De `umbral = ceil(0.9 d)` se despeja d ∈ ((u-1)·100/90, u·100/90]. Para u=3889 ese intervalo
  // es (4320, 4321.11]: contiene UN solo entero, 4321. La duracion sale exacta, no aproximada.
  return { umbral: lo, duracion: Math.floor((lo * 100) / 90) };
};

// ---------------------------------------------------------------------------
// Criterio 4 · el barrido, ejecutable.
// Toda columna con INSERT para un rol de cliente, leida del ACL crudo (pg_attribute.attacl), no de
// la lectura de 0003. Si alguien agrega una columna al grant, este test se pone rojo y obliga a
// decidir sobre ella — que es exactamente lo que no paso con lesson_progress.completed.
//
// T-012 · H-2: se barren los DOS roles de cliente. La version de T-011 filtraba solo
// `authenticated` y `anon` quedaba fuera de la guarda: hoy no tiene ningun INSERT, pero el dia que
// alguien le otorgue uno el barrido no se enteraba.
const ROLES_CLIENTE = ['authenticated', 'anon'];

const columnasConInsert = async (db, rol) =>
  (
    await db.query(
      `
      select c.relname || '.' || a.attname as col
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      cross join lateral aclexplode(a.attacl) acl
      join pg_roles r on r.oid = acl.grantee
      where n.nspname = 'public' and r.rolname = $1 and acl.privilege_type = 'INSERT'
    `,
      [rol],
    )
  ).rows
    .map((r) => r.col)
    .sort();

const tablasConInsertEntero = async (db, rol) =>
  (
    await db.query(
      `
      select c.relname as t
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) acl
      join pg_roles r on r.oid = acl.grantee
      where n.nspname = 'public' and r.rolname = $1 and acl.privilege_type = 'INSERT'
    `,
      [rol],
    )
  ).rows
    .map((r) => r.t)
    .sort();

// La lista, tabla por tabla, con la decision de T-011 sobre cada una.
const INSERT_ESPERADO = {
  // profiles          — SIN grant de INSERT. La fila la crea handle_new_user(). No aplica.
  // lesson_resources  — SIN grant de INSERT (alta por Server Action). No aplica.
  // enrollments       — SIN grant de INSERT y ademas enrollments_guard cubre insert/update/delete.

  // Guard nuevo (c.2): status/featured/published_at fuera del grant Y bloqueadas por trigger.
  courses: ['slug', 'title', 'title_em', 'subtitle', 'intro', 'discipline', 'level', 'price_cents',
            'currency', 'roman_num', 'moon_glyph', 'includes', 'teacher_id'],

  // Guard nuevo (c.3): is_published, video_id y —desde T-012— duration_seconds fuera del grant
  // Y bloqueadas por trigger. La duracion la trae YouTube, no el docente (decision del PO).
  lessons: ['course_id', 'module_id', 'position', 'title', 'description', 'video_provider',
            'is_preview'],

  // Guards nuevos (c.1): completed/completed_at ya no estan en el grant y ademas son derivadas.
  lesson_progress: ['user_id', 'course_id', 'lesson_id', 'seconds_watched', 'last_seen_at'],

  // SIN guard, decidido: ninguna columna confiere privilegio ni estado de publicacion. Son
  // contenido del curso y su alta esta acotada por RLS `owns_course(course_id)`, que es un
  // predicado, no una lista de columnas — no es el patron que T-011 persigue.
  course_modules: ['course_id', 'position', 'title', 'description'],
  lesson_chapters: ['course_id', 'lesson_id', 'position', 'start_seconds', 'label'],

  // SIN guard, decidido: `user_id` es el unico campo sensible y lo compuerta el WITH CHECK de
  // `lesson_notes_insert_own` (user_id = auth.uid()). El control es una policy, no el grant.
  lesson_notes: ['user_id', 'course_id', 'lesson_id', 'at_seconds', 'body'],

  // T-021 · Campus. `deleted_at`/`deleted_by`/`deleted_reason` FUERA del INSERT a proposito
  // (nadie nace borrado): estan en el grant de UPDATE (la via de moderacion), nunca en el de
  // INSERT. `author_id` SI viaja en el INSERT (lo manda el cliente) pero el WITH CHECK de
  // `campus_posts_insert` exige `author_id = auth.uid()` y el guard trigger lo revalida.
  campus_posts: ['course_id', 'author_id', 'body'],

  // T-022 · Diario. `status`/`published_at` fuera del grant a proposito (ADR-008, criterio 3):
  // publicar es privilegio de service_role, mismo patron que `courses`. `body` SI viaja en el
  // INSERT — es contenido, no metadata de servidor — y lo protege `guard_diario_posts`
  // (`body_has_known_locator`), no el grant.
  diario_posts: ['teacher_id', 'slug', 'title', 'excerpt', 'body'],
};

const listaEsperada = Object.entries(INSERT_ESPERADO)
  .flatMap(([t, cols]) => cols.map((c) => `${t}.${c}`))
  .sort();

describe('T-011 · guards de INSERT', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await sembrarLeccionOculta(db);
  });

  after(async () => db?.close());

  // ------------------------------------------------------------ criterio 1
  describe('c.1 · lesson_progress: la certificacion la decide el umbral, no el cliente', () => {
    test('el alumno INSCRIPTO no puede auto-certificarse en el INSERT', async () => {
      const r = await asStudent(db, () =>
        attempt(db, AUTOCERTIFICAR, [ID.student, ID.courseA, ID.lessonA]),
      );
      assert.equal(r.ok, false, 'se auto-certifico una leccion con 1 segundo visto');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('tampoco nombrando solo `completed`', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed)
           values ($1, $2, $3, 1, true)`,
          [ID.student, ID.courseA, ID.lessonA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('tampoco por UPDATE: la columna no existe para el cliente en ninguna ruta', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set completed = true where lesson_id = $1`, [
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('control positivo: guarda progreso real y la fila nace INCOMPLETA', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 1)`,
          [ID.student, ID.courseA, ID.lessonA],
        ),
      );
      assert.equal(r.ok, true, r.message);
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(fila.completed, false, 'la fila nacio completada');
      assert.equal(fila.completed_at, null);
    });

    test('debajo del umbral (2824 de 3138) sigue incompleta', async () => {
      // T-015: sin esto, el tope de reloj (0008) recortaria el salto de 1 a 2824 en una sola
      // escritura — que es correcto para el atacante, pero este test prueba el UMBRAL, no el
      // tope (ese tiene su propio describe mas abajo).
      await retrasarReloj(db, ID.lessonA, 3000);
      const r = await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
          UMBRAL_LESSON_A - 1,
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(fila.seconds_watched, UMBRAL_LESSON_A - 1);
      assert.equal(fila.completed, false);
    });

    test('al cruzar el umbral (2825 de 3138) la DB la certifica y la sella', async () => {
      await retrasarReloj(db, ID.lessonA, 3000);
      const r = await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
          UMBRAL_LESSON_A,
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(fila.completed, true, 'el camino legitimo dejo de certificar');
      assert.notEqual(fila.completed_at, null, 'completed sin completed_at viola el CHECK');
    });

    test('completar es irreversible: el progreso no retrocede ni se descompleta', async () => {
      await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = 5 where lesson_id = $1`, [
          ID.lessonA,
        ]),
      );
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(fila.seconds_watched, UMBRAL_LESSON_A);
      assert.equal(fila.completed, true);
    });

    test('una leccion sin duracion cargada no se completa NUNCA (duration_seconds = 0)', async () => {
      const lessonSinDuracion = '60000000-0000-4000-8000-0000000000cc';
      await asService(db, () =>
        attempt(
          db,
          `insert into public.lessons (id, course_id, module_id, position, title, duration_seconds, is_published)
           values ($1, $2, $3, 7, 'Sin duracion', 0, false)`,
          [lessonSinDuracion, ID.courseA, ID.moduleA],
        ),
      );
      const alta = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 999999)`,
          [ID.student, ID.courseA, lessonSinDuracion],
        ),
      );
      assert.equal(alta.ok, true, alta.message);
      const fila = await progresoDe(db, lessonSinDuracion);
      assert.equal(fila.completed, false, '0 segundos de duracion completable con cualquier valor');
    });
  });

  // ------------------------------------------------------------ criterio 2
  describe('c.2 · courses: un curso no nace publicado ni destacado', () => {
    test('la docente no se autopublica en el INSERT', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, status, published_at)
           values ('t011-publicado', 'Publicado', 'tarot', 'iniciacion', $1, 'published', now())`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, false, 'nacio un curso publicado');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni se autodestaca', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, featured)
           values ('t011-destacado', 'Destacado', 'tarot', 'iniciacion', $1, true)`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('control positivo: el curso legitimo nace en draft', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id)
           values ('t011-legitimo', 'Legitimo', 'tarot', 'iniciacion', $1)`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, true, `el guard rompio el alta legitima: ${r.message}`);
      const check = await db.query(
        `select status, featured, published_at from public.courses where slug = 't011-legitimo'`,
      );
      assert.equal(check.rows[0].status, 'draft');
      assert.equal(check.rows[0].featured, false);
      assert.equal(check.rows[0].published_at, null);
    });

    test('control positivo: service_role si da de alta un curso publicado', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, status, published_at)
           values ('t011-service', 'Alta de servicio', 'tarot', 'iniciacion', $1, 'published', now())`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, true, `el guard alcanzo a service_role: ${r.message}`);
    });
  });

  // ------------------------------------------------------------ criterio 3
  describe('c.3 · lessons: is_published, video_id y duration_seconds son del servidor', () => {
    test('la docente dueña no publica una leccion al crearla', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, is_published)
           values ($1, $2, 21, 'Nace publicada', true)`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, false, 'nacio una leccion publicada desde el cliente');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni la publica por UPDATE', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lessons set is_published = false where id = $1`, [ID.lessonA]),
      );
      assert.equal(r.ok, false, 'despublico una leccion desde el cliente');
      assert.equal(r.code, PRIV_DENIED);
    });

    // T-012 · punto 4 (decision del PO): la duracion la trae YouTube, no la docente.
    test('la docente dueña no fija la duracion al crear la leccion', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, duration_seconds)
           values ($1, $2, 23, 'Con duracion', 600)`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, false, 'la docente fijo la vara de la certificacion');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni la corrige despues: bajarla certificaria a toda la cohorte', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lessons set duration_seconds = 5 where id = $1`, [ID.lessonA]),
      );
      assert.equal(r.ok, false, 'la docente bajo la duracion de una leccion con alumnos');
      assert.equal(r.code, PRIV_DENIED);
      const check = await db.query(`select duration_seconds from public.lessons where id = $1`, [ID.lessonA]);
      assert.equal(check.rows[0].duration_seconds, DURACION_LESSON_A);
    });

    test('control positivo: crea la leccion (sin duracion) y le cambia el titulo', async () => {
      const alta = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title)
           values ($1, $2, 22, 'Borrador de leccion')`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(alta.ok, true, `el guard rompio el alta legitima: ${alta.message}`);

      const edicion = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lessons set title = 'Titulo nuevo' where position = 22 and course_id = $1`, [
          ID.courseA,
        ]),
      );
      assert.equal(edicion.ok, true, `el guard rompio la edicion legitima: ${edicion.message}`);
    });

    test('control positivo: service_role carga video + duracion y publica (T-005)', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `update public.lessons set video_id = 'bQw4w9WgXcQ', duration_seconds = 1200, is_published = true
           where position = 22 and course_id = $1`,
          [ID.courseA],
        ),
      );
      assert.equal(r.ok, true, `el guard alcanzo a service_role: ${r.message}`);
      const check = await db.query(
        `select duration_seconds, is_published from public.lessons where position = 22 and course_id = $1`,
        [ID.courseA],
      );
      assert.equal(check.rows[0].duration_seconds, 1200);
      assert.equal(check.rows[0].is_published, true);
    });
  });

  // ------------------------------------------------------------ criterio 4
  describe('c.4 · barrido de TODO grant de INSERT para los roles de cliente', () => {
    test('ninguna tabla tiene INSERT a nivel de TABLA, en ninguno de los dos roles', async () => {
      for (const rol of ROLES_CLIENTE) {
        assert.deepEqual(await tablasConInsertEntero(db, rol), [], `${rol} tiene INSERT de tabla`);
      }
    });

    test('el whitelist de columnas de `authenticated` es exactamente el declarado y decidido', async () => {
      assert.deepEqual(await columnasConInsert(db, 'authenticated'), listaEsperada);
    });

    // T-012 · H-2. anon no escribe NADA: no tiene sesion, no hay fila que le pertenezca.
    test('`anon` no tiene ni un solo INSERT', async () => {
      assert.deepEqual(await columnasConInsert(db, 'anon'), []);
    });

    test('las columnas de servidor no figuran en ningun grant de INSERT', async () => {
      for (const rol of ROLES_CLIENTE) {
        const lista = await columnasConInsert(db, rol);
        for (const col of [
          'lesson_progress.completed',
          'lesson_progress.completed_at',
          'courses.status',
          'courses.featured',
          'courses.published_at',
          'lessons.is_published',
          'lessons.video_id',
          'lessons.duration_seconds',
          'diario_posts.status',
          'diario_posts.published_at',
        ]) {
          assert.ok(!lista.includes(col), `${col} volvio al grant de INSERT de ${rol}`);
        }
      }
    });

    test('las tablas sin alta desde el cliente siguen sin grant de INSERT', async () => {
      for (const rol of ROLES_CLIENTE) {
        const lista = await columnasConInsert(db, rol);
        for (const t of ['profiles', 'enrollments', 'lesson_resources']) {
          assert.ok(!lista.some((c) => c.startsWith(`${t}.`)), `${t} gano un INSERT para ${rol}`);
        }
      }
    });
  });

  // ------------------------------------------------------------ T-012 · publicacion
  describe('publicar exige una duracion real (lessons_published_needs_video)', () => {

    test('ni service_role publica una leccion con duracion 0', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, video_id, duration_seconds, is_published)
           values ($1, $2, 41, 'Publicada sin duracion', 'cQw4w9WgXcQ', 0, true)`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, false, 'se publico una leccion que nadie podria completar nunca');
      assert.equal(r.code, CHECK_VIOLATION);
      assert.match(r.message, /lessons_published_needs_video/);
    });

    test('tampoco se llega por UPDATE: bajar la duracion de una leccion publicada', async () => {
      const r = await asService(db, () =>
        attempt(db, `update public.lessons set duration_seconds = 0 where id = $1`, [ID.lessonA]),
      );
      assert.equal(r.ok, false, 'una leccion publicada quedo con duracion 0');
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('sigue exigiendo el video (la mitad que ya existia)', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, duration_seconds, is_published)
           values ($1, $2, 42, 'Publicada sin video', 600, true)`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    // EL PUNTO DEL DISEÑO: el alta es de dos pasos, y el paso 1 tiene que seguir siendo posible.
    // Sin `id` en el INSERT: la columna nunca estuvo en el grant del docente (0003) y nombrarla
    // devuelve 42501, que no tiene nada que ver con lo que este control mide.
    const idDelBorrador = async () =>
      (await db.query(`select id from public.lessons where position = 43 and course_id = $1`, [ID.courseA]))
        .rows[0]?.id;

    test('control positivo: la docente crea el BORRADOR con duracion 0', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title)
           values ($1, $2, 43, 'Esqueleto sin video')`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, true, `el constraint rompio el paso 1 del alta: ${r.message}`);
      const check = await db.query(
        `select duration_seconds, video_id, is_published from public.lessons where position = 43 and course_id = $1`,
        [ID.courseA],
      );
      assert.deepEqual(check.rows[0], { duration_seconds: 0, video_id: null, is_published: false });
    });

    test('control positivo: el paso 2 publica la misma leccion bien formada', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `update public.lessons set video_id = 'cQw4w9WgXcQ', duration_seconds = 900, is_published = true
           where position = 43 and course_id = $1`,
          [ID.courseA],
        ),
      );
      assert.equal(r.ok, true, `el constraint rompio el paso 2 del alta: ${r.message}`);
      const check = await db.query(
        `select duration_seconds, is_published from public.lessons where position = 43 and course_id = $1`,
        [ID.courseA],
      );
      assert.deepEqual(check.rows[0], { duration_seconds: 900, is_published: true });
    });

    test('control positivo: y una vez publicada, el alumno inscripto puede certificarla', async () => {
      const lessonId = await idDelBorrador();
      // T-015: el INSERT ya no acepta un salto directo a 810/900 (90 %) en una sola escritura —
      // es exactamente el agujero que cierra el tope de reloj (0008). El camino legitimo es
      // acumular: una primera escritura chica y, con tiempo de reloj real de por medio, la que
      // cruza el umbral — que es tal cual lo hace el player real (T-006 c.5).
      const alta = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 1)`,
          [ID.student, ID.courseA, lessonId],
        ),
      );
      assert.equal(alta.ok, true, alta.message);
      await retrasarReloj(db, lessonId, 3000);
      const sigue = await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = 810 where lesson_id = $1`, [
          lessonId,
        ]),
      );
      assert.equal(sigue.ok, true, sigue.message);
      const fila = await progresoDe(db, lessonId);
      assert.equal(fila.completed, true, '810 de 900 es el 90 %: deberia certificar');
    });
  });

  // ------------------------------------------------------------ T-012 · H-1
  describe('H-1 · lesson_progress_completes() ya no es un oraculo de duration_seconds', () => {
    test('la RLS oculta la leccion del borrador ajeno', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select duration_seconds from public.lessons where id = $1`, [LESSON_OCULTA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'la leccion del borrador ajeno es visible');
    });

    test('el alumno no puede invocar la funcion: no tiene EXECUTE', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select public.lesson_progress_completes($1, $2) as c`, [LESSON_OCULTA, UMBRAL_OCULTO]),
      );
      assert.equal(r.ok, false, 'la funcion sigue siendo invocable por el cliente');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la busqueda binaria muere en el primer paso', async () => {
      const r = await oraculo(db, LESSON_OCULTA, (fn) => asStudent(db, fn));
      assert.equal(r.umbral, undefined, `el oraculo devolvio el umbral ${r.umbral}`);
      assert.equal(r.denied, PRIV_DENIED);
    });

    // La otra via de consulta —escribir progreso y leer `completed`— si esta compuertada, y por la
    // policy, no por la funcion: sobre un borrador ajeno no hay inscripcion activa ni preview.
    test('tampoco se consulta escribiendo progreso sobre la leccion oculta', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 3889)`,
          [ID.student, ID.courseDraft, LESSON_OCULTA],
        ),
      );
      assert.equal(r.ok, false, 'el trigger contesto sobre una leccion que la RLS oculta');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('control positivo: el alumno sigue certificando su propio progreso', async () => {
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(fila.completed, true, 'el revoke de EXECUTE rompio el camino legitimo');
    });

    // El fix mueve los dos guards de progreso a SECURITY DEFINER. Esa es la condicion que permite
    // sacarle el EXECUTE al cliente, y no reintroduce la trampa de 0005 solo porque estos dos no
    // consultan `current_user`. Si alguien les agrega un bypass de service_role, deja de ser cierto.
    test('los guards de progreso son DEFINER; los que miran current_user siguen INVOKER', async () => {
      const r = await db.query(`
        select p.proname, p.prosecdef, p.prosrc
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('guard_lesson_progress', 'guard_lesson_progress_insert',
                            'guard_courses_insert', 'guard_lessons')
      `);
      const f = Object.fromEntries(r.rows.map((x) => [x.proname, x]));
      assert.equal(f.guard_lesson_progress.prosecdef, true);
      assert.equal(f.guard_lesson_progress_insert.prosecdef, true);
      assert.equal(f.guard_courses_insert.prosecdef, false);
      assert.equal(f.guard_lessons.prosecdef, false);
      for (const g of ['guard_lesson_progress', 'guard_lesson_progress_insert']) {
        assert.ok(
          !f[g].prosrc.includes('is_service_context'),
          `${g} es DEFINER y consulta current_user: se auto-eximiria siempre`,
        );
      }
    });
  });
});

// ---------------------------------------------------------------------------
// CONTROLES DE MUTACION — uno por capa agregada (criterio 5).
// Cada uno revierte SOLO la linea de su fix y comprueba que el ataque vuelve a pasar. Si no
// volviera, el test de arriba estaria verde por otra razon y no probaria nada.
// ---------------------------------------------------------------------------
describe('T-011 · controles de mutacion', () => {
  const GRANT_COMPLETED = `grant insert (completed, completed_at) on public.lesson_progress to authenticated;`;

  test('c.1 capa 1 revertida (vuelve el grant): el trigger todavia aguanta', async () => {
    const { db } = await bootDatabase({ afterMigrations: [GRANT_COMPLETED] });
    await seed(db);
    const r = await asStudent(db, () => attempt(db, AUTOCERTIFICAR, [ID.student, ID.courseA, ID.lessonA]));
    assert.equal(r.ok, true, 'no era el grant lo que bloqueaba el INSERT');
    const fila = await progresoDe(db, ID.lessonA);
    assert.equal(fila.completed, false, 'con el grant de vuelta no quedo ninguna capa');
    await db.close();
  });

  test('c.1 ambas capas revertidas: el agujero original vuelve a estar abierto', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        GRANT_COMPLETED,
        `drop trigger lesson_progress_guard_insert on public.lesson_progress;`,
      ],
    });
    await seed(db);
    const r = await asStudent(db, () => attempt(db, AUTOCERTIFICAR, [ID.student, ID.courseA, ID.lessonA]));
    assert.equal(r.ok, true, r.message);
    const fila = await progresoDe(db, ID.lessonA);
    assert.equal(fila.completed, true, 'el test de auto-certificacion pasaria aun con el bug presente');
    assert.equal(fila.seconds_watched, 1);
    await db.close();
  });

  test('c.1 UPDATE · con el guard monotono de 0005 (sin umbral), el alumno se certifica', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant update (completed, completed_at) on public.lesson_progress to authenticated;`,
        // cuerpo textual de 0005: monotonia sin certificacion por umbral
        `create or replace function public.guard_lesson_progress()
         returns trigger language plpgsql set search_path = '' as $fn$
         begin
           new.seconds_watched := greatest(new.seconds_watched, old.seconds_watched);
           if old.completed then
             new.completed    := true;
             new.completed_at := old.completed_at;
           end if;
           new.last_seen_at := greatest(new.last_seen_at, old.last_seen_at);
           return new;
         end;
         $fn$;`,
      ],
    });
    await seed(db);
    await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 30)`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    const r = await asStudent(db, () =>
      attempt(
        db,
        `update public.lesson_progress set completed = true, completed_at = now() where lesson_id = $1`,
        [ID.lessonA],
      ),
    );
    assert.equal(r.ok, true, r.message);
    const fila = await progresoDe(db, ID.lessonA);
    assert.equal(fila.completed, true, 'no era la derivacion del umbral lo que sostenia el test');
    assert.ok(fila.seconds_watched < DURACION_LESSON_A * 0.9);
    await db.close();
  });

  // T-012 · H-3 · aislamiento de capa. c.1 ya tenia el par completo (capa 1 sola / ambas capas);
  // c.2 y c.3 solo tenian "ambas", asi que no distinguian si al ataque lo detiene el grant o el
  // trigger — y lo que T-011 agrega es el trigger. Se afirma tambien sobre el MENSAJE: sin eso,
  // un 42501 de cualquier otra procedencia daria el test por bueno.
  test('c.2 capa 1 revertida (vuelve el grant): courses_guard_insert detiene el ataque SOLO', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (status, published_at, featured) on public.courses to authenticated;`,
      ],
    });
    await seed(db);
    const ataques = [
      [`status, published_at`, `'published', now()`, /draft/],
      [`featured`, `true`, /curaduria/],
      [`published_at`, `now()`, /published_at/],
    ];
    for (const [cols, vals, esperado] of ataques) {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, ${cols})
           values ('t012-aislado', 'Aislado', 'tarot', 'iniciacion', $1, ${vals})`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, false, `con el grant de vuelta no quedo ninguna capa para ${cols}`);
      assert.equal(r.code, PRIV_DENIED);
      assert.match(r.message, esperado, `no lo corto courses_guard_insert sino otra cosa: ${r.message}`);
    }
    const check = await db.query(`select count(*)::int as n from public.courses where slug = 't012-aislado'`);
    assert.equal(check.rows[0].n, 0);
    await db.close();
  });

  test('c.3 capa 1 revertida (vuelve el grant): lessons_guard detiene los seis ataques SOLO', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (is_published, video_id, duration_seconds) on public.lessons to authenticated;
         grant update (is_published, video_id, duration_seconds) on public.lessons to authenticated;`,
      ],
    });
    await seed(db);

    const altas = [
      [`is_published`, `true`, /is_published/],
      [`video_id`, `'HACKHACK123'`, /video_id/],
      [`duration_seconds`, `600`, /duration_seconds/],
    ];
    for (const [col, val, esperado] of altas) {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, ${col})
           values ($1, $2, 31, 'Aislada', ${val})`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, false, `con el grant de vuelta no quedo ninguna capa para ${col}`);
      assert.equal(r.code, PRIV_DENIED);
      assert.match(r.message, esperado, `no lo corto lessons_guard sino otra cosa: ${r.message}`);
    }

    const ediciones = [
      [`is_published = false`, /is_published/],
      [`video_id = 'HACKHACK123'`, /video_id/],
      [`duration_seconds = 5`, /duration_seconds/],
    ];
    for (const [set, esperado] of ediciones) {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lessons set ${set} where id = $1`, [ID.lessonA]),
      );
      assert.equal(r.ok, false, `con el grant de vuelta no quedo ninguna capa para ${set}`);
      assert.equal(r.code, PRIV_DENIED);
      assert.match(r.message, esperado, `no lo corto lessons_guard sino otra cosa: ${r.message}`);
    }
    await db.close();
  });

  test('c.2 · con el grant de vuelta y sin courses_guard_insert, la docente se autopublica', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (status, published_at) on public.courses to authenticated;`,
        `drop trigger courses_guard_insert on public.courses;`,
      ],
    });
    await seed(db);
    const r = await asOwnerTeacher(db, () =>
      attempt(
        db,
        `insert into public.courses (slug, title, discipline, level, teacher_id, status)
         values ('t011-mutacion', 'Autopublicado', 'tarot', 'iniciacion', $1, 'published')`,
        [ID.teacherA],
      ),
    );
    assert.equal(r.ok, true, 'no era el guard lo que bloqueaba el INSERT');
    const check = await db.query(`select status from public.courses where slug = 't011-mutacion'`);
    assert.equal(check.rows[0].status, 'published');
    await db.close();
  });

  test('c.3 · con el grant de vuelta y sin lessons_guard, la leccion nace publicada', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (is_published, video_id, duration_seconds) on public.lessons to authenticated;`,
        `drop trigger lessons_guard on public.lessons;`,
      ],
    });
    await seed(db);
    // La fila lleva `duration_seconds` porque `lessons_published_needs_video` (T-012) exige duracion
    // real para publicar. Es una capa ORTOGONAL: si la fila fuera invalida por ella, este control
    // moriria con 23514 y dejaria de demostrar lo suyo — que sin el trigger el ataque pasa.
    const r = await asOwnerTeacher(db, () =>
      attempt(
        db,
        `insert into public.lessons (course_id, module_id, position, title, video_id, duration_seconds, is_published)
         values ($1, $2, 21, 'Nace publicada', 'HACKHACK123', 600, true)`,
        [ID.courseA, ID.moduleA],
      ),
    );
    assert.equal(r.ok, true, 'no era el guard lo que bloqueaba el INSERT');
    const check = await db.query(
      `select is_published, video_id from public.lessons where position = 21 and course_id = $1`,
      [ID.courseA],
    );
    assert.equal(check.rows[0].is_published, true);
    assert.equal(check.rows[0].video_id, 'HACKHACK123');
    await db.close();
  });

  test('c.4 · el barrido detecta un grant nuevo (la asercion no es vacua)', async () => {
    const { db } = await bootDatabase({ afterMigrations: [GRANT_COMPLETED] });
    const lista = await columnasConInsert(db, 'authenticated');
    assert.ok(
      lista.includes('lesson_progress.completed') && lista.includes('lesson_progress.completed_at'),
      'la enumeracion de grants no ve las columnas que dice ver',
    );
    assert.notDeepEqual(lista, listaEsperada);
    await db.close();
  });
});

// ---------------------------------------------------------------------------
// T-012 · CONTROLES DE MUTACION — uno por fix, cada uno revirtiendo SOLO su linea.
// ---------------------------------------------------------------------------
describe('T-012 · controles de mutacion', () => {
  test('H-1 · con el EXECUTE de vuelta, la busqueda binaria recupera la duracion oculta', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant execute on function public.lesson_progress_completes(uuid, integer) to authenticated;`,
      ],
    });
    await seed(db);
    await sembrarLeccionOculta(db);

    // La RLS sigue ocultando la fila: la fuga es la funcion, no la tabla.
    const directo = await asStudent(db, () =>
      attempt(db, `select duration_seconds from public.lessons where id = $1`, [LESSON_OCULTA]),
    );
    assert.equal(directo.rows.length, 0);

    const r = await oraculo(db, LESSON_OCULTA, (fn) => asStudent(db, fn));
    assert.equal(r.denied, undefined, 'no era el revoke de EXECUTE lo que cerraba el oraculo');
    assert.equal(r.umbral, UMBRAL_OCULTO);
    assert.equal(r.duracion, DURACION_OCULTA, 'la duracion oculta se recupera exacta');
    await db.close();
  });

  test('H-1 · el fix no rompe el camino legitimo: el guard sigue certificando', async () => {
    // El riesgo del fix es el simetrico: si los guards hubieran quedado INVOKER sin EXECUTE, el
    // INSERT legitimo moriria con 42501 DENTRO del trigger. Se prueba con el guard vuelto a INVOKER.
    const { db } = await bootDatabase({
      afterMigrations: [
        `alter function public.guard_lesson_progress_insert() security invoker;`,
      ],
    });
    await seed(db);
    const r = await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 10)`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    assert.equal(r.ok, false, 'el guard INVOKER sin EXECUTE deberia morir dentro del trigger');
    assert.equal(r.code, PRIV_DENIED);
    await db.close();
  });

  test('constraint · con la version vieja, se publica una leccion incompletable', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        // SOLO la mitad que agrega T-012: vuelve el constraint tal cual lo dejo T-001.
        `alter table public.lessons drop constraint lessons_published_needs_video;
         alter table public.lessons add constraint lessons_published_needs_video
           check (not is_published or video_id is not null);`,
      ],
    });
    await seed(db);
    const LECCION = '60000000-0000-4000-8000-0000000000ff';
    const r = await asService(db, () =>
      attempt(
        db,
        `insert into public.lessons (id, course_id, module_id, position, title, video_id, duration_seconds, is_published)
         values ($1, $2, $3, 41, 'Publicada sin duracion', 'cQw4w9WgXcQ', 0, true)`,
        [LECCION, ID.courseA, ID.moduleA],
      ),
    );
    assert.equal(r.ok, true, 'no era el constraint lo que bloqueaba la publicacion');

    // Y el daño concreto que evita: la leccion se publica y es INCOMPLETABLE para siempre —
    // ni viendo un millon de segundos cruza un umbral que se calcula sobre duracion 0.
    await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 999999)`,
        [ID.student, ID.courseA, LECCION],
      ),
    );
    const fila = await progresoDe(db, LECCION);
    assert.equal(fila.completed, false, 'si completara, el constraint no estaria protegiendo nada');
    await db.close();
  });

  test('H-2 · el barrido ve un INSERT otorgado a `anon`', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`grant insert (body) on public.lesson_notes to anon;`],
    });
    assert.deepEqual(await columnasConInsert(db, 'anon'), ['lesson_notes.body']);
    // Y la version vieja del barrido (solo authenticated) no se enteraba:
    assert.deepEqual(await columnasConInsert(db, 'authenticated'), listaEsperada);
    await db.close();
  });

  test('punto 4 · con duration_seconds escribible, la docente certifica a toda la cohorte', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant update (duration_seconds) on public.lessons to authenticated;`,
        `drop trigger lessons_guard on public.lessons;`,
      ],
    });
    await seed(db);
    await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 10)`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    const antes = await progresoDe(db, ID.lessonA);
    assert.equal(antes.completed, false);

    const baja = await asOwnerTeacher(db, () =>
      attempt(db, `update public.lessons set duration_seconds = 5 where id = $1`, [ID.lessonA]),
    );
    assert.equal(baja.ok, true, 'no era el grant/guard lo que impedia mover la vara');

    // Basta la siguiente escritura de progreso del alumno — ni siquiera hay que tocar su fila.
    await asStudent(db, () =>
      attempt(db, `update public.lesson_progress set last_seen_at = now() where lesson_id = $1`, [
        ID.lessonA,
      ]),
    );
    const despues = await progresoDe(db, ID.lessonA);
    assert.equal(despues.completed, true, 'la vara movida no certificaba: el control seria vacuo');
    assert.equal(despues.seconds_watched, 10);
    await db.close();
  });
});

// ---------------------------------------------------------------------------
// T-015 · el reloj de `seconds_watched` deja de declararlo el alumno (0008_progress_clock_cap).
// Residuo declarado en ADR-007: `completed`/`duration_seconds` ya eran de servidor, pero
// `seconds_watched` lo seguia declarando el cliente en una sola escritura — `update ... set
// seconds_watched = duration_seconds` certificaba al instante. Cierre: entre dos escrituras
// separadas por N segundos de RELOJ REAL, `seconds_watched` no puede subir mas de 2N + 10
// (decision de producto: hasta 2x de velocidad cuenta, el scrub no).
// ---------------------------------------------------------------------------
describe('T-015 · tope de reloj sobre seconds_watched', () => {
  test('UPDATE que declare seconds_watched = duration_seconds de una sola vez queda ACOTADO, no rechazado', async () => {
    const { db } = await bootDatabase();
    await seed(db);
    await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 1)`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    // Sin backdate: cero segundos de reloj real entre la alta y esta escritura.
    const r = await asStudent(db, () =>
      attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
        DURACION_LESSON_A,
        ID.lessonA,
      ]),
    );
    assert.equal(r.ok, true, 'criterio 3: un salto imposible se acota, no se rechaza con error');
    const fila = await progresoDe(db, ID.lessonA);
    assert.ok(
      fila.seconds_watched < UMBRAL_LESSON_A,
      `la auto-certificacion instantanea paso: seconds_watched quedo en ${fila.seconds_watched}`,
    );
    assert.equal(fila.completed, false, 'se auto-certifico en una escritura sin tiempo de reloj real');
    await db.close();
  });

  test('el INSERT tambien queda acotado: no hay certificacion instantanea "de arranque"', async () => {
    const { db } = await bootDatabase();
    await seed(db);
    const lessonId = ID.lessonPreviewB; // dura 900 s, umbral 810 — alcanzable si no hubiera tope
    const r = await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 810)`,
        [ID.student, ID.courseA, lessonId],
      ),
    );
    assert.equal(r.ok, true, r.message);
    const fila = await progresoDe(db, lessonId);
    assert.ok(fila.seconds_watched < 810, `el INSERT no acoto: quedo en ${fila.seconds_watched}`);
    assert.equal(fila.completed, false);
    await db.close();
  });

  test('formula: con N segundos de reloj backdateados, el tope es exactamente 2N + 10', async () => {
    const { db } = await bootDatabase();
    await seed(db);
    await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 100)`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    const trasAlta = await progresoDe(db, ID.lessonA);
    assert.equal(trasAlta.seconds_watched, 10, 'el INSERT (N=0) deberia acotar a 10 (el margen)');

    await retrasarReloj(db, ID.lessonA, 50); // N = 50 s ⇒ tope = 2*50 + 10 = 110 ⇒ maximo 10+110=120
    const r = await asStudent(db, () =>
      attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
        99999,
        ID.lessonA,
      ]),
    );
    assert.equal(r.ok, true, r.message);
    const fila = await progresoDe(db, ID.lessonA);
    assert.equal(fila.seconds_watched, 120, 'el tope no siguio la formula 2N + margen');
    await db.close();
  });

  test('el progreso legitimo (con tiempo de reloj real de por medio) SI llega a completar', async () => {
    const { db } = await bootDatabase();
    await seed(db);
    await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
         values ($1, $2, $3, 5)`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    await retrasarReloj(db, ID.lessonA, 3000);
    const r = await asStudent(db, () =>
      attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
        UMBRAL_LESSON_A,
        ID.lessonA,
      ]),
    );
    assert.equal(r.ok, true, r.message);
    const fila = await progresoDe(db, ID.lessonA);
    assert.equal(fila.completed, true, 'el camino legitimo (con tiempo real de por medio) dejo de certificar');
    await db.close();
  });

  // ------------------------------------------------------------ criterio 4 · mutacion
  // Revierte SOLO la cota (el `least(...)` que la acota): los dos guards siguen pisando
  // `last_seen_at := now()`, siguen SECURITY DEFINER, la derivacion de `completed` sigue igual.
  // Asi el test aisla que es LA COTA — no otra capa coincidente — la que detiene el ataque, mismo
  // estandar que los controles de aislamiento de T-012 (H-3).
  describe('controles de mutacion', () => {
    const GUARD_UPDATE_SIN_COTA = `
      create or replace function public.guard_lesson_progress()
      returns trigger language plpgsql security definer set search_path = '' as $fn$
      begin
        new.seconds_watched := greatest(new.seconds_watched, old.seconds_watched);
        new.last_seen_at    := now();
        if old.completed then
          new.completed    := true;
          new.completed_at := old.completed_at;
        elsif public.lesson_progress_completes(new.lesson_id, new.seconds_watched) then
          new.completed    := true;
          new.completed_at := now();
        else
          new.completed    := false;
          new.completed_at := null;
        end if;
        return new;
      end;
      $fn$;`;

    const GUARD_INSERT_SIN_COTA = `
      create or replace function public.guard_lesson_progress_insert()
      returns trigger language plpgsql security definer set search_path = '' as $fn$
      begin
        new.last_seen_at := now();
        new.completed    := public.lesson_progress_completes(new.lesson_id, new.seconds_watched);
        new.completed_at := case when new.completed then now() else null end;
        return new;
      end;
      $fn$;`;

    test('UPDATE · con la cota revertida, la auto-certificacion instantanea vuelve a pasar', async () => {
      const { db } = await bootDatabase({ afterMigrations: [GUARD_UPDATE_SIN_COTA] });
      await seed(db);
      await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 1)`,
          [ID.student, ID.courseA, ID.lessonA],
        ),
      );
      // La MISMA escritura que el primer test de este describe prueba que queda acotada: sin la
      // cota, pasa completa y certifica en el acto — sin backdate, sin esperar nada.
      const r = await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
          DURACION_LESSON_A,
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(
        fila.seconds_watched,
        DURACION_LESSON_A,
        'la cota seguia activa: el mutante esta mal escrito',
      );
      assert.equal(fila.completed, true, 'con la cota revertida deberia auto-certificarse instantaneamente');
      await db.close();
    });

    test('INSERT · con la cota revertida, un alta directa en el umbral certifica de arranque', async () => {
      const { db } = await bootDatabase({ afterMigrations: [GUARD_INSERT_SIN_COTA] });
      await seed(db);
      const lessonId = ID.lessonPreviewB;
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 810)`,
          [ID.student, ID.courseA, lessonId],
        ),
      );
      assert.equal(r.ok, true, r.message);
      const fila = await progresoDe(db, lessonId);
      assert.equal(fila.seconds_watched, 810, 'la cota seguia activa: el mutante esta mal escrito');
      assert.equal(fila.completed, true, 'con la cota revertida deberia certificar en el INSERT mismo');
      await db.close();
    });

    test('el fix no rompe el camino legitimo: con la cota puesta, sigue certificando con tiempo real de por medio', async () => {
      // Control simetrico (mismo espiritu que T-012 H-1): si la cota estuviera mal y bloqueara
      // TODO incremento (no solo los imposibles), el progreso real dejaria de completar nunca.
      const { db } = await bootDatabase();
      await seed(db);
      await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 1)`,
          [ID.student, ID.courseA, ID.lessonA],
        ),
      );
      await retrasarReloj(db, ID.lessonA, 3000);
      const r = await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = $1 where lesson_id = $2`, [
          UMBRAL_LESSON_A,
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      const fila = await progresoDe(db, ID.lessonA);
      assert.equal(fila.completed, true);
      await db.close();
    });
  });
});

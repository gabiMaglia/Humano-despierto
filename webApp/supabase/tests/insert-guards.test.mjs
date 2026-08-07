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
// Criterio 4 · el barrido, ejecutable.
// Toda columna con INSERT para `authenticated`, leida del ACL crudo (pg_attribute.attacl), no de
// la lectura de 0003. Si alguien agrega una columna al grant, este test se pone rojo y obliga a
// decidir sobre ella — que es exactamente lo que no paso con lesson_progress.completed.
// ---------------------------------------------------------------------------
const columnasConInsert = async (db) =>
  (
    await db.query(`
      select c.relname || '.' || a.attname as col
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      cross join lateral aclexplode(a.attacl) acl
      join pg_roles r on r.oid = acl.grantee
      where n.nspname = 'public' and r.rolname = 'authenticated' and acl.privilege_type = 'INSERT'
    `)
  ).rows
    .map((r) => r.col)
    .sort();

const tablasConInsertEntero = async (db) =>
  (
    await db.query(`
      select c.relname as t
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) acl
      join pg_roles r on r.oid = acl.grantee
      where n.nspname = 'public' and r.rolname = 'authenticated' and acl.privilege_type = 'INSERT'
    `)
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

  // Guard nuevo (c.3): is_published y video_id fuera del grant Y bloqueadas por trigger.
  lessons: ['course_id', 'module_id', 'position', 'title', 'description', 'video_provider',
            'duration_seconds', 'is_preview'],

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
};

const listaEsperada = Object.entries(INSERT_ESPERADO)
  .flatMap(([t, cols]) => cols.map((c) => `${t}.${c}`))
  .sort();

describe('T-011 · guards de INSERT', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
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
  describe('c.3 · lessons: is_published y video_id son del servidor', () => {
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

    test('control positivo: crea la leccion y le cambia el titulo', async () => {
      const alta = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, duration_seconds)
           values ($1, $2, 22, 'Borrador de leccion', 600)`,
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

    test('control positivo: service_role si carga el video y publica (T-005)', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `update public.lessons set video_id = 'bQw4w9WgXcQ', is_published = true
           where position = 22 and course_id = $1`,
          [ID.courseA],
        ),
      );
      assert.equal(r.ok, true, `el guard alcanzo a service_role: ${r.message}`);
    });
  });

  // ------------------------------------------------------------ criterio 4
  describe('c.4 · barrido de TODO grant de INSERT para authenticated', () => {
    test('ninguna tabla tiene INSERT a nivel de TABLA: todo es whitelist de columnas', async () => {
      assert.deepEqual(await tablasConInsertEntero(db), []);
    });

    test('el whitelist de columnas es exactamente el declarado y decidido', async () => {
      assert.deepEqual(await columnasConInsert(db), listaEsperada);
    });

    test('las columnas de servidor no figuran en ningun grant de INSERT', async () => {
      const lista = await columnasConInsert(db);
      for (const col of [
        'lesson_progress.completed',
        'lesson_progress.completed_at',
        'courses.status',
        'courses.featured',
        'courses.published_at',
        'lessons.is_published',
        'lessons.video_id',
      ]) {
        assert.ok(!lista.includes(col), `${col} volvio al grant de INSERT`);
      }
    });

    test('las tablas sin alta desde el cliente siguen sin grant de INSERT', async () => {
      const lista = await columnasConInsert(db);
      for (const t of ['profiles', 'enrollments', 'lesson_resources']) {
        assert.ok(!lista.some((c) => c.startsWith(`${t}.`)), `${t} gano un grant de INSERT`);
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
        `grant insert (is_published, video_id) on public.lessons to authenticated;`,
        `drop trigger lessons_guard on public.lessons;`,
      ],
    });
    await seed(db);
    const r = await asOwnerTeacher(db, () =>
      attempt(
        db,
        `insert into public.lessons (course_id, module_id, position, title, video_id, is_published)
         values ($1, $2, 21, 'Nace publicada', 'HACKHACK123', true)`,
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
    const lista = await columnasConInsert(db);
    assert.ok(
      lista.includes('lesson_progress.completed') && lista.includes('lesson_progress.completed_at'),
      'la enumeracion de grants no ve las columnas que dice ver',
    );
    assert.notDeepEqual(lista, listaEsperada);
    await db.close();
  });
});

// T-001 · criterio 5 — TEST DE MUTACION REAL.
//
// No es inspeccion: cada caso ejecuta el DML del atacante contra un Postgres de verdad,
// con SET ROLE authenticated y los claims del JWT en `request.jwt.claims`, exactamente
// como los deja PostgREST. Se afirma sobre el SQLSTATE devuelto.
//
// El bloque "control negativo" del final revierte las guardas y verifica que los ataques
// SI pasan: sin eso, un test verde no probaria nada (playbook QA).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501'; // insufficient_privilege — cubre revoke de columna y violacion de RLS

const asStudent = (db, fn) =>
  asUser(db, { sub: ID.student, userRole: 'student' }, fn);
// Alumno SIN ninguna inscripcion: el que compra el curso mañana. Es el atacante realista
// de la clase "contenido pago" — tiene JWT valido, no tiene derecho al payload.
const asOutsider = (db, fn) =>
  asUser(db, { sub: ID.otro, userRole: 'student' }, fn);
const asOwnerTeacher = (db, fn) =>
  asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

/**
 * T-015 (0008_progress_clock_cap) acota cuanto puede subir `seconds_watched` segun el tiempo de
 * reloj real transcurrido desde `old.last_seen_at` — que el guard escribe siempre con `now()`.
 * El test de "no retrocede" de mas abajo escribe un salto grande en una sola sentencia sin que
 * pase tiempo real entre escrituras: no es lo que ese test prueba (prueba la MONOTONIA, no el
 * tope, que tiene su propia cobertura en insert-guards.test.mjs), asi que se lo desacopla
 * apagando el trigger SOLO para la escritura de preparacion.
 */
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

/** EXECUTE efectivo de cada funcion de `public`, mas su ACL cruda. */
const functionPrivileges = async (db) =>
  (
    await db.query(`
      select p.proname,
             has_function_privilege('public',        p.oid, 'execute') as pub,
             has_function_privilege('anon',          p.oid, 'execute') as anon,
             has_function_privilege('authenticated', p.oid, 'execute') as auth,
             coalesce(p.proacl::text, '') as acl,
             coalesce(array_to_string(p.proconfig, ','), '') as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
      order by p.proname
    `)
  ).rows;

describe('T-001 · RLS y privilegios contra un JWT de student', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ------------------------------------------------------------ criterio 5(a)
  describe('5(a) el alumno no puede auto-inscribirse', () => {
    test('INSERT en enrollments para un curso ajeno', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [
          ID.student,
          ID.courseB,
        ]),
      );
      assert.equal(r.ok, false, 'el alumno logro auto-inscribirse');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('INSERT enmascarado con el user_id de otro', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [
          ID.otro,
          ID.courseB,
        ]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('UPDATE de su propia inscripcion revocada a active', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.enrollments set status = 'active' where user_id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('DELETE de su propia inscripcion', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `delete from public.enrollments where user_id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la inscripcion sembrada sigue intacta', async () => {
      const r = await db.query(`select count(*)::int as n from public.enrollments where status = 'active'`);
      assert.equal(r.rows[0].n, 1);
    });
  });

  // ------------------------------------------------------------ criterio 5(b)
  describe('5(b) el alumno no puede promoverse', () => {
    test('UPDATE profiles.role sobre su propia fila', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.profiles set role = 'teacher' where id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false, 'auto-promocion a teacher exitosa');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('UPDATE profiles.role a admin', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.profiles set role = 'admin' where id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('INSERT de un profile paralelo con rol admin', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `insert into public.profiles (id, role) values ($1, 'admin')`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('un JWT que MIENTE el claim user_role=admin no alcanza', async () => {
      // El claim es una foto del token; la autoridad es profiles.role.
      const r = await asUser(db, { sub: ID.student, userRole: 'admin' }, () =>
        attempt(db, `update public.profiles set role = 'admin' where id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el rol en la DB sigue siendo student', async () => {
      const r = await db.query(`select role from public.profiles where id = $1`, [ID.student]);
      assert.equal(r.rows[0].role, 'student');
    });
  });

  // ------------------------------------------------------------ criterio 5(c)
  describe('5(c) el alumno no puede publicar un curso ajeno', () => {
    test('UPDATE courses.status sobre el borrador de otra docente', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.courses set status = 'published' where id = $1`, [ID.courseDraft]),
      );
      assert.equal(r.ok, false, 'publico un curso ajeno');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('UPDATE de contenido de un curso ajeno', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.courses set title = 'secuestrado' where id = $1`, [ID.courseB]),
      );
      // Aca SI hay grant de columna: el corte lo hace RLS, que filtra la fila -> 0 filas, sin error.
      assert.equal(r.ok, true);
      const check = await db.query(`select title from public.courses where id = $1`, [ID.courseB]);
      assert.equal(check.rows[0].title, 'Astrologia natal', 'RLS no filtro el UPDATE ajeno');
    });

    test('INSERT de curso propio: student no es autor', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id)
           values ('trucho', 'Trucho', 'magia', 'iniciacion', $1)`,
          [ID.student],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni siquiera la docente dueña publica su propio curso desde el cliente', async () => {
      const r = await asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, () =>
        attempt(db, `update public.courses set status = 'published' where id = $1`, [ID.courseDraft]),
      );
      assert.equal(r.ok, false, 'publicar es privilegio de service_role (T-008)');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el borrador sigue en draft', async () => {
      const r = await db.query(`select status from public.courses where id = $1`, [ID.courseDraft]);
      assert.equal(r.rows[0].status, 'draft');
    });
  });

  // ------------------------------------------------------------ ADR-003
  describe('ADR-003 · video_id no se sirve al cliente', () => {
    test('el alumno INSCRIPTO tampoco puede leer la columna con la anon key', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select video_id from public.lessons where id = $1`, [ID.lessonA]),
      );
      assert.equal(r.ok, false, 'video_id filtrado a un cliente PostgREST');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('select * sobre lessons falla en vez de filtrar en silencio', async () => {
      const r = await asStudent(db, () => attempt(db, `select * from public.lessons`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('las columnas del whitelist si se leen', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select id, title, duration_seconds, is_preview from public.lessons where course_id = $1`, [
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true);
      assert.equal(r.rows.length, 2);
    });

    // -------------------------------------------------- defecto 4 (cobertura que faltaba)
    test('anon tampoco lee video_id', async () => {
      const r = await asAnon(db, () => attempt(db, `select video_id from public.lessons`));
      assert.equal(r.ok, false, 'video_id filtrado a la anon key sin JWT');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('anon: select * sobre lessons falla', async () => {
      const r = await asAnon(db, () => attempt(db, `select * from public.lessons`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    // Sin SELECT sobre la columna tampoco se la puede usar como oraculo booleano
    // (`?video_id=eq.X` en PostgREST): filtrar por ella exige el mismo privilegio que leerla.
    test('no se puede usar video_id como oraculo en el WHERE', async () => {
      for (const run of [asAnon, asStudent]) {
        const r = await run(db, () =>
          attempt(db, `select id from public.lessons where video_id = $1`, [SECRET.videoId]),
        );
        assert.equal(r.ok, false, 'video_id adivinable por filtro');
        assert.equal(r.code, PRIV_DENIED);
      }
    });

    test('ni el ORDER BY', async () => {
      const r = await asStudent(db, () => attempt(db, `select id from public.lessons order by video_id`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la docente DUEÑA no puede escribir video_id por UPDATE', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lessons set video_id = 'HACKHACK123' where id = $1`, [ID.lessonA]),
      );
      assert.equal(r.ok, false, 'video_id escribible desde el cliente');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la docente DUEÑA no puede fijar video_id en el INSERT', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title, video_id)
           values ($1, $2, 9, 'Colada', 'HACKHACK123')`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el video sembrado sigue siendo el original', async () => {
      const r = await db.query(`select video_id from public.lessons where id = $1`, [ID.lessonA]);
      assert.equal(r.rows[0].video_id, SECRET.videoId);
    });

    test('control positivo: la docente si crea la leccion, sin el video', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lessons (course_id, module_id, position, title) values ($1, $2, 8, 'Sin video')`,
          [ID.courseA, ID.moduleA],
        ),
      );
      assert.equal(r.ok, true, r.message);
      await db.query(`delete from public.lessons where position = 8 and course_id = $1`, [ID.courseA]);
    });
  });

  // ------------------------------------------------------------ defecto 1 · ADR-003 (clase)
  describe('ADR-003 · lesson_resources: el localizador del material pago no se sirve al cliente', () => {
    const LOCATORS = ['drive_file_id', 'url'];

    test('anon no lee ni drive_file_id ni url', async () => {
      for (const col of LOCATORS) {
        const r = await asAnon(db, () => attempt(db, `select ${col} from public.lesson_resources`));
        assert.equal(r.ok, false, `${col} legible con la anon key sola`);
        assert.equal(r.code, PRIV_DENIED);
      }
    });

    test('un alumno SIN inscripcion tampoco', async () => {
      for (const col of LOCATORS) {
        const r = await asOutsider(db, () => attempt(db, `select ${col} from public.lesson_resources`));
        assert.equal(r.ok, false, `${col} legible por un alumno no inscripto`);
        assert.equal(r.code, PRIV_DENIED);
      }
    });

    test('ni el alumno INSCRIPTO: la columna va por Server Action, no por PostgREST', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select drive_file_id, url from public.lesson_resources`),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni la docente dueña del curso', async () => {
      const r = await asOwnerTeacher(db, () => attempt(db, `select url from public.lesson_resources`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('select * falla en vez de devolver el localizador en silencio', async () => {
      const r = await asAnon(db, () => attempt(db, `select * from public.lesson_resources`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('no se puede usar url como oraculo en el WHERE', async () => {
      const r = await asOutsider(db, () =>
        attempt(db, `select id from public.lesson_resources where url like 'https://drive%'`),
      );
      assert.equal(r.ok, false, 'url adivinable por filtro');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el cliente no puede INSERTAR un recurso (alta = Server Action)', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.lesson_resources (course_id, lesson_id, position, type, name, url)
           values ($1, $2, 5, 'pdf', 'Colado', 'https://evil.test/x')`,
          [ID.courseA, ID.lessonA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el cliente no puede reescribir el localizador por UPDATE', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lesson_resources set url = 'https://evil.test/x' where id = $1`, [
          ID.resourceA,
        ]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el localizador sembrado sigue intacto', async () => {
      const r = await db.query(`select drive_file_id, url from public.lesson_resources where id = $1`, [
        ID.resourceA,
      ]);
      assert.equal(r.rows[0].drive_file_id, SECRET.driveFileId);
      assert.equal(r.rows[0].url, SECRET.url);
    });

    test('control positivo: el catalogo sigue diciendo QUE incluye el curso (T-004 c.4)', async () => {
      const r = await asAnon(db, () =>
        attempt(db, `select type, name, size_label from public.lesson_resources`),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
      assert.equal(r.rows[0].name, 'Cuaderno de trabajo');
      assert.equal(r.rows[0].size_label, '2.4 MB');
    });

    test('control positivo: service_role si lee el localizador (es quien lo sirve)', async () => {
      const r = await asService(db, () =>
        attempt(db, `select drive_file_id, url from public.lesson_resources where id = $1`, [ID.resourceA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].drive_file_id, SECRET.driveFileId);
    });
  });

  // ------------------------------------------------------------ defecto 1b · causa raiz
  describe('has_course_access() compuerta una lectura real: lesson_chapters', () => {
    const CHAPTERS = `select label from public.lesson_chapters order by label`;
    const labels = (r) => r.rows.map((x) => x.label);

    test('anon solo ve los capitulos de la leccion de vista previa', async () => {
      const r = await asAnon(db, () => attempt(db, CHAPTERS));
      assert.equal(r.ok, true, `la policy de anon rompio en vez de filtrar: ${r.message}`);
      assert.deepEqual(labels(r), ['Que vas a ver'], 'anon vio capitulos de contenido pago');
    });

    test('un alumno sin inscripcion ve lo mismo que anon', async () => {
      const r = await asOutsider(db, () => attempt(db, CHAPTERS));
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(labels(r), ['Que vas a ver']);
    });

    test('el alumno INSCRIPTO ve los capitulos pagos', async () => {
      const r = await asStudent(db, () => attempt(db, CHAPTERS));
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(labels(r), ['Apertura del arcano', 'Que vas a ver']);
    });

    test('la docente dueña ve los suyos sin estar inscripta', async () => {
      const r = await asOwnerTeacher(db, () => attempt(db, CHAPTERS));
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(labels(r), ['Apertura del arcano', 'Que vas a ver']);
    });

    test('otra docente no ve los capitulos de un curso ajeno', async () => {
      const r = await asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, () => attempt(db, CHAPTERS));
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(labels(r), ['Que vas a ver']);
    });

    test('el admin ve todo', async () => {
      const r = await asUser(db, { sub: ID.admin, userRole: 'admin' }, () => attempt(db, CHAPTERS));
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(labels(r), ['Apertura del arcano', 'Que vas a ver']);
    });
  });

  // ------------------------------------------------------------ defecto 2
  describe('privilegios de EXECUTE: ninguna funcion de public queda abierta a PUBLIC', () => {
    test('ninguna funcion de public tiene EXECUTE para PUBLIC', async () => {
      const abiertas = (await functionPrivileges(db)).filter((f) => f.pub).map((f) => f.proname);
      assert.deepEqual(abiertas, [], `EXECUTE a PUBLIC en: ${abiertas.join(', ')}`);
    });

    // Directo sobre el ACL, no sobre el privilegio efectivo. En un ACL de Postgres el
    // beneficiario PUBLIC se escribe como entrada SIN nombre (`=X/postgres`); y un proacl
    // NULO significa "privilegios por defecto", que para una funcion es EXECUTE a PUBLIC.
    // Las dos formas del agujero, entonces, y ninguna se ve mirando solo `=X/` como substring
    // (`postgres=X/postgres` la contiene y es legitima).
    test('ninguna funcion lleva a PUBLIC en su ACL', async () => {
      const abiertas = (await functionPrivileges(db))
        .filter((f) => {
          if (f.acl === '') return true; // proacl null ⇒ default ⇒ PUBLIC tiene EXECUTE
          const entradas = f.acl.replace(/^\{|\}$/g, '').split(',');
          return entradas.some((e) => e.startsWith('='));
        })
        .map((f) => f.proname);
      assert.deepEqual(abiertas, [], `ACL con PUBLIC en: ${abiertas.join(', ')}`);
    });

    test('anon y authenticated solo tienen EXECUTE donde se lo otorgo a mano', async () => {
      const ESPERADO_ANON = [
        'can_read_course', 'current_app_role', 'is_admin', 'lesson_is_preview', 'owns_course',
      ];
      // `is_service_context` sigue siendo la unica excepcion: la llaman `guard_courses_insert` y
      // `guard_lessons`, que son SECURITY INVOKER. `lesson_progress_completes` (T-011) estuvo aca
      // una ronda y salio en T-012 (H-1): con EXECUTE para el cliente era un oraculo de
      // `duration_seconds` sobre lecciones que la RLS oculta.
      // T-016 suma `text_has_locator`/`array_has_locator`: la expresion de un CHECK se evalua con
      // los privilegios de QUIEN ESCRIBE, asi que sin EXECUTE la docente no puede renombrar su
      // propio PDF (42501 dentro del CHECK — medido en el control c.3 de locator-free-text).
      // No son oraculo de nada: son puras sobre un texto que el llamador ya tiene, no leen tablas.
      // A `anon` no se le otorgan: no tiene ningun grant de escritura, nunca evalua un CHECK.
      // T-021 suma `can_read_campus_thread`/`can_write_campus_post`/`is_campus_moderator`: leen
      // `enrollments` (via `has_course_access`) igual que ella, y por la misma razon no se le
      // otorgan a `anon` — el Campus entero exige sesion, ni el hilo general es publico.
      // 0016 suma `body_has_known_locator`, y esta SI es distinta de las de arriba: es
      // SECURITY DEFINER y lee columnas `service_role`-only (`lessons.video_id`,
      // `lesson_resources.drive_file_id`). Necesita EXECUTE porque la llama el guard trigger,
      // que es SECURITY INVOKER a proposito. Es un oraculo acotado —responde si/no sobre un
      // string que el llamador YA tiene, sin decir de que curso es ni devolver ningun
      // localizador— y esta declarado como tal en la cabecera de 0016. A `anon` no se le otorga.
      const ESPERADO_AUTH = [
        ...ESPERADO_ANON, 'array_has_locator', 'body_has_known_locator', 'campus_post_authors',
        'can_author', 'can_read_campus_thread', 'can_write_campus_post', 'has_course_access',
        'is_campus_moderator', 'is_service_context', 'text_has_locator',
      ].sort();
      const fns = await functionPrivileges(db);
      assert.deepEqual(fns.filter((f) => f.anon).map((f) => f.proname).sort(), ESPERADO_ANON);
      assert.deepEqual(fns.filter((f) => f.auth).map((f) => f.proname).sort(), ESPERADO_AUTH);
    });

    test('las 5 trigger functions de 0005 no son invocables por el cliente', async () => {
      const guards = ['guard_profiles', 'guard_courses', 'guard_enrollments', 'guard_lesson_progress',
                      'sync_published_at'];
      const fns = await functionPrivileges(db);
      for (const g of guards) {
        const f = fns.find((x) => x.proname === g);
        assert.ok(f, `falta ${g}`);
        assert.deepEqual([f.pub, f.anon, f.auth], [false, false, false], `${g} invocable`);
      }
    });

    // El riesgo del fix: is_service_context() se llama DESDE los guards, que son SECURITY INVOKER.
    // Si el revoke la alcanzara, el UPDATE legitimo moriria con 42501 dentro del trigger.
    test('control positivo: el guard sigue corriendo para un alumno legitimo', async () => {
      const ok = await asStudent(db, () =>
        attempt(db, `update public.profiles set bio = 'aprendiendo' where id = $1`, [ID.student]),
      );
      assert.equal(ok.ok, true, `el revoke rompio el camino legitimo: ${ok.message}`);

      const bloqueado = await asStudent(db, () =>
        attempt(db, `update public.profiles set full_name = 'x', role = 'admin' where id = $1`, [ID.student]),
      );
      assert.equal(bloqueado.ok, false);
      assert.equal(bloqueado.code, PRIV_DENIED);
    });
  });

  // ------------------------------------------------------------ defecto 3
  describe('higiene de search_path', () => {
    test('toda funcion de public fija search_path', async () => {
      const sinFijar = (await functionPrivileges(db))
        .filter((f) => !f.config.includes('search_path='))
        .map((f) => f.proname);
      assert.deepEqual(sinFijar, [], `sin search_path: ${sinFijar.join(', ')}`);
    });

    test('is_service_context califica pg_roles', async () => {
      const r = await db.query(
        `select p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'is_service_context'`,
      );
      assert.match(r.rows[0].prosrc, /pg_catalog\.pg_roles/);
    });
  });

  // ------------------------------------------------------------ defecto 5
  describe('5(c-bis) courses.status tampoco se fija en el INSERT', () => {
    test('la docente no se autopublica al crear el curso', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, status, published_at)
           values ('autopublicado', 'Autopublicado', 'tarot', 'iniciacion', $1, 'published', now())`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, false, 'se publico un curso al momento de crearlo');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('tampoco nombrando status en el INSERT aunque sea para poner draft', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, status)
           values ('explicito', 'Explicito', 'tarot', 'iniciacion', $1, 'draft')`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, false, 'la columna status no debe existir para el cliente');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni featured: la curaduria no la decide el docente', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id, featured)
           values ('destacado', 'Destacado', 'tarot', 'iniciacion', $1, true)`,
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
           values ('nace-draft', 'Nace en draft', 'tarot', 'iniciacion', $1)`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, true, r.message);
      const check = await db.query(
        `select status, published_at from public.courses where slug = 'nace-draft'`,
      );
      assert.equal(check.rows[0].status, 'draft');
      assert.equal(check.rows[0].published_at, null);
    });

    test('ninguno de los cursos colados existe', async () => {
      const r = await db.query(
        `select count(*)::int as n from public.courses
         where slug in ('autopublicado', 'explicito', 'destacado')`,
      );
      assert.equal(r.rows[0].n, 0);
    });
  });

  // ------------------------------------------------------------ controles positivos
  describe('controles positivos (el esquema no esta simplemente cerrado a todo)', () => {
    test('el alumno edita su propio nombre', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.profiles set full_name = 'Alumna Despierta' where id = $1`, [ID.student]),
      );
      assert.equal(r.ok, true);
      const check = await db.query(`select full_name from public.profiles where id = $1`, [ID.student]);
      assert.equal(check.rows[0].full_name, 'Alumna Despierta');
    });

    test('el alumno registra progreso en el curso donde SI esta inscripto', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 120)`,
          [ID.student, ID.courseA, ID.lessonA],
        ),
      );
      assert.equal(r.ok, true, r.message);
    });

    test('el progreso no retrocede (race de dos pestañas)', async () => {
      // T-015: sin esto, el tope de reloj (0008) recortaria el salto a 900 en una escritura sin
      // tiempo real de por medio — correcto para un ataque, pero no es lo que este test prueba.
      await retrasarReloj(db, ID.lessonA, 3000);
      await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = 900 where lesson_id = $1`, [ID.lessonA]),
      );
      await asStudent(db, () =>
        attempt(db, `update public.lesson_progress set seconds_watched = 30 where lesson_id = $1`, [ID.lessonA]),
      );
      const check = await db.query(`select seconds_watched from public.lesson_progress where lesson_id = $1`, [
        ID.lessonA,
      ]);
      assert.equal(check.rows[0].seconds_watched, 900);
    });

    test('anon lee el catalogo publicado y no los borradores', async () => {
      const r = await asAnon(db, () => attempt(db, `select id from public.courses`));
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 2);
    });

    test('anon recorre el arbol de contenido de un curso publicado', async () => {
      // Cubre que las policies `to anon` no invoquen helpers sin EXECUTE para anon:
      // eso rompe el catalogo publico con 42501 en vez de filtrar filas.
      const mods = await asAnon(db, () => attempt(db, `select id from public.course_modules`));
      const less = await asAnon(db, () => attempt(db, `select id, title from public.lessons`));
      assert.equal(mods.ok, true, mods.message);
      assert.equal(less.ok, true, less.message);
      assert.equal(less.rows.length, 2);
    });

    test('anon no puede escribir en ningun lado', async () => {
      const r = await asAnon(db, () =>
        attempt(db, `update public.profiles set full_name = 'x' where id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('service_role si hace las tres cosas prohibidas', async () => {
      await db.exec(`set role service_role;`);
      const enroll = await attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [
        ID.student,
        ID.courseB,
      ]);
      const promote = await attempt(db, `update public.profiles set role = 'teacher' where id = $1`, [ID.otro]);
      const publish = await attempt(db, `update public.courses set status = 'published' where id = $1`, [
        ID.courseDraft,
      ]);
      await db.exec(`reset role;`);
      assert.equal(enroll.ok, true, enroll.message);
      assert.equal(promote.ok, true, promote.message);
      assert.equal(publish.ok, true, publish.message);
    });
  });
});

// ---------------------------------------------------------------------------
// CONTROL NEGATIVO — prueba de que los tests de arriba no son vacuos.
// ---------------------------------------------------------------------------
describe('control negativo · con las guardas revertidas los ataques SI pasan', () => {
  const SEC01 = `grant all on all tables in schema public to authenticated;`;

  test('regresion parcial (vuelve el grant de tabla): los triggers todavia aguantan', async () => {
    // Escenario literal de fixia: alguien re-agrega un GRANT de tabla y el revoke por
    // columna deja de tener efecto. La segunda capa tiene que sostener.
    const { db } = await bootDatabase({ afterMigrations: [SEC01] });
    await seed(db);
    const promote = await asStudent(db, () =>
      attempt(db, `update public.profiles set role = 'admin' where id = $1`, [ID.student]),
    );
    assert.equal(promote.ok, false, 'con el grant de tabla de vuelta no quedo ninguna guarda');
    assert.match(promote.message, /service_role/, 'no lo corto el trigger sino otra cosa');
    await db.close();
  });

  test('regresion total (grant de tabla + triggers caidos): los tres ataques pasan', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        SEC01,
        `drop trigger profiles_guard    on public.profiles;
         drop trigger courses_guard     on public.courses;
         drop trigger enrollments_guard on public.enrollments;
         create policy regresion_enroll on public.enrollments for all to authenticated using (true) with check (true);
         create policy regresion_course on public.courses     for update to authenticated using (true) with check (true);`,
      ],
    });
    await seed(db);

    const enroll = await asStudent(db, () =>
      attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [ID.student, ID.courseB]),
    );
    const promote = await asStudent(db, () =>
      attempt(db, `update public.profiles set role = 'teacher' where id = $1`, [ID.student]),
    );
    const publish = await asStudent(db, () =>
      attempt(db, `update public.courses set status = 'published' where id = $1`, [ID.courseDraft]),
    );

    assert.equal(enroll.ok, true, 'el test de auto-inscripcion pasaria aun con el bug presente');
    assert.equal(promote.ok, true, 'el test de auto-promocion pasaria aun con el bug presente');
    assert.equal(publish.ok, true, 'el test de publicacion ajena pasaria aun con el bug presente');
    await db.close();
  });

  // ---------------------------------------------------------------------
  // Un control por defecto corregido en esta ronda. Cada uno revierte SOLO la linea del fix
  // y comprueba que el ataque vuelve a pasar: si no volviera, el test de arriba estaria
  // verde por otra razon (RLS, fila ausente, tipo mal) y no probaria nada.
  // ---------------------------------------------------------------------

  test('defecto 1 · si vuelve el grant de columna, el material pago se lee sin login', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant select (drive_file_id, url) on public.lesson_resources to anon, authenticated;`,
      ],
    });
    await seed(db);
    const fuga = await asAnon(db, () =>
      attempt(db, `select drive_file_id, url from public.lesson_resources`),
    );
    assert.equal(fuga.ok, true, 'el revoke de columna no era lo que sostenia el test');
    assert.equal(fuga.rows[0].drive_file_id, SECRET.driveFileId);
    await db.close();
  });

  test('defecto 1b · si la policy vuelve a can_read_course, los capitulos pagos se leen sin inscripcion', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `drop policy lesson_chapters_read_preview on public.lesson_chapters;
         drop policy lesson_chapters_read_access  on public.lesson_chapters;
         create policy lesson_chapters_read on public.lesson_chapters
           for select to anon, authenticated using (public.can_read_course(course_id));`,
      ],
    });
    await seed(db);
    const fuga = await asAnon(db, () => attempt(db, `select label from public.lesson_chapters`));
    assert.equal(fuga.ok, true, fuga.message);
    assert.equal(fuga.rows.length, 2, 'el corte por fila no era lo que sostenia el test');
    await db.close();
  });

  test('defecto 2 · sin el revoke final, las funciones de 0005 quedan abiertas a PUBLIC', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`grant execute on all functions in schema public to public;`],
    });
    const abiertas = (await functionPrivileges(db)).filter((f) => f.pub).map((f) => f.proname);
    assert.ok(
      abiertas.includes('guard_profiles') && abiertas.includes('sync_published_at'),
      'la asercion de EXECUTE no detecta el estado que dice detectar',
    );
    await db.close();
  });

  test('defecto 3 · la asercion de search_path detecta una funcion sin fijar', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `create or replace function public.set_updated_at()
         returns trigger language plpgsql as $fn$
         begin new.updated_at := now(); return new; end;
         $fn$;`,
      ],
    });
    const sinFijar = (await functionPrivileges(db))
      .filter((f) => !f.config.includes('search_path='))
      .map((f) => f.proname);
    assert.deepEqual(sinFijar, ['set_updated_at'], 'la asercion de search_path es vacua');
    await db.close();
  });

  test('defecto 4 · si video_id vuelve al whitelist, se lee y se escribe desde el cliente', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant select (video_id) on public.lessons to anon, authenticated;
         grant update (video_id) on public.lessons to authenticated;`,
        // T-011 agrego la SEGUNDA capa de escritura (lessons_guard). Para seguir demostrando
        // lo que este control demuestra —que el revoke de columna era la barrera de T-001—
        // hay que revertir tambien la capa nueva. Con una sola revertida, el ataque no pasa:
        // eso lo prueba el control c.3 de tests/insert-guards.test.mjs.
        `drop trigger lessons_guard on public.lessons;`,
      ],
    });
    await seed(db);
    const leer = await asAnon(db, () => attempt(db, `select video_id from public.lessons`));
    const escribir = await asOwnerTeacher(db, () =>
      attempt(db, `update public.lessons set video_id = 'HACKHACK123' where id = $1`, [ID.lessonA]),
    );
    assert.equal(leer.ok, true, 'el revoke de columna no era lo que sostenia la lectura');
    assert.equal(leer.rows[0].video_id, SECRET.videoId);
    assert.equal(escribir.ok, true, 'el revoke de columna no era lo que sostenia la escritura');
    await db.close();
  });

  test('defecto 5 · con status en el grant de INSERT, la docente se autopublica', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (status, published_at) on public.courses to authenticated;`,
        // Idem: T-011 sumo courses_guard_insert como segunda capa del alta.
        `drop trigger courses_guard_insert on public.courses;`,
      ],
    });
    await seed(db);
    const r = await asOwnerTeacher(db, () =>
      attempt(
        db,
        `insert into public.courses (slug, title, discipline, level, teacher_id, status)
         values ('autopublicado', 'Autopublicado', 'tarot', 'iniciacion', $1, 'published')`,
        [ID.teacherA],
      ),
    );
    assert.equal(r.ok, true, 'el grant de columna no era lo que bloqueaba el INSERT');
    const check = await db.query(`select status from public.courses where slug = 'autopublicado'`);
    assert.equal(check.rows[0].status, 'published');
    // Lo que este control revelo en T-001: en el INSERT la unica capa era el grant de columna,
    // porque courses_guard es BEFORE UPDATE. Cerrado en T-011 con courses_guard_insert.
    await db.close();
  });
});

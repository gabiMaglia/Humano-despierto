// T-021 · Campus — un hilo por curso + un hilo general — TEST DE MUTACION REAL.
//
// Mismo estandar que el resto de la suite (rls-mutation, insert-guards, locator-free-text):
// cada caso ejecuta el DML del atacante contra un Postgres de verdad, con SET ROLE
// authenticated/anon y los claims del JWT en `request.jwt.claims`, exactamente como los deja
// PostgREST. Se afirma sobre el SQLSTATE devuelto, no sobre lo que el codigo "deberia" hacer.
//
// Fixtures reusados de `seed.mjs` (T-001): `ID.student` esta inscripto ACTIVO en `courseA`
// (dueño `ID.teacherA`) y NO en `courseB` (dueño `ID.teacherB`); `ID.otro` no tiene ninguna
// inscripcion; `ID.admin` es admin.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
// Inscripta en courseA, sin ninguna relacion con courseB — la atacante realista de
// "moderar/editar sin ser quien corresponde" dentro de un hilo al que SI tiene acceso.
const asOutsider = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);
const asOwnerTeacher = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asOtherTeacher = (db, fn) => asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, fn);
const asAdmin = (db, fn) => asUser(db, { sub: ID.admin, userRole: 'admin' }, fn);

const asOwner = async (db, sql, params = []) => {
  await db.exec(`reset role;`);
  const r = await db.query(sql, params);
  return r.rows;
};

const insertPost = (db, actorFn, courseId, body, authorId) =>
  actorFn(db, () =>
    attempt(
      db,
      `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, $3) returning id`,
      [courseId, authorId, body],
    ),
  );

describe('T-021 · Campus — RLS de campus_posts', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- criterio 1 · escritura
  describe('criterio 1 · el hilo de curso solo lo escribe quien tiene inscripcion activa', () => {
    test('sin ninguna inscripcion, el INSERT es rechazado', async () => {
      const r = await insertPost(db, asOutsider, ID.courseA, 'Hola, recien llego', ID.otro);
      assert.equal(r.ok, false, 'escribio sin estar inscripta');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('con inscripcion activa, el INSERT pasa', async () => {
      const r = await insertPost(db, asStudent, ID.courseA, '¿Alguien mas sintio esto en la practica de hoy?', ID.student);
      assert.equal(r.ok, true, r.message);
    });

    test('la misma alumna, en un curso donde NO esta inscripta, es rechazada', async () => {
      const r = await insertPost(db, asStudent, ID.courseB, 'Quiero opinar aca tambien', ID.student);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la docente dueña SI puede escribir en el hilo de su propio curso (decision documentada en 0014)', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.courseA, 'Buena pregunta — lo vemos en la proxima clase.', ID.teacherA);
      assert.equal(r.ok, true, r.message);
    });

    test('una docente sin relacion con el curso no puede escribir en su hilo', async () => {
      const r = await insertPost(db, asOtherTeacher, ID.courseA, 'Me meto en un curso que no es mio', ID.teacherB);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el hilo general lo escribe cualquiera con sesion, sin inscripcion a nada', async () => {
      const r = await insertPost(db, asOutsider, null, 'Hola a todas, soy nueva por aca', ID.otro);
      assert.equal(r.ok, true, r.message);
    });

    test('sin sesion (anon) no se escribe ni en el general', async () => {
      const r = await asAnon(db, () =>
        attempt(db, `insert into public.campus_posts (course_id, author_id, body) values (null, $1, 'hola')`, [ID.otro]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('nadie nace borrada: declarar deleted_at en el INSERT se rechaza', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `insert into public.campus_posts (course_id, author_id, body, deleted_at, deleted_by, deleted_reason)
           values ($1, $2, 'x', now(), $2, 'motivo')`,
          [ID.courseA, ID.student],
        ),
      );
      assert.equal(r.ok, false, 'se pudo insertar ya borrado');
    });
  });

  // ---------------------------------------------------------------- criterio 2 · soft delete
  describe('criterio 2 · borrar es soft delete con autor y motivo', () => {
    let postId;

    before(async () => {
      const r = await insertPost(db, asStudent, ID.courseA, 'Mensaje que despues se va a borrar', ID.student);
      assert.equal(r.ok, true, r.message);
      postId = r.rows[0].id;
    });

    test('el hard DELETE esta bloqueado incluso para la docente moderadora', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `delete from public.campus_posts where id = $1`, [postId]),
      );
      assert.equal(r.ok, false, 'se pudo hacer DELETE real');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el soft delete sin motivo es rechazado', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = '   ' where id = $2`,
          [ID.teacherA, postId],
        ),
      );
      assert.equal(r.ok, false, 'borro sin motivo real');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la docente dueña SI puede moderar (soft delete) su propio hilo, con motivo', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'fuera de tema' where id = $2`,
          [ID.teacherA, postId],
        ),
      );
      assert.equal(r.ok, true, r.message);
      const rows = await asOwner(db, `select deleted_at, deleted_by, deleted_reason, body from public.campus_posts where id = $1`, [postId]);
      assert.notEqual(rows[0].deleted_at, null);
      assert.equal(rows[0].deleted_by, ID.teacherA);
      assert.equal(rows[0].deleted_reason, 'fuera de tema');
      // El cuerpo original queda LEGIBLE: es la razon del PO ("sin eso no hay forma de discutir
      // una decision de moderacion") — el soft delete no vacia `body`.
      assert.equal(rows[0].body, 'Mensaje que despues se va a borrar');
    });

    test('un mensaje ya borrado queda congelado: no se re-edita ni se re-borra', async () => {
      const r1 = await asStudent(db, () =>
        attempt(db, `update public.campus_posts set body = 'intento reescribir' where id = $1`, [postId]),
      );
      assert.equal(r1.ok, false);
      const r2 = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_reason = 'motivo distinto' where id = $1`,
          [postId],
        ),
      );
      assert.equal(r2.ok, false);
    });
  });

  // ---------------------------------------------------------------- moderar sin ser moderadora
  describe('moderar sin ser quien corresponde ("moderar curso ajeno")', () => {
    let postId;

    before(async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.courseA, 'Aviso de la docente en su propio hilo', ID.teacherA);
      assert.equal(r.ok, true, r.message);
      postId = r.rows[0].id;
    });

    test('una alumna inscripta (participante, no moderadora) no puede borrar el mensaje de la docente', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'no me gusta' where id = $2`,
          [ID.student, postId],
        ),
      );
      assert.equal(r.ok, false, 'una participante sin rol de moderadora pudo borrar');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('una docente SIN relacion con el curso ni siquiera ve la fila para intentar moderarla', async () => {
      // teacherB no esta inscripta en courseA ni lo posee: la fila queda afuera del USING de
      // UPDATE (misma semantica que el resto del esquema, ver rls-mutation.test.mjs:179-186) y
      // el intento es un no-op silencioso, no un error — se afirma sobre el estado real, no
      // sobre la respuesta.
      const r = await asOtherTeacher(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'ajena' where id = $2`,
          [ID.teacherB, postId],
        ),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'la fila de un curso ajeno fue visible para actualizar');
      const rows = await asOwner(db, `select deleted_at from public.campus_posts where id = $1`, [postId]);
      assert.equal(rows[0].deleted_at, null, 'quedo borrado por una docente ajena');
    });

    test('el admin SI puede moderar el hilo de un curso que no es suyo', async () => {
      const r = await asAdmin(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'moderacion admin' where id = $2`,
          [ID.admin, postId],
        ),
      );
      assert.equal(r.ok, true, r.message);
    });
  });

  // ---------------------------------------------------------------- editar mensaje de otro
  describe('editar el mensaje de otra persona', () => {
    let postId;

    before(async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.courseA, 'Texto original de la docente', ID.teacherA);
      assert.equal(r.ok, true, r.message);
      postId = r.rows[0].id;
    });

    test('otra alumna no puede editar el cuerpo de un mensaje ajeno', async () => {
      const r = await asOutsider(db, () =>
        // asOutsider no esta inscripta, asi que ni siquiera VE el hilo de courseA: se prueba
        // primero con la alumna inscripta, que si lo ve y aun asi no puede editarlo.
        attempt(db, `update public.campus_posts set body = 'lo cambio yo' where id = $1`, [postId]),
      );
      assert.equal(r.ok, true, r.message); // no-op silencioso: outsider no ve la fila
      assert.equal(r.rows.length, 0);

      const r2 = await asStudent(db, () =>
        attempt(db, `update public.campus_posts set body = 'lo cambio yo, inscripta' where id = $1`, [postId]),
      );
      assert.equal(r2.ok, false, 'una participante pudo editar el mensaje de otra persona');
      assert.equal(r2.code, PRIV_DENIED);
    });

    test('control: la docente SI puede editar su propio mensaje (es la autora de este)', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.campus_posts set body = 'lo corrijo yo' where id = $1`, [postId]),
      );
      assert.equal(r.ok, true, r.message);
    });

    test('el caso real: la docente moderadora NO puede reescribir el cuerpo de un mensaje ajeno (moderar no es editar)', async () => {
      const alumnaPost = await insertPost(db, asStudent, ID.courseA, 'Pregunta de la alumna, sin tocar', ID.student);
      assert.equal(alumnaPost.ok, true, alumnaPost.message);
      const otroId = alumnaPost.rows[0].id;

      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.campus_posts set body = 'la docente reescribe a la alumna' where id = $1`, [otroId]),
      );
      assert.equal(r.ok, false, 'la docente edito el mensaje de una alumna');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('control positivo: la autora SI puede editar su propio mensaje', async () => {
      const own = await insertPost(db, asStudent, ID.courseA, 'texto con un typo', ID.student);
      assert.equal(own.ok, true, own.message);
      const r = await asStudent(db, () =>
        attempt(db, `update public.campus_posts set body = 'texto corregido' where id = $1`, [own.rows[0].id]),
      );
      assert.equal(r.ok, true, r.message);
    });

    // El UPDATE que NO cambia nada. La policy deja alcanzar cualquier fila legible a proposito
    // (para devolver 42501 explicito en vez de filtrar la fila en silencio), asi que el guard es
    // el unico control. Mientras el guard preguntaba "¿cambio el cuerpo?" en vez de "¿quien sos?",
    // esto pasaba: un PATCH sobre todo el hilo general marcaba "(editado)" los mensajes de todos.
    test('un UPDATE que no cambia nada tampoco lo puede hacer un tercero', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.campus_posts set deleted_reason = null where id = $1`, [postId]),
      );
      assert.equal(r.ok, false, 'un tercero pudo tocar la fila con un UPDATE no-op');
      assert.equal(r.code, PRIV_DENIED);
    });
  });

  // ---------------------------------------------------------------- updated_at honesto
  describe('`updated_at` se mueve solo cuando se mueve el cuerpo', () => {
    // El trigger `set_updated_at` corria en TODO update. Dos consecuencias reales: el seed
    // dejaba de ser idempotente (su `on conflict do update ... updated_at = excluded.updated_at`
    // quedaba pisado por now(), y las 19 filas salian "(editado)" en la segunda corrida), y
    // cualquier mutacion marcaba el mensaje como editado sin que nadie lo hubiera editado.
    let postId;

    before(async () => {
      const r = await insertPost(db, asStudent, ID.courseA, 'mensaje para medir updated_at', ID.student);
      assert.equal(r.ok, true, r.message);
      postId = r.rows[0].id;
    });

    test('recien creado, updated_at == created_at (no nace "editado")', async () => {
      const r = await attempt(db, `select created_at = updated_at as igual from public.campus_posts where id = $1`, [postId]);
      assert.equal(r.rows[0].igual, true);
    });

    test('un UPDATE de la autora que no toca el cuerpo no mueve updated_at', async () => {
      const antes = await attempt(db, `select updated_at from public.campus_posts where id = $1`, [postId]);
      const r = await asStudent(db, () =>
        attempt(db, `update public.campus_posts set deleted_reason = null where id = $1`, [postId]),
      );
      assert.equal(r.ok, true, r.message);
      const despues = await attempt(db, `select updated_at from public.campus_posts where id = $1`, [postId]);
      assert.deepEqual(despues.rows[0].updated_at, antes.rows[0].updated_at, 'updated_at se movio sin que cambiara el cuerpo');
    });

    test('editar el cuerpo SI mueve updated_at (control positivo)', async () => {
      const antes = await attempt(db, `select updated_at from public.campus_posts where id = $1`, [postId]);
      const r = await asStudent(db, () =>
        attempt(db, `update public.campus_posts set body = 'ahora si lo edito de verdad' where id = $1`, [postId]),
      );
      assert.equal(r.ok, true, r.message);
      const despues = await attempt(db, `select updated_at from public.campus_posts where id = $1`, [postId]);
      assert.notDeepEqual(despues.rows[0].updated_at, antes.rows[0].updated_at, 'el cuerpo cambio y updated_at no se movio');
    });
  });

  // ---------------------------------------------------------------- moderacion del hilo general
  describe('el hilo general lo modera el admin, no cualquier autenticada', () => {
    let postId;

    before(async () => {
      const r = await insertPost(db, asOutsider, null, 'Mensaje en el hilo general', ID.otro);
      assert.equal(r.ok, true, r.message);
      postId = r.rows[0].id;
    });

    test('una alumna cualquiera no puede borrar un mensaje ajeno del general', async () => {
      const r = await asStudent(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'no me gusta' where id = $2`,
          [ID.student, postId],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('una docente (dueña de OTRO curso) tampoco modera el general: ahi el moderador es el admin', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'no corresponde' where id = $2`,
          [ID.teacherA, postId],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el admin SI modera el hilo general', async () => {
      const r = await asAdmin(db, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'spam' where id = $2`,
          [ID.admin, postId],
        ),
      );
      assert.equal(r.ok, true, r.message);
    });
  });

  // ---------------------------------------------------------------- criterio 4 · CHECK universal
  describe('criterio 4 · el CHECK anti-localizador rige TODOS los hilos (ADR-009)', () => {
    test('un link en el CUERPO del hilo de CURSO tambien se rechaza', async () => {
      const r = await insertPost(
        db,
        asStudent,
        ID.courseA,
        'Les dejo el link del material: drive.google.com/file/d/LEAKED123',
        ID.student,
      );
      assert.equal(r.ok, false, 'el localizador paso en el hilo de curso');
      assert.equal(r.code, CHECK_VIOLATION);
    });

    // El caso concreto que reprodujo QA y que la version anterior de este archivo daba por
    // bueno: el localizador es de OTRO curso. Quien lo pega esta inscripta al hilo donde lo
    // pega, asi que la barrera de inscripcion de ESE hilo no protege nada — la cohorte que lo
    // lee no tiene acceso al curso de origen. El CHECK condicionado por hilo no podia verlo
    // porque nunca miraba a que curso pertenecia el localizador.
    test('un localizador de OTRO curso, en el hilo del curso propio, tampoco', async () => {
      const r = await insertPost(
        db,
        asStudent,
        ID.courseA,
        'posta el video del otro curso: https://youtu.be/OTHERCOURSEVID (no hace falta pagarlo)',
        ID.student,
      );
      assert.equal(r.ok, false, 'se filtro el localizador de un curso ajeno');
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('control positivo: prosa legitima del hilo de curso sigue pasando', async () => {
      const r = await insertPost(
        db,
        asStudent,
        ID.courseA,
        'Terminé el módulo 2 y me quedó dando vueltas lo de los arcanos invertidos. ¿Lo vemos?',
        ID.student,
      );
      assert.equal(r.ok, true, r.message);
    });

    test('el mismo link en el hilo GENERAL es rechazado: ahi cualquier autenticada lo lee sin inscripcion', async () => {
      const r = await insertPost(
        db,
        asStudent,
        null,
        'Les dejo el link del material: drive.google.com/file/d/LEAKED123',
        ID.student,
      );
      assert.equal(r.ok, false, 'el localizador paso en el hilo general');
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('control positivo: texto legitimo sin forma de link pasa en el general', async () => {
      const r = await insertPost(
        db,
        asStudent,
        null,
        '¿Alguien mas empezó el curso de tarot esta semana? Quiero armar un grupo de práctica.',
        ID.student,
      );
      assert.equal(r.ok, true, r.message);
    });

    test('un id de Drive suelto (25+, con mayus/minus/digito) tambien se rechaza en el general', async () => {
      const r = await insertPost(db, asStudent, null, 'Manual 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', ID.student);
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });

  // ---------------------------------------------------------------- lectura
  describe('lectura', () => {
    test('quien no tiene ninguna relacion con un curso no ve su hilo', async () => {
      const r = await asOutsider(db, () =>
        attempt(db, `select id from public.campus_posts where course_id = $1`, [ID.courseA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'una desconocida vio el hilo de un curso ajeno');
    });

    test('anon no lee ni el hilo general: el Campus entero exige sesion', async () => {
      const r = await asAnon(db, () => attempt(db, `select id from public.campus_posts where course_id is null`));
      // anon no tiene GRANT SELECT en absoluto sobre campus_posts: 42501 directo, ni siquiera
      // llega a evaluar RLS.
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });
  });

  // ---------------------------------------------------------------- quien escribio (bug real)
  // Encontrado MIRANDO el Campus renderizado (no en el diseño de mesa, ver 0014): un mensaje de
  // una alumna en el hilo general mostraba el nombre como "—". `profiles_read_public` (0004)
  // expone `role in ('teacher','admin')` o la fila propia — a propósito, el padrón de alumnado
  // no es público — y el Campus es el primer lugar que necesita mostrar el nombre de OTRA
  // alumna. `campus_post_authors()` (0014) es el arreglo: resuelve nombre/glyph/rol de quien
  // escribió, pero solo si escribió en un hilo que quien pregunta puede leer.
  describe('campus_post_authors() — ver el nombre de quien escribio, ni mas ni menos', () => {
    test('una alumna ve el nombre de OTRA alumna que escribio en un hilo que comparten (el general)', async () => {
      const post = await insertPost(db, asOutsider, null, 'Mensaje de otra alumna en el general', ID.otro);
      assert.equal(post.ok, true, post.message);

      const r = await asStudent(db, () =>
        attempt(db, `select full_name from public.campus_post_authors(array[$1]::uuid[])`, [ID.otro]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'no resolvio el nombre de una autora del hilo general');
      // ID.otro no tiene full_name seteado en el seed comun (queda '' del trigger de alta):
      // lo que importa acá es que la FILA aparezca, no el valor del nombre.
      assert.equal(typeof r.rows[0].full_name, 'string');
    });

    test('una alumna NO ve el nombre de otra que escribio en un curso al que no tiene acceso', async () => {
      // Actriz PROPIA de este caso (no ID.otro: ya escribio en el general en el test de arriba,
      // y ese solo hecho ya la haria visible por esa otra via — mezclar los dos casos en la
      // misma autora no probaria lo que este test dice probar). Sembrada como owner, en un
      // curso al que la alumna del test NO tiene acceso.
      const OTRA = '90000000-0000-4000-8000-000000000001';
      await asOwner(db, `insert into auth.users (id, email) values ($1, 'campus-otra@humano.test')`, [OTRA]);
      await asOwner(
        db,
        `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, 'mensaje en curso ajeno')`,
        [ID.courseB, OTRA],
      );

      const r = await asStudent(db, () =>
        attempt(db, `select full_name from public.campus_post_authors(array[$1]::uuid[])`, [OTRA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'una alumna vio el nombre de otra por un hilo que no puede leer');
    });

    test('control: el nombre de la docente SIGUE visible por la via vieja (profiles_read_public), esto no la tapa', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select full_name, role from public.profiles where id = $1`, [ID.teacherA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
      assert.equal(r.rows[0].role, 'teacher');
    });
  });
});

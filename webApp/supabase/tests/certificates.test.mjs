// T-018 · Certificado verificable — TEST DE MUTACION REAL.
//
// Mismo estandar que `insert-guards.test.mjs`/`locator-free-text.test.mjs`: cada caso ejecuta
// el DML del atacante contra un Postgres de verdad con `SET ROLE` y los claims del JWT en
// `request.jwt.claims`, como los deja PostgREST. Los tres bloques de mutacion revierten UNA
// capa por vez y afirman que el ataque vuelve a pasar: sin eso, un verde no distingue
// "protegido" de "el ataque estaba mal escrito".
//
// Los tres criterios donde el ticket se gana o se pierde, cada uno con su prueba:
//   1. El certificado se emite SOLO si estan completas TODAS las lecciones publicadas, y los
//      cuatro campos publicos los calcula el guard — nunca lo que declare el INSERT.
//   2. El codigo no es adivinable: lo genera la base con su CSPRNG, no el cliente.
//   3. El certificado sobrevive a la inscripcion: revocarla o despublicar/archivar el curso NO
//      lo toca — certifica algo que ya paso.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOtro = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);
const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

/**
 * Completa una leccion para el alumno de seed esquivando el tope de reloj de T-015 (0009):
 * mismo patron que `retrasarReloj` de `insert-guards.test.mjs`. `disable/enable trigger` corre
 * como OWNER (no como service_role — PGlite no le da ese privilegio), fuera de `asService`.
 */
async function completarLeccion(db, lessonId, courseId, segundosVistos) {
  await asService(db, () =>
    db.query(
      `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, last_seen_at)
       values ($1, $2, $3, 0, now())
       on conflict (user_id, lesson_id) do nothing`,
      [ID.student, courseId, lessonId],
    ),
  );
  await db.exec(`alter table public.lesson_progress disable trigger lesson_progress_guard_insert;`);
  await db.exec(`alter table public.lesson_progress disable trigger lesson_progress_monotonic;`);
  await db.query(
    `update public.lesson_progress set last_seen_at = now() - interval '4000 seconds' where user_id = $1 and lesson_id = $2`,
    [ID.student, lessonId],
  );
  await db.exec(`alter table public.lesson_progress enable trigger lesson_progress_guard_insert;`);
  await db.exec(`alter table public.lesson_progress enable trigger lesson_progress_monotonic;`);
  await asService(db, () =>
    db.query(`update public.lesson_progress set seconds_watched = $1 where user_id = $2 and lesson_id = $3`, [
      segundosVistos,
      ID.student,
      lessonId,
    ]),
  );
}

// courseA (seed) tiene dos lecciones publicadas: lessonA (3138s) y lessonPreviewB (900s).
// El describe de más abajo las completa una por una para probar el criterio "TODAS", no de a
// dos juntas.

describe('T-018 · certificado verificable', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- criterio 1 · emision derivada
  describe('se emite solo con el curso completo, y los cuatro campos los calcula el guard', () => {
    test('no elegible sin ninguna leccion completada', async () => {
      const r = await db.query(`select public.certificate_eligible($1, $2) as e`, [ID.student, ID.courseA]);
      assert.equal(r.rows[0].e, false);
    });

    test('no elegible con UNA de las dos lecciones publicadas completa', async () => {
      await completarLeccion(db, ID.lessonA, ID.courseA, 3138);
      const r = await db.query(`select public.certificate_eligible($1, $2) as e`, [ID.student, ID.courseA]);
      assert.equal(r.rows[0].e, false);
    });

    test('el INSERT se rechaza mientras no esta completo, incluso con service_role', async () => {
      const r = await asService(db, () =>
        attempt(db, `insert into public.certificates (user_id, course_id) values ($1, $2)`, [ID.student, ID.courseA]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('elegible al completar la segunda lección publicada', async () => {
      await completarLeccion(db, ID.lessonPreviewB, ID.courseA, 900);
      const r = await db.query(`select public.certificate_eligible($1, $2) as e`, [ID.student, ID.courseA]);
      assert.equal(r.rows[0].e, true);
    });

    let code;
    test('el INSERT con campos fabricados los pisa con la verdad de la base', async () => {
      const r = await asService(db, () =>
        db.query(
          `insert into public.certificates
             (user_id, course_id, code, student_name, course_title, teacher_name, completed_at)
           values ($1, $2, 'no-cuenta', 'Nombre falso', 'Curso falso', 'Docente falso', '2000-01-01')
           returning code, student_name, course_title, teacher_name, completed_at`,
          [ID.student, ID.courseA],
        ),
      );
      const row = r.rows[0];
      code = row.code;
      assert.equal(row.student_name, 'Alumna', 'el nombre lo calcula el guard desde profiles, no el INSERT');
      assert.equal(row.course_title, 'Tarot · Iniciacion', 'el titulo lo calcula el guard desde courses');
      assert.equal(row.teacher_name, 'Sol Mayor', 'la docente la calcula el guard desde el teacher_id del curso');
      assert.notEqual(row.completed_at.toISOString().slice(0, 4), '2000', 'la fecha la calcula el guard, no el 2000 declarado');
    });

    test('el código NO es el declarado ("no-cuenta") ni el id de ninguna otra fila', () => {
      assert.notEqual(code, 'no-cuenta');
      assert.notEqual(code, ID.student);
      assert.notEqual(code, ID.courseA);
      assert.match(code, /^[0-9a-f]{32}$/, 'formato: hex de 32, no un uuid con guiones ni un id secuencial');
    });

    test('segunda emisión para el mismo (alumno, curso) choca con la unicidad, no duplica', async () => {
      const r = await asService(db, () =>
        attempt(db, `insert into public.certificates (user_id, course_id) values ($1, $2)`, [ID.student, ID.courseA]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, UNIQUE_VIOLATION);
    });

    // MUTACION: sin el guard, la eligibilidad y las columnas quedan en manos de quien inserta.
    test('MUTACIÓN · sin el guard de INSERT, un curso incompleto SÍ emite certificado', async () => {
      await db.exec(`alter table public.certificates disable trigger certificates_guard_insert;`);
      try {
        const r = await asService(db, () =>
          attempt(
            db,
            `insert into public.certificates (user_id, course_id, code, student_name, course_title, teacher_name, completed_at)
             values ($1, $2, 'chau-invariante', 'Cualquiera', 'Cualquiera', 'Cualquiera', now())`,
            [ID.otro, ID.courseB],
          ),
        );
        assert.equal(r.ok, true, 'sin el guard, el ataque que el guard existe para frenar pasa de nuevo');
      } finally {
        await db.exec(`alter table public.certificates enable trigger certificates_guard_insert;`);
        // El DELETE de limpieza tropieza con el guard de inmutabilidad (esperado: el criterio 6
        // no distingue "ataque" de "housekeeping" — por eso se apaga aparte para poder limpiar).
        await db.exec(`alter table public.certificates disable trigger certificates_guard_immutable;`);
        await db.query(`delete from public.certificates where user_id = $1 and course_id = $2`, [ID.otro, ID.courseB]);
        await db.exec(`alter table public.certificates enable trigger certificates_guard_immutable;`);
      }
    });
  });

  // ---------------------------------------------------------------- criterio 2 · el código como barrera
  describe('el código no es adivinable: la única barrera de la página pública', () => {
    test('ADR-009: un student_name con forma de localizador se rechaza — no la elige el guard, el CHECK cubre incluso sin el', async () => {
      await db.exec(`alter table public.certificates disable trigger certificates_guard_insert;`);
      try {
        const r = await asService(db, () =>
          attempt(
            db,
            `insert into public.certificates (user_id, course_id, student_name, course_title, teacher_name, completed_at)
             values ($1, $2, $3, 'Curso', 'Docente', now())`,
            [ID.otro, ID.courseB, 'Ganaste algo — drive.google.com/file/d/LEAKED123'],
          ),
        );
        assert.equal(r.ok, false);
        assert.equal(r.code, CHECK_VIOLATION);
      } finally {
        await db.exec(`alter table public.certificates enable trigger certificates_guard_insert;`);
      }
    });
  });

  // ---------------------------------------------------------------- criterio 4 · el payload público
  describe('no expone nada más que los cuatro campos, y solo al dueño', () => {
    test('el alumno dueño lee su fila (columnas otorgadas)', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select code, course_id, completed_at from public.certificates where user_id = $1`, [ID.student]),
      );
      assert.equal(r.ok, true);
      assert.equal(r.rows.length, 1);
    });

    test('el alumno dueño NO puede leer student_name/course_title/teacher_name: no están en el grant', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `select student_name from public.certificates where user_id = $1`, [ID.student]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('OTRO alumno autenticado no ve la fila (RLS, no error — cero filas)', async () => {
      const r = await asOtro(db, () =>
        attempt(db, `select code from public.certificates where user_id = $1`, [ID.student]),
      );
      assert.equal(r.ok, true);
      assert.equal(r.rows.length, 0);
    });

    test('anon no tiene NINGÚN privilegio sobre la tabla', async () => {
      const r = await asAnon(db, () => attempt(db, `select code from public.certificates limit 1`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ningún rol de cliente puede insertar/actualizar/borrar', async () => {
      const insert = await asStudent(db, () =>
        attempt(db, `insert into public.certificates (user_id, course_id) values ($1, $2)`, [ID.otro, ID.courseB]),
      );
      assert.equal(insert.code, PRIV_DENIED);

      const [{ code: propio }] = (
        await asStudent(db, () => db.query(`select code from public.certificates where user_id = $1`, [ID.student]))
      ).rows;

      const update = await asStudent(db, () =>
        attempt(db, `update public.certificates set student_name = 'x' where code = $1`, [propio]),
      );
      assert.equal(update.code, PRIV_DENIED);

      const del = await asStudent(db, () => attempt(db, `delete from public.certificates where code = $1`, [propio]));
      assert.equal(del.code, PRIV_DENIED);
    });
  });

  // ---------------------------------------------------------------- criterio 3/6 · sobrevive
  describe('sobrevive a la inscripción: revocarla o archivar el curso no lo toca', () => {
    let code, snapshot;

    before(async () => {
      const r = await db.query(
        `select code, student_name, course_title, teacher_name, completed_at from public.certificates where user_id = $1 and course_id = $2`,
        [ID.student, ID.courseA],
      );
      // Snapshot sin `code`: las comparaciones de abajo re-seleccionan solo los cuatro campos
      // públicos, así que el objeto esperado no lo lleva tampoco.
      const { student_name, course_title, teacher_name, completed_at } = r.rows[0];
      code = r.rows[0].code;
      snapshot = { student_name, course_title, teacher_name, completed_at };
    });

    test('revocar la inscripción no cambia la fila', async () => {
      await asService(db, () =>
        db.query(`update public.enrollments set status = 'revoked' where user_id = $1 and course_id = $2`, [
          ID.student,
          ID.courseA,
        ]),
      );
      const r = await db.query(`select student_name, course_title, teacher_name, completed_at from public.certificates where code = $1`, [code]);
      assert.deepEqual(r.rows[0], snapshot);
    });

    test('archivar el curso no cambia la fila', async () => {
      await db.exec(`alter table public.courses disable trigger courses_guard;`);
      await db.query(`update public.courses set status = 'archived' where id = $1`, [ID.courseA]);
      await db.exec(`alter table public.courses enable trigger courses_guard;`);
      const r = await db.query(`select student_name, course_title, teacher_name, completed_at from public.certificates where code = $1`, [code]);
      assert.deepEqual(r.rows[0], snapshot);
    });

    test('MUTACIÓN · sin el guard de UPDATE/DELETE, un certificado emitido SÍ se puede reescribir', async () => {
      await db.exec(`alter table public.certificates disable trigger certificates_guard_immutable;`);
      try {
        const r = await asService(db, () =>
          attempt(db, `update public.certificates set student_name = 'reescrito' where code = $1`, [code]),
        );
        assert.equal(r.ok, true, 'sin el guard, el ataque que el guard existe para frenar vuelve a pasar');
        await db.query(`update public.certificates set student_name = $1 where code = $2`, [snapshot.student_name, code]);
      } finally {
        await db.exec(`alter table public.certificates enable trigger certificates_guard_immutable;`);
      }
    });

    test('la página pública (lectura sin sesión, service_role) sigue devolviendo la fila completa', async () => {
      const r = await asService(db, () =>
        db.query(`select student_name, course_title, teacher_name, completed_at from public.certificates where code = $1`, [code]),
      );
      assert.deepEqual(r.rows[0], snapshot);
    });

    test('un código inexistente no devuelve nada (no hay enumeración posible por privilegio)', async () => {
      const r = await asService(db, () =>
        db.query(`select 1 from public.certificates where code = 'ffffffffffffffffffffffffffffffff'`),
      );
      assert.equal(r.rows.length, 0);
    });
  });

  // ---------------------------------------------------------------- 0017 · queda huérfano
  //
  // 0013 prometía en su cabecera que la fila sobrevive "aunque el perfil o el curso
  // desaparezcan" (por eso las FK son `on delete set null`) y a la vez instalaba un guard que
  // rechazaba TODO update. El `SET NULL` de la FK **es un update**, así que la promesa era
  // inalcanzable: una cuenta con certificado emitido no se podía dar de baja nunca, ni con
  // `service_role`. Lo encontró un agente de T-020 intentando limpiar sus fixtures.
  //
  // El impacto no son los fixtures: es cualquier baja de cuenta en una escuela que, por
  // definición, va a tener alumnas con certificado.
  describe('0017 · borrar el perfil deja el certificado huérfano, no lo bloquea', () => {
    test('borrar el perfil funciona y la fila conserva los cuatro campos públicos', async () => {
      const antes = await asService(db, () =>
        db.query(
          `select student_name, course_title, teacher_name, completed_at
             from public.certificates where user_id = $1 and course_id = $2`,
          [ID.student, ID.courseA],
        ),
      );
      assert.equal(antes.rows.length, 1, 'no hay certificado del que probar la orfandad');

      await asService(db, () => db.query(`delete from public.profiles where id = $1`, [ID.student]));

      const despues = await asService(db, () =>
        db.query(
          `select student_name, course_title, teacher_name, completed_at
             from public.certificates where course_id = $1 and user_id is null`,
          [ID.courseA],
        ),
      );
      assert.equal(despues.rows.length, 1, 'el certificado desapareció al borrar el perfil');
      assert.deepEqual(despues.rows[0], antes.rows[0], 'el snapshot cambió al perder el vínculo');
    });

    // El desvinculo se permite por FORMA, no por quien lo ejecuta. Estos tres son los que
    // distinguen "cortar el vinculo" de "falsificar el certificado", y sin ellos el arreglo
    // de 0017 seria simplemente "permitir updates de user_id".
    test('control: reasignar el certificado huérfano a otra persona sigue prohibido', async () => {
      await assert.rejects(
        asService(db, () =>
          db.query(`update public.certificates set user_id = $1 where user_id is null`, [ID.teacherA]),
        ),
        /no se modifica ni se borra/,
      );
    });

    test('control: cambiar el nombre del certificado sigue prohibido', async () => {
      await assert.rejects(
        asService(db, () =>
          db.query(`update public.certificates set student_name = 'Otra Persona' where user_id is null`),
        ),
        /no se modifica ni se borra/,
      );
    });

    test('control: borrar el certificado sigue prohibido', async () => {
      await assert.rejects(
        asService(db, () => db.query(`delete from public.certificates where user_id is null`)),
        /no se modifica ni se borra/,
      );
    });
  });
});

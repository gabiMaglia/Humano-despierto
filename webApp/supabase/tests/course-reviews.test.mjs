// T-028 · Resenas y rating — TEST DE MUTACION REAL.
//
// Mismo estandar que el resto de la suite: el DML del atacante contra un Postgres de verdad, con
// SET ROLE y los claims en `request.jwt.claims` como los deja PostgREST, y se afirma sobre el
// SQLSTATE. Fixtures de seed.mjs: `ID.student` esta inscripto ACTIVO en `courseA` (dueño
// `ID.teacherA`) y NO en `courseB`; `ID.otro` no tiene ninguna inscripcion.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOutsider = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);
const asOwnerTeacher = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asAdmin = (db, fn) => asUser(db, { sub: ID.admin, userRole: 'admin' }, fn);

const owner = async (db, sql, params = []) => {
  await db.exec(`reset role;`);
  return (await db.query(sql, params)).rows;
};

const review = (db, actor, courseId, userId, rating, body = null) =>
  actor(db, () =>
    attempt(
      db,
      `insert into public.course_reviews (course_id, user_id, rating, body)
       values ($1, $2, $3, $4) returning id`,
      [courseId, userId, rating, body],
    ),
  );

describe('T-028 · resenas y rating', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- criterio 1 · quien escribe
  describe('criterio 1 · solo resena quien tiene inscripcion activa, y lo impide RLS', () => {
    test('sin ninguna inscripcion, el INSERT es rechazado', async () => {
      const r = await review(db, asOutsider, ID.courseA, ID.otro, 5, 'Excelente');
      assert.equal(r.ok, false, 'reseno sin estar inscripta');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('inscripta en A, no puede resenar B', async () => {
      const r = await review(db, asStudent, ID.courseB, ID.student, 5, 'Ni lo vi');
      assert.equal(r.ok, false, 'reseno un curso en el que no esta inscripta');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('no puede resenar a nombre de otra persona', async () => {
      const r = await review(db, asStudent, ID.courseA, ID.otro, 1, 'No fui yo');
      assert.equal(r.ok, false, 'escribio una resena a nombre de un tercero');
      assert.equal(r.code, PRIV_DENIED);
    });

    // El seed ya deja UNA resena de `ID.student` sobre `courseA` (la necesita el barrido de
    // localizadores, que si no correria contra cero filas). El control positivo es entonces que
    // la autora pueda EDITARLA en su propia sesion -- lo que prueba lo mismo, acceso de
    // escritura via RLS, sin pelearse con el unique.
    test('control positivo: la inscripta activa escribe sobre su curso', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.course_reviews set rating = 5, body = $1 where user_id = $2 and course_id = $3 returning id`, [
          'Me cambio la practica.',
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'la autora no alcanzo su propia resena');
    });

    test('una sola resena por alumna y curso', async () => {
      const r = await review(db, asStudent, ID.courseA, ID.student, 3, 'Otra vez');
      assert.equal(r.ok, false, 'pudo resenar dos veces el mismo curso');
      assert.equal(r.code, UNIQUE_VIOLATION);
    });
  });

  // ---------------------------------------------------------------- dominio
  describe('el rating vive en 1..5 y el texto es opcional', () => {
    test('rating 6 es rechazado', async () => {
      const r = await review(db, asStudent, ID.courseB, ID.student, 6);
      assert.notEqual(r.ok, true);
    });

    test('rating 0 es rechazado', async () => {
      const r = await owner(db, `select 1`).then(() =>
        attempt(
          db,
          `insert into public.course_reviews (course_id, user_id, rating) values ($1, $2, 0)`,
          [ID.courseB, ID.otro],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('se puede puntuar SIN escribir — el body es opcional', async () => {
      const rows = await owner(
        db,
        `insert into public.course_reviews (course_id, user_id, rating)
         values ($1, $2, 4) returning id, body`,
        [ID.courseB, ID.otro],
      );
      assert.equal(rows[0].body, null, 'el body deberia poder quedar nulo');
    });

    test('un body en blanco no cuenta como texto', async () => {
      const r = await owner(db, `select 1`).then(() =>
        attempt(
          db,
          `update public.course_reviews set body = '   ' where user_id = $1 and course_id = $2`,
          [ID.student, ID.courseA],
        ),
      );
      assert.equal(r.ok, false, 'un body de solo espacios paso el CHECK');
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });

  // ---------------------------------------------------------------- ADR-009
  describe('ADR-009 · las dos mitades sobre un texto publico sin sesion', () => {
    test('mitad 1 (forma): una URL en el cuerpo es rechazada', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.course_reviews set body = $1 where user_id = $2 and course_id = $3`, [
          'El material esta en drive.google.com/file/d/ALGO',
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('mitad 2 (exacta): el video_id real del catalogo es rechazado', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.course_reviews set body = $1 where user_id = $2 and course_id = $3`, [
          `La mejor clase es ${SECRET.videoId}`,
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, false, 'un video_id de 11 caracteres se colo a una resena publica');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('control positivo: prosa normal no se bloquea', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.course_reviews set body = $1 where user_id = $2 and course_id = $3`, [
          'Los videos son cortos y se entienden. Volveria a hacerlo.',
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true, `falso positivo: ${r.message}`);
    });
  });

  // ---------------------------------------------------------------- Q-11
  describe('Q-11 · la guia responde, NO oculta', () => {
    test('la guia dueña puede responder en publico', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `update public.course_reviews
              set response = $1, responded_at = now(), responded_by = $2
            where user_id = $3 and course_id = $4`,
          ['Gracias por la devolucion.', ID.teacherA, ID.student, ID.courseA],
        ),
      );
      assert.equal(r.ok, true, `la guia no pudo responder: ${r.message}`);
    });

    test('la guia dueña NO puede ocultar una resena de su propio curso', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(
          db,
          `update public.course_reviews
              set hidden_at = now(), hidden_by = $1, hidden_reason = 'no me gusto'
            where user_id = $2 and course_id = $3`,
          [ID.teacherA, ID.student, ID.courseA],
        ),
      );
      assert.equal(r.ok, false, 'la guia oculto una resena sobre si misma');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la guia dueña NO puede cambiar el rating que le pusieron', async () => {
      // El valor tiene que ser DISTINTO del actual: el guard compara `is distinct from`, asi que
      // reescribir el mismo numero es un no-op y no debe disparar nada. La primera version de
      // este caso ponia 5 sobre una resena que ya valia 5 y daba un falso verde al reves --
      // reportaba agujero donde no habia. El seed de este describe deja rating 5.
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.course_reviews set rating = 1 where user_id = $1 and course_id = $2`, [
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, false, 'la guia se bajo/subio la nota que le pusieron');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la guia dueña NO puede reescribir el texto de la resena', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.course_reviews set body = $1 where user_id = $2 and course_id = $3`, [
          'En realidad fue buenisimo',
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, false, 'la guia reescribio lo que dijo una alumna sobre ella');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la autora NO puede escribirse la respuesta de la guia', async () => {
      const r = await asStudent(db, () =>
        attempt(db, `update public.course_reviews set response = $1, responded_at = now(), responded_by = $2 where user_id = $3 and course_id = $4`, [
          'La guia dice que tengo razon',
          ID.student,
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, false, 'la alumna se firmo una respuesta de la guia');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('un tercero no puede editar la resena de otra persona', async () => {
      const r = await asOutsider(db, () =>
        attempt(db, `update public.course_reviews set body = 'secuestrada' where user_id = $1 and course_id = $2`, [
          ID.student,
          ID.courseA,
        ]),
      );
      assert.notEqual(r.ok && r.rows.length > 0, true, 'edito una resena ajena');
    });

    test('si la autora edita, la respuesta de la guia se borra', async () => {
      const antes = await owner(db, `select response from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
      assert.notEqual(antes[0].response, null, 'el caso necesita una respuesta previa');

      const r = await asStudent(db, () =>
        attempt(db, `update public.course_reviews set body = $1 where user_id = $2 and course_id = $3`, [
          'Lo pense mejor: le falta profundidad en la parte practica.',
          ID.student,
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true, r.message);

      const despues = await owner(db, `select response, responded_at, responded_by from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
      assert.equal(despues[0].response, null, 'la respuesta quedo colgando de un texto que ya cambio');
      assert.equal(despues[0].responded_at, null);
      assert.equal(despues[0].responded_by, null);
    });
  });
});

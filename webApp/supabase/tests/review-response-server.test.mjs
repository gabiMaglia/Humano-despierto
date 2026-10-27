// T-080 · D-18 · La respuesta que escribe service_role queda firmada por la guia del curso.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const SERVIDOR = { sub: null, role: 'service_role' };

describe('D-18 · firma de la respuesta en la rama de servidor', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  const leer = async () =>
    (await db.query(`select response, responded_by, responded_at from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA])).rows[0];
  const comoServidor = (sql, params) => asUser(db, SERVIDOR, () => attempt(db, sql, params));

  test('service_role responde sin firma explicita: queda firmada por la duena y fechada', async () => {
    const r = await comoServidor(`update public.course_reviews set response = $1 where user_id = $2 and course_id = $3 returning id`, [
      'Gracias por la devolucion.', ID.student, ID.courseA,
    ]);
    assert.equal(r.ok, true, r.message);
    const fila = await leer();
    assert.equal(fila.responded_by, ID.teacherA, 'la respuesta del servidor quedo sin autora');
    assert.ok(fila.responded_at, 'la respuesta del servidor quedo sin fecha');
  });

  test('service_role no firma con alguien que no es la guia', async () => {
    const r = await comoServidor(`update public.course_reviews set response = $1, responded_by = $2 where user_id = $3 and course_id = $4`, [
      'Otra respuesta.', ID.teacherB, ID.student, ID.courseA,
    ]);
    assert.equal(r.ok, false, 'service_role firmo con la guia de otro curso');
    assert.equal(r.code, '42501');
    assert.equal((await leer()).responded_by, ID.teacherA);
  });

  test('una fecha explicita se respeta (carga de datos)', async () => {
    const r = await comoServidor(
      `update public.course_reviews set response = $1, responded_at = '2026-01-02T00:00:00Z' where user_id = $2 and course_id = $3`,
      ['Respuesta historica.', ID.student, ID.courseA],
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(new Date((await leer()).responded_at).toISOString(), '2026-01-02T00:00:00.000Z');
  });

  test('response en null limpia la firma', async () => {
    const r = await comoServidor(`update public.course_reviews set response = null where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
    assert.equal(r.ok, true, r.message);
    const fila = await leer();
    assert.equal(fila.responded_by, null);
    assert.equal(fila.responded_at, null);
  });

  test('ADR-011: borrar la cuenta de la guia deja la firma en null y no se bloquea', async () => {
    await comoServidor(`update public.course_reviews set response = 'Hola' where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
    // courses.teacher_id es on delete restrict: se prueba el set null de responded_by sobre una
    // guia que firmo y ya no es duena (el curso se reasigna antes, como lo haria el admin).
    await db.query(`insert into auth.users (id, email) values ('20000000-0000-4000-8000-0000000000ee', 'temp@humano.test')`);
    await db.query(`update public.profiles set role = 'teacher' where id = '20000000-0000-4000-8000-0000000000ee'`);
    // PRECONDICION montada con los triggers apagados (mismo mecanismo que seed.sql): una firma
    // vieja de alguien que ya no es la duena. El guard nuevo no la dejaria escribir, y esta bien.
    await db.exec(`set session_replication_role = replica;`);
    try {
      await db.query(`update public.course_reviews set responded_by = '20000000-0000-4000-8000-0000000000ee' where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
    } finally {
      await db.exec(`set session_replication_role = origin;`);
    }
    const baja = await attempt(db, `delete from auth.users where id = '20000000-0000-4000-8000-0000000000ee'`);
    assert.equal(baja.ok, true, `la baja de la firmante quedo bloqueada: ${baja.message}`);
    assert.equal((await leer()).responded_by, null);
  });
});

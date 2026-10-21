// T-030 · el camino de la APP contra la base: se importa el modulo REAL que usan las actions
// (`src/lib/lesson-qa/write.mjs`) y se lo corre con el SQL que emite PostgREST. Leccion de T-028 r2.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase } from '../harness/db.mjs';
import { clientePostgrest } from '../harness/postgrest-client.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const { preguntar, responder, votar, quitarVoto, marcarResuelta, destacar, moderar, traducirErrorQa, SIN_FILAS } =
  await import('../../src/lib/lesson-qa/write.mjs');

const COMPANERA_ID = 'c3000000-0000-4000-8000-000000000001';
const ALUMNA = { sub: ID.student, userRole: 'student' };
const COMPANERA = { sub: COMPANERA_ID, userRole: 'student' };
const SIN_INSCRIPCION = { sub: ID.otro, userRole: 'student' };
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const OTRA_DOCENTE = { sub: ID.teacherB, userRole: 'teacher' };
const OPCIONES = { duplicado: 'DUP', fallback: 'FALLBACK' };

describe('T-030 · la app escribe el Q&A por el camino que PostgREST ejecuta', () => {
  let db;
  let pregunta;
  let respuestaDocente;
  let respuestaAlumna;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(`insert into auth.users (id, email) values ($1, 'companera-app@humano.test')`, [COMPANERA_ID]);
    await db.query(
      `insert into public.enrollments (user_id, course_id, status, granted_by) values ($1, $2, 'active', $3)`,
      [COMPANERA_ID, ID.courseA, ID.admin],
    );
  });

  after(async () => db?.close());

  test('preguntar crea la pregunta y devuelve su id', async () => {
    const r = await preguntar(clientePostgrest(db, ALUMNA), {
      lessonId: ID.lessonA, authorId: ID.student, title: 'Sobre el Loco', body: 'No entendi el minuto 12.',
    });
    assert.equal(r.error, null, r.error?.message);
    assert.match(r.id, /^[0-9a-f-]{36}$/);
    pregunta = r.id;
  });

  test('sin inscripcion devuelve el 42501 de RLS y el mensaje de permiso', async () => {
    const r = await preguntar(clientePostgrest(db, SIN_INSCRIPCION), {
      lessonId: ID.lessonA, authorId: ID.otro, title: 'No deberia', body: 'Sin inscripcion',
    });
    assert.equal(r.error?.code, '42501');
    assert.match(traducirErrorQa(r.error, OPCIONES), /permiso/);
  });

  test('el localizador real tiene su propio mensaje', async () => {
    const r = await preguntar(clientePostgrest(db, ALUMNA), {
      lessonId: ID.lessonA, authorId: ID.student, title: 'Mira esto', body: `Esta en ${SECRET.videoId}`,
    });
    assert.equal(r.error?.code, '42501');
    assert.match(traducirErrorQa(r.error, OPCIONES), /contenido pago/);
  });

  test('responder: la docente queda como respuesta de docente', async () => {
    const r = await responder(clientePostgrest(db, DUENA), { questionId: pregunta, authorId: ID.teacherA, body: 'Es una pausa.' });
    assert.equal(r.error, null, r.error?.message);
    respuestaDocente = r.id;
    const a = await responder(clientePostgrest(db, COMPANERA), { questionId: pregunta, authorId: COMPANERA_ID, body: 'Yo creo que si.' });
    assert.equal(a.error, null, a.error?.message);
    respuestaAlumna = a.id;
    const { rows } = await db.query(`select id, is_instructor_answer from public.lesson_answers where question_id = $1 order by created_at`, [pregunta]);
    assert.deepEqual(rows.map((x) => x.is_instructor_answer), [true, false]);
  });

  test('votar dos veces da 23505 y se traduce con el texto de duplicado', async () => {
    const c = clientePostgrest(db, COMPANERA);
    assert.equal((await votar(c, { questionId: pregunta, userId: COMPANERA_ID })).error, null);
    const r = await votar(c, { questionId: pregunta, userId: COMPANERA_ID });
    assert.equal(r.error?.code, '23505');
    assert.equal(traducirErrorQa(r.error, OPCIONES), 'DUP');
  });

  test('quitar el voto propio pasa; quitar uno que no existe es SIN_FILAS', async () => {
    const c = clientePostgrest(db, COMPANERA);
    assert.equal((await quitarVoto(c, { questionId: pregunta, userId: COMPANERA_ID })).error, null);
    const r = await quitarVoto(c, { questionId: pregunta, userId: COMPANERA_ID });
    assert.equal(r.error?.code, SIN_FILAS);
  });

  test('destacar: la de alumna es 42501, la de docente pasa', async () => {
    const c = clientePostgrest(db, DUENA);
    const mal = await destacar(c, { answerId: respuestaAlumna, featured: true });
    assert.equal(mal.error?.code, '42501');
    const bien = await destacar(c, { answerId: respuestaDocente, featured: true });
    assert.equal(bien.error, null, bien.error?.message);
  });

  test('una docente ajena afecta 0 filas y eso vuelve como SIN_FILAS, no como exito', async () => {
    const r = await marcarResuelta(clientePostgrest(db, OTRA_DOCENTE), { questionId: pregunta, resolved: true });
    assert.equal(r.error?.code, SIN_FILAS);
  });

  test('marcar resuelta: la otra inscripta no, la autora si', async () => {
    const mal = await marcarResuelta(clientePostgrest(db, COMPANERA), { questionId: pregunta, resolved: true });
    assert.equal(mal.error?.code, '42501');
    const bien = await marcarResuelta(clientePostgrest(db, ALUMNA), { questionId: pregunta, resolved: true });
    assert.equal(bien.error, null, bien.error?.message);
  });

  test('moderar: la duena borra la respuesta con motivo', async () => {
    const r = await moderar(clientePostgrest(db, DUENA), {
      tabla: 'lesson_answers', id: respuestaAlumna, moderatorId: ID.teacherA, reason: 'fuera de tema',
    });
    assert.equal(r.error, null, r.error?.message);
  });

  test('moderar rechaza una tabla que no es del Q&A sin tocar la base', () => {
    assert.throws(
      () => moderar(clientePostgrest(db, DUENA), { tabla: 'campus_posts', id: pregunta, moderatorId: ID.teacherA, reason: 'x' }),
      /no moderable/,
    );
  });

  test('traducirErrorQa: link es 23514 y lo desconocido es el fallback', () => {
    assert.match(traducirErrorQa({ code: '23514', message: '' }, OPCIONES), /links/);
    assert.equal(traducirErrorQa({ code: 'XX000', message: 'boom' }, OPCIONES), 'FALLBACK');
  });
});

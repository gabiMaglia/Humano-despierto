// ADR-009/010 · La clase "con sesion": texto libre que lee OTRA persona logueada y que anon no ve.
//
// POR QUE EXISTE. `columnasDeLaClase` define el riesgo como "lo lee anon". El Q&A (T-030) y el
// Campus no tienen grant a anon, asi que sus columnas NO entran en ningun invariante: un trigger
// de localizador olvidado ahi daba verde en locator-exact-invariant.test.mjs. Pero la condicion de
// ADR-009 es "sin inscripcion", no "sin sesion" (nota de 0014): una cohorte que lee lo que escribe
// otra es la misma fuga. Este archivo cubre esa segunda clase con las dos mitades.
//
// A diferencia del barrido de anon, aca el ataque se declara POR COLUMNA: el soft delete exige el
// trio completo, y un UPDATE de `deleted_reason` solo fallaria por el CHECK de consistencia (23514)
// y se contaria como "cubierta" sin haber probado nada. Por eso se exige 42501 exacto y un control
// con prosa que tiene que pasar sobre una fila fresca.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { columnasConSesion } from './locator-columns.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const ALUMNA = { sub: ID.student, userRole: 'student' };
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };

// Unica excepcion admitida, y se justifica por entrada.
const EXENTAS = {
  'lesson_notes.body':
    'la unica lectora es la autora (lesson_notes_read_own, 0004): no hay a quien filtrarle nada.',
};

const filaComoOwner = async (db, sql, params) => {
  await db.exec('reset role;');
  return (await db.query(sql, params)).rows[0].id;
};
const preguntaFresca = (db) =>
  filaComoOwner(
    db,
    `insert into public.lesson_questions (lesson_id, course_id, author_id, title, body)
     values ($1, $2, $3, 'Titulo base', 'Cuerpo base') returning id`,
    [ID.lessonA, ID.courseA, ID.student],
  );
const respuestaFresca = (autor) => async (db) =>
  filaComoOwner(
    db,
    `insert into public.lesson_answers (question_id, author_id, body) values ($1, $2, 'Respuesta base') returning id`,
    [await preguntaFresca(db), autor],
  );
const BORRAR = (tabla) =>
  `update public.${tabla} set deleted_at = now(), deleted_by = '${ID.teacherA}', deleted_reason = $2
    where id = $1 returning id`;

const postFresco = (db) =>
  filaComoOwner(
    db,
    `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, 'Hola') returning id`,
    [ID.courseA, ID.student],
  );

const ATAQUES = {
  // E1 de la estampa (cierra D-26): la encontro este invariante el dia que nacio y se cerro en 0031.
  'campus_posts.deleted_reason': { actor: DUENA, fila: postFresco, sql: BORRAR('campus_posts') },
  'campus_posts.body': {
    actor: ALUMNA,
    fila: (db) =>
      filaComoOwner(
        db,
        `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, 'Hola') returning id`,
        [ID.courseA, ID.student],
      ),
    sql: `update public.campus_posts set body = $2 where id = $1 returning id`,
  },
  'lesson_questions.title': {
    actor: ALUMNA,
    fila: preguntaFresca,
    sql: `update public.lesson_questions set title = $2 where id = $1 returning id`,
  },
  'lesson_questions.body': {
    actor: ALUMNA,
    fila: preguntaFresca,
    sql: `update public.lesson_questions set body = $2 where id = $1 returning id`,
  },
  'lesson_questions.deleted_reason': { actor: DUENA, fila: preguntaFresca, sql: BORRAR('lesson_questions') },
  'lesson_answers.body': {
    actor: DUENA,
    fila: respuestaFresca(ID.teacherA),
    sql: `update public.lesson_answers set body = $2 where id = $1 returning id`,
  },
  'lesson_answers.deleted_reason': { actor: DUENA, fila: respuestaFresca(ID.student), sql: BORRAR('lesson_answers') },
};

const NUEVAS_T030 = [
  'lesson_answers.body',
  'lesson_answers.deleted_reason',
  'lesson_questions.body',
  'lesson_questions.deleted_reason',
  'lesson_questions.title',
];

describe('ADR-009/010 · la clase con sesion no acepta localizadores', () => {
  let db;
  let columnas;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    columnas = await columnasConSesion(db);
  });

  after(async () => db?.close());

  test('el recorte sigue vivo: incluye las columnas de T-030', () => {
    const nombres = columnas.map((c) => c.columna);
    const faltan = NUEVAS_T030.filter((c) => !nombres.includes(c));
    assert.deepEqual(faltan, [], `el recorte no ve: ${faltan.join(', ')}`);
  });

  test('toda columna de la clase tiene ataque o exencion escrita', () => {
    const sinDeclarar = columnas.map((c) => c.columna).filter((c) => !ATAQUES[c] && !EXENTAS[c]);
    assert.deepEqual(sinDeclarar, [], `columnas nuevas sin declarar: ${sinDeclarar.join(', ')}`);
  });

  test('no hay ataques ni exenciones de columnas que ya no estan en la clase', () => {
    const nombres = new Set(columnas.map((c) => c.columna));
    const fantasmas = [...Object.keys(ATAQUES), ...Object.keys(EXENTAS)].filter((c) => !nombres.has(c));
    assert.deepEqual(fantasmas, [], `declaradas pero fuera de la clase: ${fantasmas.join(', ')}`);
  });

  test('mitad de FORMA · toda columna no exenta tiene CHECK *_no_locator', () => {
    const sinCheck = columnas.filter((c) => !EXENTAS[c.columna] && !c.cubierta).map((c) => c.columna);
    assert.deepEqual(sinCheck, [], `sin CHECK de forma: ${sinCheck.join(', ')}`);
  });

  test('mitad EXACTA · ninguna acepta el localizador real, y la prosa si pasa', async () => {
    const fallas = [];
    for (const { columna } of columnas) {
      if (EXENTAS[columna]) continue;
      const { actor, fila, sql } = ATAQUES[columna];
      for (const valor of [SECRET.videoId, SECRET.driveFileId]) {
        const id = await fila(db);
        const r = await asUser(db, actor, () => attempt(db, sql, [id, `Mira esto: ${valor}`]));
        if (r.ok || r.code !== '42501') fallas.push(`${columna} con ${valor}: ${r.ok ? 'ACEPTO' : r.code}`);
      }
      const id = await fila(db);
      const control = await asUser(db, actor, () => attempt(db, sql, [id, 'Prosa normal sobre el video de hoy']));
      if (!control.ok || control.rows.length !== 1) {
        fallas.push(`${columna}: el control legitimo no paso (${control.code ?? '0 filas'})`);
      }
    }
    assert.deepEqual(fallas, [], `fallas:\n  ${fallas.join('\n  ')}`);
  });

  // Revierte UNA capa y exige que el ataque vuelva a pasar. En transaccion: no toca la base.
  test('mutacion · sin lesson_questions_locator_guard el video_id entra', async () => {
    const id = await preguntaFresca(db);
    await db.exec(`reset role; begin;`);
    try {
      await db.exec(`drop trigger lesson_questions_locator_guard on public.lesson_questions;`);
      const r = await asUser(db, ALUMNA, () =>
        attempt(db, `update public.lesson_questions set body = $2 where id = $1`, [id, `Mira ${SECRET.videoId}`]),
      );
      assert.equal(r.ok, true, 'sin el trigger el ataque DEBERIA pasar; si no, este test no prueba el trigger');
    } finally {
      await db.exec(`reset role; rollback;`);
    }
  });
});

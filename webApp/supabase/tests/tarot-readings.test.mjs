// webApp/supabase/tests/tarot-readings.test.mjs
// Tarot · tarot_readings: fila propia, sin UPDATE, guard de integridad de la tirada.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOutsider = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);

const PPF = JSON.stringify([{ i: 0, r: true }, { i: 45, r: false }, { i: 12, r: false }]);

const save = (db, who, { spread = 'pasado-presente-futuro', question = null, cards = PPF, reversed = true } = {}) =>
  who(db, () =>
    attempt(
      db,
      `insert into public.tarot_readings (spread_id, question, cards, reversed_enabled) values ($1, $2, $3::jsonb, $4) returning id, user_id`,
      [spread, question, cards, reversed],
    ),
  );

describe('tarot_readings', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('la alumna guarda una tirada y user_id lo fija el trigger', async () => {
    const r = await save(db, asStudent);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].user_id, ID.student);
  });

  test('no se puede mandar user_id (columna fuera del grant de INSERT)', async () => {
    const r = await asStudent(db, () =>
      attempt(db, `insert into public.tarot_readings (user_id, spread_id, cards, reversed_enabled) values ($1, 'pasado-presente-futuro', $2::jsonb, true)`, [ID.otro, PPF]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });

  test('anon no inserta ni lee', async () => {
    const ins = await save(db, asAnon);
    assert.equal(ins.ok, false);
    assert.equal(ins.code, '42501');
    const read = await asAnon(db, () => attempt(db, `select * from public.tarot_readings`));
    assert.equal(read.ok, false);
  });

  test('la tirada ajena se lee como 0 filas y no se borra', async () => {
    const ins = await save(db, asOutsider);
    assert.equal(ins.ok, true, ins.message);
    const propia = await asOutsider(db, () => attempt(db, `select id from public.tarot_readings where user_id = $1`, [ID.otro]));
    assert.ok(propia.rows.length >= 1);
    const read = await asStudent(db, () => attempt(db, `select id from public.tarot_readings where user_id = $1`, [ID.otro]));
    assert.equal(read.rows.length, 0);
    const del = await asStudent(db, () => attempt(db, `delete from public.tarot_readings where user_id = $1 returning id`, [ID.otro]));
    assert.equal(del.rows.length, 0);
  });

  test('no hay UPDATE', async () => {
    const r = await asStudent(db, () => attempt(db, `update public.tarot_readings set question = 'x' where user_id = $1`, [ID.student]));
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });

  test('la dueña borra la suya', async () => {
    const del = await asStudent(db, () => attempt(db, `delete from public.tarot_readings where user_id = $1 returning id`, [ID.student]));
    assert.ok(del.rows.length >= 1);
  });

  for (const [nombre, args] of [
    ['cantidad incorrecta', { cards: JSON.stringify([{ i: 1, r: false }, { i: 2, r: false }]) }],
    ['índice fuera de rango', { cards: JSON.stringify([{ i: 1, r: false }, { i: 2, r: false }, { i: 78, r: false }]) }],
    ['índice repetido', { cards: JSON.stringify([{ i: 1, r: false }, { i: 2, r: false }, { i: 1, r: false }]) }],
    ['r no booleano', { cards: JSON.stringify([{ i: 1, r: 'sí' }, { i: 2, r: false }, { i: 3, r: false }]) }],
    ['invertida con reversed_enabled=false', { reversed: false }],
    ['carta del día invertida', { spread: 'carta-del-dia', cards: JSON.stringify([{ i: 5, r: true }]) }],
    ['tirada desconocida', { spread: 'herradura', cards: JSON.stringify([{ i: 1, r: false }]) }],
    ['pregunta con salto de línea', { question: 'hola\nchau' }],
    ['pregunta de 141', { question: 'a'.repeat(141) }],
    ['elementos vacíos', { cards: '[{},{},{}]' }],
    ['sin r', { cards: '[{"i":1},{"i":2},{"i":3}]' }],
    ['sin i', { cards: '[{"r":false},{"r":false},{"r":false}]' }],
    ['elementos no objeto', { cards: '[1,2,3]' }],
    ['índice no entero', { cards: '[{"i":1.5,"r":false},{"i":2,"r":false},{"i":3,"r":false}]' }],
    ['cards no array', { cards: '{"i":1}' }],
  ]) {
    test(`rechaza ${nombre}`, async () => {
      const r = await save(db, asStudent, args);
      assert.equal(r.ok, false, nombre);
      assert.equal(r.code, '23514', `${nombre}: ${r.message}`);
    });
  }

  test('sí/no acepta 1 y 3 cartas', async () => {
    assert.equal((await save(db, asStudent, { spread: 'si-o-no', cards: JSON.stringify([{ i: 7, r: false }]) })).ok, true);
    assert.equal((await save(db, asStudent, { spread: 'si-o-no', cards: JSON.stringify([{ i: 7, r: false }, { i: 8, r: true }, { i: 9, r: false }]) })).ok, true);
  });

  test('rechaza una pregunta con un localizador conocido (ADR-009, mitad exacta)', async () => {
    const r = await save(db, asStudent, { question: `ver ${SECRET.videoId}` });
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });
});

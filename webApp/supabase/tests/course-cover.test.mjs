// T-047 · Portada de curso. Lo que la base acepta en `courses.cover_path` y quien puede escribirlo.
//
// POR QUE UN CHECK Y NO UN GUARD. La pertenencia ("la portada de X vive en covers/X/") la expresa
// el CHECK leyendo `id` de la misma fila: no hay trigger nuevo ni caso de alcanzabilidad (ADR-011).
// Quien escribe la fila lo decide `courses_update_own`; que el path sea de ESE curso, el CHECK.
// Storage no corre en PGlite: las policies de `storage.objects` (y el cierre de D-34) se prueban
// solo en B-1.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const PRIV_DENIED = '42501';
const ARCHIVO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const portadaDe = (courseId, ext = 'jpg') => `covers/${courseId}/${ARCHIVO}.${ext}`;

const asTeacherA = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asTeacherB = (db, fn) => asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, fn);
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const ponerPortada = (db, courseId, path) =>
  attempt(db, `update public.courses set cover_path = $1 where id = $2 returning id`, [path, courseId]);
const portadaActual = async (db, courseId) =>
  (await db.query(`select cover_path from public.courses where id = $1`, [courseId])).rows[0].cover_path;

describe('T-047 · courses.cover_path', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('c.1 · la duena apunta la portada a la carpeta de su curso y la quita', async () => {
    const poner = await asTeacherA(db, () => ponerPortada(db, ID.courseA, portadaDe(ID.courseA, 'webp')));
    assert.equal(poner.ok, true, poner.message);
    assert.equal(poner.rows.length, 1, 'el UPDATE no alcanzo la fila propia');
    const quitar = await asTeacherA(db, () => ponerPortada(db, ID.courseA, null));
    assert.equal(quitar.ok, true, quitar.message);
    assert.equal(await portadaActual(db, ID.courseA), null);
  });

  test('c.5 · un path de OTRO curso lo rechaza el CHECK, aunque lo escriba la duena', async () => {
    const r = await asTeacherA(db, () => ponerPortada(db, ID.courseA, portadaDe(ID.courseB)));
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('c.5 · service_role tampoco lo saltea: es invariante, no permiso', async () => {
    const r = await asService(db, () => ponerPortada(db, ID.courseA, portadaDe(ID.courseB)));
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('forma cerrada: nombre libre, extension fuera de lista, svg y avatars/ rebotan', async () => {
    for (const malo of [
      `covers/${ID.courseA}/foto.jpg`,
      `covers/${ID.courseA}/${ARCHIVO}.gif`,
      `covers/${ID.courseA}/${ARCHIVO}.svg`,
      `covers/${ID.courseA}/${ARCHIVO}.JPG`,
      `avatars/${ID.courseA}/${ARCHIVO}.jpg`,
      `covers/${ID.courseA}/sub/${ARCHIVO}.jpg`,
      `covers/${ID.courseA}/${ARCHIVO}.jpg drive.google.com/file/d/LEAKED123`,
    ]) {
      const r = await asTeacherA(db, () => ponerPortada(db, ID.courseA, malo));
      assert.equal(r.code, CHECK_VIOLATION, `paso: ${malo}`);
    }
  });

  test('otra docente no alcanza la fila: cero filas y el valor no cambia', async () => {
    const r = await asTeacherB(db, () => ponerPortada(db, ID.courseA, portadaDe(ID.courseA)));
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 0, 'la docente B alcanzo el curso de A');
    assert.equal(await portadaActual(db, ID.courseA), null);
  });

  test('la alumna no alcanza la fila', async () => {
    const r = await asStudent(db, () => ponerPortada(db, ID.courseB, portadaDe(ID.courseB)));
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 0);
  });

  test('R-1 · grants: SELECT a anon y authenticated, UPDATE solo authenticated, sin INSERT', async () => {
    const { rows } = await db.query(`
      select has_column_privilege('anon', 'public.courses', 'cover_path', 'SELECT')          as anon_sel,
             has_column_privilege('anon', 'public.courses', 'cover_path', 'UPDATE')          as anon_upd,
             has_column_privilege('authenticated', 'public.courses', 'cover_path', 'SELECT') as auth_sel,
             has_column_privilege('authenticated', 'public.courses', 'cover_path', 'UPDATE') as auth_upd,
             has_column_privilege('authenticated', 'public.courses', 'cover_path', 'INSERT') as auth_ins`);
    assert.deepEqual(rows[0], { anon_sel: true, anon_upd: false, auth_sel: true, auth_upd: true, auth_ins: false });
  });

  test('anon lee cover_path de un curso publicado (la ficha publica lo necesita para firmar)', async () => {
    const r = await asAnon(db, () => attempt(db, `select cover_path from public.courses where id = $1`, [ID.courseA]));
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
  });

  test('anon NO lee cover_path de un borrador (c.6: courses_read filtra la fila)', async () => {
    await asService(db, () => ponerPortada(db, ID.courseDraft, portadaDe(ID.courseDraft)));
    const r = await asAnon(db, () =>
      attempt(db, `select cover_path from public.courses where id = $1`, [ID.courseDraft]),
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 0);
    await asService(db, () => ponerPortada(db, ID.courseDraft, null));
  });

  test('sin INSERT: un alta con cover_path da 42501', async () => {
    const r = await asTeacherA(db, () =>
      attempt(
        db,
        `insert into public.courses (slug, title, discipline, level, teacher_id, cover_path)
         values ('con-portada', 'X', 'tarot', 'iniciacion', $1, null)`,
        [ID.teacherA],
      ),
    );
    assert.equal(r.code, PRIV_DENIED);
  });
});

describe('T-047 · control: sin el CHECK el path ajeno pasa', () => {
  test('revirtiendo SOLO courses_cover_path_no_locator, la duena apunta a covers/<otro>/', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`alter table public.courses drop constraint courses_cover_path_no_locator;`],
    });
    try {
      await seed(db);
      const r = await asTeacherA(db, () => ponerPortada(db, ID.courseA, portadaDe(ID.courseB)));
      assert.equal(r.ok, true, 'sin el CHECK deberia pasar: si no pasa, el test de arriba no prueba el CHECK');
      assert.equal(r.rows.length, 1);
    } finally {
      await db.close();
    }
  });
});

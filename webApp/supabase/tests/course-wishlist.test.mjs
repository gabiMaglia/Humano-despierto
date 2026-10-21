// T-033 · course_wishlist: RLS de duena contra Postgres real (PGlite).
// Filas ajenas: SELECT devuelve 0, DELETE afecta 0 (la RLS filtra, no da error). INSERT con
// user_id ajeno o curso no publicado es 42501 (WITH CHECK). El control negativo debilita las
// policies y exige que el mismo ataque pase: sin eso el verde no probaria nada.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOutsider = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);

const save = (db, who, userId, courseId) =>
  who(db, () =>
    attempt(db, `insert into public.course_wishlist (user_id, course_id) values ($1, $2) returning course_id`, [
      userId,
      courseId,
    ]),
  );
const count = async (db, userId) =>
  Number(
    (await db.query(`select count(*)::int as n from public.course_wishlist where user_id = $1`, [userId])).rows[0].n,
  );

describe('T-033 · course_wishlist', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('la alumna guarda un curso publicado y lo quita (camino legitimo)', async () => {
    const ins = await save(db, asStudent, ID.student, ID.courseB);
    assert.equal(ins.ok, true, ins.message);
    assert.equal(await count(db, ID.student), 1);
    const del = await asStudent(db, () =>
      attempt(db, `delete from public.course_wishlist where course_id = $1 returning course_id`, [ID.courseB]),
    );
    assert.equal(del.rows.length, 1);
    assert.equal(await count(db, ID.student), 0);
  });

  test('insertar con user_id ajeno es 42501', async () => {
    const r = await save(db, asStudent, ID.otro, ID.courseB);
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
    assert.equal(await count(db, ID.otro), 0);
  });

  test('guardar un curso draft es 42501', async () => {
    const r = await save(db, asStudent, ID.student, ID.courseDraft);
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });

  test('la wishlist ajena se lee como 0 filas y no se puede borrar', async () => {
    const ins = await save(db, asOutsider, ID.otro, ID.courseB);
    assert.equal(ins.ok, true, ins.message);
    const read = await asStudent(db, () => attempt(db, `select * from public.course_wishlist`));
    assert.equal(read.rows.length, 0);
    const del = await asStudent(db, () =>
      attempt(db, `delete from public.course_wishlist where user_id = $1 returning course_id`, [ID.otro]),
    );
    assert.equal(del.rows.length, 0);
    assert.equal(await count(db, ID.otro), 1);
  });

  test('no hay UPDATE: ni robar la fila', async () => {
    const r = await asOutsider(db, () =>
      attempt(db, `update public.course_wishlist set user_id = $1 where user_id = $2`, [ID.student, ID.otro]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });

  test('guardar dos veces el mismo curso es 23505 (clave primaria)', async () => {
    const r = await save(db, asOutsider, ID.otro, ID.courseB);
    assert.equal(r.ok, false);
    assert.equal(r.code, '23505');
  });

  test('anon no lee la tabla', async () => {
    const r = await asAnon(db, () => attempt(db, `select * from public.course_wishlist`));
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
  });
});

describe('T-033 · control negativo: sin la policy de duena el ataque SI pasa', () => {
  const WEAKEN = `
    drop policy course_wishlist_read_own on public.course_wishlist;
    drop policy course_wishlist_delete_own on public.course_wishlist;
    create policy course_wishlist_read_own on public.course_wishlist for select to authenticated using (true);
    create policy course_wishlist_delete_own on public.course_wishlist for delete to authenticated using (true);`;

  test('con las policies debilitadas, la alumna borra la fila ajena', async () => {
    const { db } = await bootDatabase({ afterMigrations: [WEAKEN] });
    await seed(db);
    await save(db, asOutsider, ID.otro, ID.courseB);
    const del = await asStudent(db, () =>
      attempt(db, `delete from public.course_wishlist where user_id = $1 returning course_id`, [ID.otro]),
    );
    assert.equal(del.rows.length, 1, 'el control no muerde');
    await db.close();
  });
});

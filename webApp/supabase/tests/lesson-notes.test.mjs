// T-045 · editar y borrar notas: "edito/borro la nota de otra" contra Postgres real (PGlite).
//
// Cada caso ejecuta el DML con SET ROLE authenticated y los claims como los deja PostgREST.
// Una policy UPDATE/DELETE con USING falso NO da error: filtra la fila y afecta 0 filas, asi que
// el ataque se afirma por "0 filas" Y por la verdad en la tabla, no por un codigo de error.
// El control negativo reemplaza las policies por unas sin `user_id = auth.uid()` y exige que el
// mismo ataque SI pase: sin eso, el verde no probaria nada.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOutsider = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);

const bodyOf = async (db, id) =>
  (await db.query(`select body, at_seconds, user_id from public.lesson_notes where id = $1`, [id])).rows[0];

// La nota de la otra alumna se crea como lo haria ella: por la policy de INSERT, sobre la
// leccion preview (la unica que una alumna sin inscripcion puede anotar).
async function noteOfOutsider(db, body = 'nota de la otra') {
  const r = await asOutsider(db, () =>
    attempt(
      db,
      `insert into public.lesson_notes (user_id, course_id, lesson_id, at_seconds, body)
       values ($1, $2, $3, 77, $4) returning id`,
      [ID.otro, ID.courseA, ID.lessonPreviewB, body],
    ),
  );
  assert.equal(r.ok, true, `precondicion: la otra alumna no pudo crear su nota (${r.message})`);
  return r.rows[0].id;
}

describe('T-045 · lesson_notes: ataque "nota ajena" y camino legitimo', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('editar la nota de otra afecta 0 filas y no cambia el body', async () => {
    const id = await noteOfOutsider(db);
    const r = await asStudent(db, () =>
      attempt(db, `update public.lesson_notes set body = 'secuestrada' where id = $1 returning id`, [id]),
    );
    assert.equal(r.ok, true, 'la RLS filtra en silencio: no debe haber error');
    assert.equal(r.rows.length, 0, 'el ataque afecto filas ajenas');
    assert.equal((await bodyOf(db, id)).body, 'nota de la otra');
  });

  test('borrar la nota de otra afecta 0 filas y la nota sigue', async () => {
    const id = await noteOfOutsider(db);
    const r = await asStudent(db, () =>
      attempt(db, `delete from public.lesson_notes where id = $1 returning id`, [id]),
    );
    assert.equal(r.ok, true);
    assert.equal(r.rows.length, 0, 'el ataque borro una nota ajena');
    assert.ok(await bodyOf(db, id), 'la nota ajena desaparecio');
  });

  test('robar la nota (cambiar user_id) es 42501: la columna no esta en el grant', async () => {
    const id = await noteOfOutsider(db);
    const r = await asStudent(db, () =>
      attempt(db, `update public.lesson_notes set user_id = $2 where id = $1`, [id, ID.student]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, '42501');
    assert.equal((await bodyOf(db, id)).user_id, ID.otro);
  });

  test('la dueña edita su nota: body nuevo, at_seconds intacto; at_seconds no se pierde', async () => {
    const ins = await asStudent(db, () =>
      attempt(
        db,
        `insert into public.lesson_notes (user_id, course_id, lesson_id, at_seconds, body)
         values ($1, $2, $3, 125, 'original') returning id`,
        [ID.student, ID.courseA, ID.lessonA],
      ),
    );
    assert.equal(ins.ok, true, ins.message);
    const id = ins.rows[0].id;

    const upd = await asStudent(db, () =>
      attempt(db, `update public.lesson_notes set body = 'editada' where id = $1 returning id`, [id]),
    );
    assert.equal(upd.ok, true, upd.message);
    assert.equal(upd.rows.length, 1);
    const after = await bodyOf(db, id);
    assert.equal(after.body, 'editada');
    assert.equal(after.at_seconds, 125);

    const del = await asStudent(db, () =>
      attempt(db, `delete from public.lesson_notes where id = $1 returning id`, [id]),
    );
    assert.equal(del.ok, true, del.message);
    assert.equal(del.rows.length, 1);
    assert.equal(await bodyOf(db, id), undefined);
  });
});

describe('T-045 · control negativo: sin `user_id = auth.uid()` el ataque SI pasa', () => {
  // UPDATE/DELETE con WHERE necesitan ver la fila por la policy de SELECT: para que el ataque
  // pase hay que quitar `user_id = auth.uid()` de las tres, no solo de la que muta.
  const WEAKEN = `
    drop policy lesson_notes_read_own on public.lesson_notes;
    create policy lesson_notes_read_own on public.lesson_notes
      for select to authenticated using (true);
    drop policy lesson_notes_update_own on public.lesson_notes;
    drop policy lesson_notes_delete_own on public.lesson_notes;
    create policy lesson_notes_update_own on public.lesson_notes
      for update to authenticated using (true) with check (true);
    create policy lesson_notes_delete_own on public.lesson_notes
      for delete to authenticated using (true);`;

  test('con las policies debilitadas, editar y borrar la nota ajena afectan 1 fila', async () => {
    const { db } = await bootDatabase({ afterMigrations: [WEAKEN] });
    await seed(db);
    const id = await noteOfOutsider(db);

    const upd = await asStudent(db, () =>
      attempt(db, `update public.lesson_notes set body = 'secuestrada' where id = $1 returning id`, [id]),
    );
    assert.equal(upd.rows.length, 1, 'el control no muerde: el ataque tendria que haber pasado');
    assert.equal((await bodyOf(db, id)).body, 'secuestrada');

    const del = await asStudent(db, () =>
      attempt(db, `delete from public.lesson_notes where id = $1 returning id`, [id]),
    );
    assert.equal(del.rows.length, 1);
    await db.close();
  });
});

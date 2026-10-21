// T-041 · El alta por Google no puede abortar por el nombre que manda el proveedor.
//
// `handle_new_user` corre DENTRO del insert de GoTrue en auth.users: si el CHECK de 0008 o el guard
// exacto de 0025 rechazan el full_name, no falla el perfil, falla la cuenta entera y la persona ve
// un server_error de Google. El nombre lo elige quien tiene la cuenta de Google, no nosotros.
//
// Se inserta como owner (lo mismo que hace seed.mjs): el trigger es SECURITY DEFINER, así que el
// rol que inserta no cambia lo que se prueba.

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { bootDatabase } from '../harness/db.mjs';
import { seed, SECRET } from './seed.mjs';

let db;

before(async () => {
  ({ db } = await bootDatabase());
  // Con el seed hay un lessons.video_id real: sin él, el caso del guard exacto pasaría por vacío.
  await seed(db);
});

/** Simula el insert de GoTrue y devuelve la fila de profiles que dejó el trigger. */
async function alta(meta) {
  const id = randomUUID();
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
    [id, `${id}@oauth.test`, JSON.stringify(meta)],
  );
  const { rows } = await db.query(`select role, full_name from public.profiles where id = $1`, [id]);
  assert.equal(rows.length, 1, 'el trigger no creó la fila de profiles');
  return rows[0];
}

describe('handle_new_user · nombre del proveedor', () => {
  test('Google normal: full_name y name iguales → full_name (camino legítimo)', async () => {
    assert.deepEqual(await alta({ full_name: 'Ana Pérez', name: 'Ana Pérez' }), {
      role: 'student',
      full_name: 'Ana Pérez',
    });
  });

  test('proveedor que manda solo name → se usa name', async () => {
    assert.equal((await alta({ name: 'Solo Name' })).full_name, 'Solo Name');
  });

  test('full_name en blanco y name presente → se usa name', async () => {
    assert.equal((await alta({ full_name: '   ', name: 'Ana Pérez' })).full_name, 'Ana Pérez');
  });

  test('espacios alrededor se recortan', async () => {
    assert.equal((await alta({ full_name: '  Ana Pérez  ' })).full_name, 'Ana Pérez');
  });

  test('ni full_name ni name → cadena vacía (camino legítimo)', async () => {
    assert.equal((await alta({})).full_name, '');
  });

  test('más de 120 caracteres se recorta a 120 (espejo de fullNameSchema)', async () => {
    assert.equal((await alta({ full_name: 'a'.repeat(200) })).full_name, 'a'.repeat(120));
  });

  test("'Ana Perez.com' no es un localizador y se conserva (camino legítimo, ADR-011)", async () => {
    assert.equal((await alta({ full_name: 'Ana Perez.com' })).full_name, 'Ana Perez.com');
  });

  for (const nombre of ['Ana www.perez.com', 'Ana https://evil.io']) {
    test(`nombre con forma de localizador (${nombre}) → la cuenta se crea con full_name vacío`, async () => {
      assert.deepEqual(await alta({ full_name: nombre, name: nombre }), { role: 'student', full_name: '' });
    });
  }

  test('nombre con un video_id real (guard exacto de 0025) → la cuenta se crea con full_name vacío', async () => {
    assert.equal((await alta({ full_name: `Sol ${SECRET.videoId}` })).full_name, '');
  });

  test('si full_name es localizador NO cae a name: el proveedor mandó el mismo dato en los dos', async () => {
    assert.equal((await alta({ full_name: 'Ana www.perez.com', name: 'Ana' })).full_name, '');
  });

  test('role en metadata se ignora: siempre student (ADR-006, camino legítimo)', async () => {
    assert.equal((await alta({ full_name: 'Ana', role: 'admin', user_role: 'admin' })).role, 'student');
  });
});

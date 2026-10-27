// T-080 · D-15 · formations/testimonials (jsonb, los lee anon) con coincidencia exacta.
// Lo escribe service_role: el invariante no tiene bypass (ADR-011).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const SERVIDOR = { sub: null, role: 'service_role' };

describe('D-15 · jsonb publico de profiles con la mitad exacta', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  const escribir = (col, valor) =>
    asUser(db, SERVIDOR, () =>
      attempt(db, `update public.profiles set ${col} = $1::jsonb where id = $2 returning id`, [JSON.stringify(valor), ID.teacherA]),
    );

  for (const col of ['formations', 'testimonials']) {
    test(`${col}: el video_id real dentro de un item se rechaza`, async () => {
      const r = await escribir(col, [{ year: '2021', title: `Clase ${SECRET.videoId}`, place: 'Rosario' }]);
      assert.equal(r.ok, false, `${col} acepto el video_id de una leccion paga`);
      assert.equal(r.code, '42501');
    });

    test(`${col}: el drive_file_id con separadores tambien`, async () => {
      const r = await escribir(col, [{ year: '2021', title: 'Material', place: SECRET.driveFileId.split('').join('-') }]);
      assert.equal(r.ok, false, `${col} acepto el drive_file_id disfrazado`);
    });

    test(`${col}: contenido normal pasa (ADR-011)`, async () => {
      const r = await escribir(col, [{ year: '2019', title: 'Formacion en tarot evolutivo', place: 'Buenos Aires' }]);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });
  }
});

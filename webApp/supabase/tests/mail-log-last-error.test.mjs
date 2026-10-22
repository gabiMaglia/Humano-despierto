// T-054 · 0036 · `mail_log.last_error` (ADR-014, enmienda E2).
//
// Retirar un turno por falla permanente deja la causa, para que la recuperación de un 401/403
// por mala config pueda borrar SOLO esas filas y nunca un 409 (ese mail pudo haber salido).
// El formato es una whitelist: el texto libre del proveedor puede traer direcciones y no entra.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const claim = (db, scope) =>
  attempt(db, `select * from public.claim_or_reclaim_mail_slot($1, 'welcome', $2)`, [ID.student, scope]);

// La MISMA sentencia que `notify.ts::retireMailSlot`: fencing por id + claimed_at + sin enviar.
const retire = (db, row, lastError) =>
  attempt(
    db,
    `update public.mail_log set attempts = 3, last_error = $3
     where id = $1 and claimed_at = $2 and sent_at is null
     returning id`,
    [row.id, row.claimed_at, lastError],
  );

describe('mail_log.last_error (0036)', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db.close());

  test('service_role retira con la causa, y el turno no se reclama más', async () => {
    const res = await asService(db, async () => {
      const row = (await claim(db, 'e2-ok')).rows[0];
      const upd = await retire(db, row, 'permanent:403/validation_error');
      assert.equal(upd.ok, true, upd.message);
      assert.equal(upd.rows.length, 1);
      return claim(db, 'e2-ok');
    });
    assert.equal(res.rows.length, 0);
    const stored = await asService(db, () =>
      attempt(db, `select last_error from public.mail_log where scope_key = 'e2-ok'`),
    );
    assert.equal(stored.rows[0].last_error, 'permanent:403/validation_error');
  });

  for (const bad of [
    'permanent:403/The x.com domain is not verified',
    'alumna@test.local',
    'transient:500/application_error',
    'permanent:40/x',
    `permanent:422/${'a'.repeat(65)}`,
  ]) {
    test(`rechaza texto fuera del formato: ${bad.slice(0, 40)}`, async () => {
      const res = await asService(db, async () => {
        const row = (await claim(db, `e2-bad-${bad.length}-${bad.charCodeAt(0)}`)).rows[0];
        return retire(db, row, bad);
      });
      assert.equal(res.ok, false);
      assert.equal(res.code, CHECK_VIOLATION);
    });
  }

  test('authenticated no lee la columna', async () => {
    const res = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
      attempt(db, `select last_error from public.mail_log limit 1`),
    );
    assert.equal(res.ok, false);
    assert.equal(res.code, PRIV_DENIED);
  });

  test('anon no la escribe', async () => {
    const res = await asAnon(db, () =>
      attempt(db, `update public.mail_log set last_error = 'permanent:401/x'`),
    );
    assert.equal(res.ok, false);
    assert.equal(res.code, PRIV_DENIED);
  });
});

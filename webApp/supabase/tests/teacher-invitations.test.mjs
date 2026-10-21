// T-049 · Invitaciones de docentes. La tabla no la toca ningun cliente; la escribe el servidor y
// el rol lo cambia una sola funcion. Estos casos prueban la tabla y el guard; la funcion de
// aceptacion tiene su describe abajo.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV = '42501';
const INVALID = '22023';
const CHECK = '23514';
const UNIQUE = '23505';

const NUEVA = '10490000-0000-4000-8000-000000000001';
const AJENA = '10490000-0000-4000-8000-000000000002';
const SIN_CONFIRMAR = '10490000-0000-4000-8000-000000000003';

const hash = (token) => createHash('sha256').update(token, 'utf8').digest('hex');
// 43 caracteres base64url, la forma de un token real de 32 bytes.
const token = (tag) => `${tag}-`.padEnd(43, 'x');

const comoServidor = async (db, fn) => {
  await db.exec('set role service_role;');
  try {
    return await fn();
  } finally {
    await db.exec('reset role;');
  }
};

const invitar = (db, email, tok, { invitedBy = ID.admin, vencida = false } = {}) =>
  comoServidor(db, () =>
    attempt(
      db,
      vencida
        ? `insert into public.teacher_invitations (email, token_hash, invited_by, created_at, expires_at)
           values ($1, $2, $3, now() - interval '8 days', now() - interval '1 day') returning id`
        : `insert into public.teacher_invitations (email, token_hash, invited_by) values ($1, $2, $3) returning id, expires_at`,
      [email, hash(tok), invitedBy],
    ),
  );

const filaDe = async (db, tok) =>
  (await db.query(`select * from public.teacher_invitations where token_hash = $1`, [hash(tok)])).rows[0];

async function sembrarCuentas(db) {
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${NUEVA}', 'Nueva@Humano.test', now()),
      ('${AJENA}', 'ajena@humano.test', now()),
      ('${SIN_CONFIRMAR}', 'sinconfirmar@humano.test', null);
    update auth.users set email_confirmed_at = now()
     where id in ('${ID.admin}', '${ID.teacherA}', '${ID.student}');
  `);
}

describe('T-049 · teacher_invitations: ningun cliente la toca (c.6)', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await sembrarCuentas(db);
    const r = await invitar(db, 'nueva@humano.test', token('c6'));
    assert.equal(r.ok, true, r.message);
  });
  after(async () => db?.close());

  const actores = [
    ['la alumna', (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn)],
    ['la docente', (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn)],
    ['el admin con su JWT', (db, fn) => asUser(db, { sub: ID.admin, userRole: 'admin' }, fn)],
    ['anon', (db, fn) => asAnon(db, fn)],
  ];

  for (const [quien, como] of actores) {
    test(`${quien}: select, insert y update dan 42501`, async () => {
      const leer = await como(db, () => attempt(db, `select email, token_hash from public.teacher_invitations`));
      assert.equal(leer.ok, false, `${quien} leyo invitaciones`);
      assert.equal(leer.code, PRIV);

      const crear = await como(db, () =>
        attempt(db, `insert into public.teacher_invitations (email, token_hash, invited_by) values ('yo@humano.test', $1, $2)`, [
          hash(token('propia')),
          ID.admin,
        ]),
      );
      assert.equal(crear.ok, false, `${quien} se creo una invitacion`);
      assert.equal(crear.code, PRIV);

      const aceptar = await como(db, () =>
        attempt(db, `update public.teacher_invitations set accepted_at = now(), accepted_by = $1`, [ID.student]),
      );
      assert.equal(aceptar.ok, false, `${quien} se acepto una invitacion por UPDATE`);
      assert.equal(aceptar.code, PRIV);
    });
  }
});

describe('T-049 · teacher_invitations: forma, unicidad y guard', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await sembrarCuentas(db);
  });
  after(async () => db?.close());

  test('el mail se guarda normalizado: mayusculas o espacios dan 23514', async () => {
    for (const email of ['Nueva@humano.test', ' nueva@humano.test', 'sin-arroba']) {
      const r = await invitar(db, email, token(`forma-${email.length}`));
      assert.equal(r.ok, false, `entro ${JSON.stringify(email)}`);
      assert.equal(r.code, CHECK);
    }
  });

  test('token_hash que no es sha256 hex: 23514', async () => {
    const r = await comoServidor(db, () =>
      attempt(db, `insert into public.teacher_invitations (email, token_hash, invited_by) values ('x@humano.test', 'TOKEN-EN-CLARO', $1)`, [ID.admin]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK);
  });

  test('nace pendiente y con autor: accepted_at o invited_by nulo en el INSERT dan 22023', async () => {
    const aceptada = await comoServidor(db, () =>
      attempt(
        db,
        `insert into public.teacher_invitations (email, token_hash, invited_by, accepted_at, accepted_by) values ('y@humano.test', $1, $2, now(), $3)`,
        [hash(token('nace-aceptada')), ID.admin, NUEVA],
      ),
    );
    assert.equal(aceptada.ok, false);
    assert.equal(aceptada.code, INVALID);

    const sinAutor = await invitar(db, 'z@humano.test', token('sin-autor'), { invitedBy: null });
    assert.equal(sinAutor.ok, false);
    assert.equal(sinAutor.code, INVALID);
  });

  test('una sola pendiente por mail (c.7) y revocar la libera (reenviar)', async () => {
    const primera = await invitar(db, 'dos@humano.test', token('dos-a'));
    assert.equal(primera.ok, true, primera.message);
    const segunda = await invitar(db, 'dos@humano.test', token('dos-b'));
    assert.equal(segunda.ok, false, 'entraron dos pendientes para el mismo mail');
    assert.equal(segunda.code, UNIQUE);
    assert.match(segunda.message, /teacher_invitations_pending_email/);

    const revocar = await comoServidor(db, () =>
      attempt(db, `update public.teacher_invitations set revoked_at = now(), revoked_by = $1 where id = $2`, [ID.admin, primera.rows[0].id]),
    );
    assert.equal(revocar.ok, true, revocar.message);
    const tercera = await invitar(db, 'dos@humano.test', token('dos-c'));
    assert.equal(tercera.ok, true, `revocar no libero el mail: ${tercera.message}`);
  });

  test('vence a los 7 dias por defecto', async () => {
    const r = await invitar(db, 'siete@humano.test', token('siete'));
    assert.equal(r.ok, true, r.message);
    const [{ dias }] = (
      await db.query(`select extract(day from expires_at - created_at)::int as dias from public.teacher_invitations where id = $1`, [r.rows[0].id])
    ).rows;
    assert.equal(dias, 7);
  });

  test('ni el servidor cambia email, token ni vencimiento (22023)', async () => {
    const tok = token('congelada');
    const r = await invitar(db, 'congelada@humano.test', tok);
    assert.equal(r.ok, true, r.message);
    for (const set of [
      `email = 'otra@humano.test'`,
      `token_hash = '${'0'.repeat(64)}'`,
      `expires_at = now() + interval '1 year'`,
      `created_at = now() - interval '1 day'`,
      `invited_by = '${ID.teacherA}'`,
    ]) {
      const u = await comoServidor(db, () => attempt(db, `update public.teacher_invitations set ${set} where token_hash = $1`, [hash(tok)]));
      assert.equal(u.ok, false, `el servidor pudo ${set}`);
      assert.equal(u.code, INVALID);
    }
  });

  test('aceptar por UPDATE una vencida: 22023 (el guard, no solo la funcion)', async () => {
    const tok = token('vencida-guard');
    const r = await invitar(db, 'vencida-guard@humano.test', tok, { vencida: true });
    assert.equal(r.ok, true, r.message);
    const u = await comoServidor(db, () =>
      attempt(db, `update public.teacher_invitations set accepted_at = now(), accepted_by = $1 where token_hash = $2`, [NUEVA, hash(tok)]),
    );
    assert.equal(u.ok, false);
    assert.equal(u.code, INVALID);
  });

  test('una resuelta no se vuelve a resolver: revocar dos veces o revocar una aceptada da 22023', async () => {
    const tok = token('resuelta');
    const r = await invitar(db, 'resuelta@humano.test', tok);
    assert.equal(r.ok, true, r.message);
    const set = (s) => comoServidor(db, () => attempt(db, `update public.teacher_invitations set ${s} where token_hash = $1`, [hash(tok)]));
    assert.equal((await set(`revoked_at = now(), revoked_by = '${ID.admin}'`)).ok, true);
    const otra = await set(`revoked_at = now() + interval '1 minute', revoked_by = '${ID.admin}'`);
    assert.equal(otra.ok, false);
    assert.equal(otra.code, INVALID);
    const aceptar = await set(`accepted_at = now(), accepted_by = '${NUEVA}'`);
    assert.equal(aceptar.ok, false);
    assert.equal(aceptar.code, INVALID);
  });
});

describe('T-049 · el guard cierra aunque alguien abra la tabla por error', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase({
      afterMigrations: [
        `grant select, insert, update on public.teacher_invitations to authenticated;
         create policy t049_abierta on public.teacher_invitations for all to authenticated using (true) with check (true);`,
      ],
    }));
    await seed(db);
  });
  after(async () => db?.close());

  test('con grant y policy abiertos, la alumna igual recibe 42501 del guard', async () => {
    const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
      attempt(db, `insert into public.teacher_invitations (email, token_hash, invited_by) values ('alumna@humano.test', $1, $2)`, [
        hash(token('abierta')),
        ID.admin,
      ]),
    );
    assert.equal(r.ok, false, 'el guard dejo pasar un INSERT de cliente');
    assert.equal(r.code, PRIV);
    assert.match(r.message, /solo la escribe el servidor/);
  });
});

describe('T-049 · accept_teacher_invitation', () => {
  let db;
  const aceptar = (tok, userId) =>
    comoServidor(db, () => attempt(db, `select public.accept_teacher_invitation($1, $2) as ok`, [hash(tok), userId]));
  const rolDe = async (id) => (await db.query(`select role from public.profiles where id = $1`, [id])).rows[0]?.role;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await sembrarCuentas(db);
  });
  after(async () => db?.close());

  test('ningun cliente la ejecuta: alumna, admin con JWT y anon dan 42501 (c.6)', async () => {
    const sql = `select public.accept_teacher_invitation($1, $2)`;
    const args = [hash(token('nadie')), ID.student];
    for (const r of [
      await asUser(db, { sub: ID.student, userRole: 'student' }, () => attempt(db, sql, args)),
      await asUser(db, { sub: ID.admin, userRole: 'admin' }, () => attempt(db, sql, args)),
      await asAnon(db, () => attempt(db, sql, args)),
    ]) {
      assert.equal(r.ok, false, 'un cliente ejecuto la aceptacion');
      assert.equal(r.code, PRIV);
    }
  });

  test('token ajeno: otra cuenta confirmada recibe false y nada cambia (c.3)', async () => {
    const tok = token('ajeno');
    assert.equal((await invitar(db, 'nueva@humano.test', tok)).ok, true);
    const r = await aceptar(tok, AJENA);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].ok, false, 'una cuenta con otro mail acepto la invitacion');
    assert.equal(await rolDe(AJENA), 'student');
    const fila = await filaDe(db, tok);
    assert.equal(fila.accepted_at, null, 'la invitacion dejo de estar pendiente');
  });

  test('ok: mail igual sin importar mayusculas y confirmado, rol teacher y accepted_* escritos (c.2)', async () => {
    const r = await aceptar(token('ajeno'), NUEVA);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].ok, true);
    assert.equal(await rolDe(NUEVA), 'teacher');
    const fila = await filaDe(db, token('ajeno'));
    assert.notEqual(fila.accepted_at, null);
    assert.equal(fila.accepted_by, NUEVA);
  });

  test('aceptar dos veces la misma persona: true y no reescribe accepted_at', async () => {
    const antes = (await filaDe(db, token('ajeno'))).accepted_at.toISOString();
    const r = await aceptar(token('ajeno'), NUEVA);
    assert.equal(r.rows[0].ok, true, 'la segunda apertura del link no es idempotente');
    assert.equal((await filaDe(db, token('ajeno'))).accepted_at.toISOString(), antes);
  });

  test('ya aceptada, otra cuenta lo intenta: false (c.4)', async () => {
    const r = await aceptar(token('ajeno'), AJENA);
    assert.equal(r.rows[0].ok, false);
    assert.equal(await rolDe(AJENA), 'student');
  });

  test('mail sin confirmar: false aunque coincida (D8)', async () => {
    const tok = token('sin-confirmar');
    assert.equal((await invitar(db, 'sinconfirmar@humano.test', tok)).ok, true);
    const r = await aceptar(tok, SIN_CONFIRMAR);
    assert.equal(r.rows[0].ok, false);
    assert.equal(await rolDe(SIN_CONFIRMAR), 'student');
    assert.equal((await filaDe(db, tok)).accepted_at, null);
  });

  test('vencida, revocada, inexistente o hash malformado: false y sin efecto (c.4)', async () => {
    const vencida = token('vencida');
    assert.equal((await invitar(db, 'ajena@humano.test', vencida, { vencida: true })).ok, true);
    assert.equal((await aceptar(vencida, AJENA)).rows[0].ok, false, 'acepto una vencida');

    // La vencida sigue pendiente para el indice: revocarla libera el mail para la siguiente.
    await comoServidor(db, () =>
      attempt(db, `update public.teacher_invitations set revoked_at = now(), revoked_by = $1 where token_hash = $2`, [ID.admin, hash(vencida)]),
    );
    const revocada = token('revocada');
    assert.equal((await invitar(db, 'ajena@humano.test', revocada)).ok, true);
    await comoServidor(db, () =>
      attempt(db, `update public.teacher_invitations set revoked_at = now(), revoked_by = $1 where token_hash = $2`, [ID.admin, hash(revocada)]),
    );
    assert.equal((await aceptar(revocada, AJENA)).rows[0].ok, false, 'acepto una revocada');

    assert.equal((await aceptar(token('no-existe'), AJENA)).rows[0].ok, false);
    const malformado = await comoServidor(db, () =>
      attempt(db, `select public.accept_teacher_invitation($1, $2) as ok`, ['TOKEN-EN-CLARO', AJENA]),
    );
    assert.equal(malformado.rows[0].ok, false);
    assert.equal(await rolDe(AJENA), 'student');
  });

  test('una admin que acepta sigue admin; una docente sigue docente (c.10)', async () => {
    const paraAdmin = token('admin');
    assert.equal((await invitar(db, 'admin@humano.test', paraAdmin)).ok, true);
    assert.equal((await aceptar(paraAdmin, ID.admin)).rows[0].ok, true);
    assert.equal(await rolDe(ID.admin), 'admin', 'aceptar degrado a un admin');

    const paraDocente = token('docente');
    assert.equal((await invitar(db, 'sol@humano.test', paraDocente)).ok, true);
    assert.equal((await aceptar(paraDocente, ID.teacherA)).rows[0].ok, true);
    assert.equal(await rolDe(ID.teacherA), 'teacher');
  });
});

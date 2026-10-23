// T-050 · check_rate_limit + rate_limit_buckets.
//
// Ventana FIJA alineada al epoch: el error máximo es 2x en el borde (decisión del spec, compensada
// con límites bajos). Lo que se afirma acá es el MECANISMO: conteo, aislamiento por clave, reset,
// barrido sin cron y que solo service_role la ejecuta. PGlite tiene UNA conexión y serializa las
// sentencias: la prueba de concurrencia real (sin update perdido) vive en b1 (rl5), contra el
// Postgres del stack por HTTP.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const INVALID_PARAM = '22023';
const FN = 'public.check_rate_limit(text,integer,integer)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const hit = (db, key, max, windowSeconds) =>
  asService(db, async () =>
    (await db.query(
      `select allowed, remaining, retry_after_seconds from public.check_rate_limit($1, $2, $3)`,
      [key, max, windowSeconds],
    )).rows[0]);

const hitsOf = async (db, key) =>
  (await db.query(
    `select coalesce(sum(hits), 0)::int as n, count(*)::int as filas from public.rate_limit_buckets where key = $1`,
    [key],
  )).rows[0];

const privileges = async (db) =>
  (await db.query(`
    select has_function_privilege('anon',          '${FN}', 'execute') as anon_exec,
           has_function_privilege('authenticated', '${FN}', 'execute') as auth_exec,
           has_function_privilege('service_role',  '${FN}', 'execute') as srv_exec,
           has_table_privilege('anon',          'public.rate_limit_buckets', 'select,insert,update,delete') as anon_tab,
           has_table_privilege('authenticated', 'public.rate_limit_buckets', 'select,insert,update,delete') as auth_tab,
           (select relrowsecurity from pg_class where oid = 'public.rate_limit_buckets'::regclass) as rls,
           (select coalesce(array_to_string(proconfig, ','), '') from pg_proc where oid = '${FN}'::regprocedure) as config,
           (select prosecdef from pg_proc where oid = '${FN}'::regprocedure) as definer
  `)).rows[0];

describe('T-050 · check_rate_limit', () => {
  let db;
  before(async () => { ({ db } = await bootDatabase()); });
  after(async () => { await db.close(); });

  // Ventana de un día: el borde de la ventana (medianoche UTC) cae dentro de estas 6 llamadas con
  // probabilidad despreciable; con 600 s la chance sería ~ms/600000 por corrida y no hace falta.
  test('c.1 · cinco pasan, la sexta no, y la clave suma 6', async () => {
    const key = 'saveReviewAction:u:c1';
    const r = [];
    for (let i = 0; i < 6; i++) r.push(await hit(db, key, 5, 86400));
    assert.deepEqual(r.slice(0, 5).map((x) => [x.allowed, x.remaining, x.retry_after_seconds]),
      [[true, 4, 0], [true, 3, 0], [true, 2, 0], [true, 1, 0], [true, 0, 0]]);
    assert.equal(r[5].allowed, false);
    assert.equal(r[5].remaining, 0);
    assert.ok(r[5].retry_after_seconds >= 1 && r[5].retry_after_seconds <= 86400, `retry_after=${r[5].retry_after_seconds}`);
    assert.deepEqual(await hitsOf(db, key), { n: 6, filas: 1 });
  });

  test('c.2 · dos claves no se pisan: cinco y cinco pasan todas', async () => {
    for (const key of ['saveReviewAction:u:c2a', 'saveReviewAction:u:c2b']) {
      for (let i = 0; i < 5; i++) assert.equal((await hit(db, key, 5, 86400)).allowed, true, `${key} #${i + 1}`);
    }
  });

  test('c.3 · vencida la ventana vuelve a pasar y la fila vieja de la clave desaparece', async () => {
    const key = 'c3:u:x';
    // Arrancar al principio de un segundo: las dos primeras llamadas tienen que caer en la MISMA
    // ventana de 1 s, o la segunda pasaría por la razón equivocada.
    await sleep(1000 - (Date.now() % 1000) + 20);
    assert.equal((await hit(db, key, 1, 1)).allowed, true);
    assert.equal((await hit(db, key, 1, 1)).allowed, false);
    const vieja = (await db.query(
      `select extract(epoch from window_start)::bigint as ws from public.rate_limit_buckets where key = $1`, [key])).rows[0].ws;
    await sleep(1100);
    assert.equal((await hit(db, key, 1, 1)).allowed, true);
    const filas = (await db.query(
      `select extract(epoch from window_start)::bigint as ws from public.rate_limit_buckets where key = $1`, [key])).rows;
    assert.equal(filas.length, 1, 'quedó la fila vencida de la clave');
    assert.notEqual(filas[0].ws, vieja);
  });

  test('barrido sin cron: cada llamada borra hasta 50 filas vencidas de OTRAS claves', async () => {
    await db.exec(`insert into public.rate_limit_buckets (key, window_start, expires_at, hits)
                   select 'old:' || g, now() - interval '2 hours', now() - interval '1 hour', 1
                   from generate_series(1, 60) g;`);
    await hit(db, 'sweeper:u:x', 5, 86400);
    const { n } = (await db.query(`select count(*)::int as n from public.rate_limit_buckets where key like 'old:%'`)).rows[0];
    assert.equal(n, 10);
  });

  test('dos llamadas lanzadas juntas cuentan las dos', async () => {
    const key = 'par:u:x';
    const [a, b] = await asService(db, () => Promise.all([
      db.query(`select remaining from public.check_rate_limit($1, 5, 86400)`, [key]),
      db.query(`select remaining from public.check_rate_limit($1, 5, 86400)`, [key]),
    ]));
    assert.deepEqual([a.rows[0].remaining, b.rows[0].remaining].sort(), [3, 4]);
    assert.deepEqual(await hitsOf(db, key), { n: 2, filas: 1 });
  });

  test('c.4 · anon y authenticated no la ejecutan ni tocan la tabla (42501)', async () => {
    const call = `select * from public.check_rate_limit('x:u:y', 5, 60)`;
    assert.equal((await asAnon(db, () => attempt(db, call))).code, PRIV_DENIED);
    const asStudent = (fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
    assert.equal((await asStudent(() => attempt(db, call))).code, PRIV_DENIED);
    assert.equal((await asStudent(() => attempt(db, `select key from public.rate_limit_buckets`))).code, PRIV_DENIED);
    assert.equal((await asStudent(() => attempt(db,
      `insert into public.rate_limit_buckets (key, window_start, expires_at) values ('x', now(), now())`))).code, PRIV_DENIED);
    assert.equal((await asStudent(() => attempt(db, `delete from public.rate_limit_buckets`))).code, PRIV_DENIED);
  });

  test('privilegios: EXECUTE solo service_role, RLS activa, sin grants de cliente, search_path fijo', async () => {
    const p = await privileges(db);
    assert.deepEqual(
      [p.anon_exec, p.auth_exec, p.srv_exec, p.anon_tab, p.auth_tab, p.rls, p.definer],
      [false, false, true, false, false, true, true],
    );
    assert.match(p.config, /search_path=""/);
  });

  test('argumentos fuera de rango: 22023 y no escribe', async () => {
    for (const [key, max, win] of [['', 5, 60], ['k:u:x', 0, 60], ['k:u:x', 5, 0], ['k:u:x', 5, 86401], ['x'.repeat(201), 5, 60]]) {
      const r = await asService(db, () => attempt(db, `select * from public.check_rate_limit($1, $2, $3)`, [key, max, win]));
      assert.equal(r.code, INVALID_PARAM, `(${key.length}, ${max}, ${win})`);
    }
    assert.deepEqual(await hitsOf(db, 'k:u:x'), { n: 0, filas: 0 });
  });
});

describe('T-050 · control negativo: las aserciones detectan lo que dicen detectar', () => {
  test('con EXECUTE para authenticated, la aserción de privilegios lo ve', async () => {
    const { db } = await bootDatabase({ afterMigrations: [`grant execute on function ${FN} to authenticated;`] });
    assert.equal((await privileges(db)).auth_exec, true);
    await db.close();
  });

  test('con SELECT para authenticated, la aserción de tabla lo ve', async () => {
    const { db } = await bootDatabase({ afterMigrations: [`grant select on public.rate_limit_buckets to authenticated;`] });
    const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () => attempt(db, `select key from public.rate_limit_buckets`));
    assert.equal(r.ok, true, 'sin el revoke la lectura pasa: el 42501 de arriba no era casual');
    await db.close();
  });
});

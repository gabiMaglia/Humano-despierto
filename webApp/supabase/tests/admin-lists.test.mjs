// T-049 · Listados del admin: busqueda en la base (el mail vive en auth.users) y keyset estable.
// El cursor viaja como TEXTO: un Date de JS trunca a milisegundos y el keyset saltea filas.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV = '42501';
const DELF = (n) => `1049aaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CIEN = '1049bbbb-0000-4000-8000-000000000001';

const comoServidor = async (db, fn) => {
  await db.exec('set role service_role;');
  try {
    return await fn();
  } finally {
    await db.exec('reset role;');
  }
};
const usuarios = (db, q, at = null, id = null, limit = 26) =>
  comoServidor(db, () =>
    attempt(db, `select id, full_name, email, role, created_at::text as at from public.admin_list_users($1, $2, $3, $4)`, [q, at, id, limit]),
  );

async function todasLasPaginas(db, q) {
  const vistos = [];
  let at = null;
  let id = null;
  for (let pagina = 1; pagina <= 5; pagina++) {
    const r = await usuarios(db, q, at, id);
    assert.equal(r.ok, true, r.message);
    const filas = r.rows.slice(0, 25);
    vistos.push(...filas.map((f) => f.id));
    if (r.rows.length <= 25) return { vistos, paginas: pagina };
    ({ at, id } = filas.at(-1));
  }
  throw new Error('la paginacion no termino en 5 paginas');
}

describe('T-049 · listados del admin', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.exec(`
      insert into auth.users (id, email, email_confirmed_at)
      select ('1049aaaa-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
             'delf' || lpad(n::text, 2, '0') || '@humano.test', now()
        from generate_series(1, 30) n;
      update public.profiles set full_name = 'Delfina ' || right(id::text, 2) where id::text like '1049aaaa-%';
      -- Los impares comparten created_at al microsegundo; los pares difieren en microsegundos,
      -- que es justo lo que un Date de JS pierde.
      update public.profiles set created_at = timestamptz '2026-10-21 12:00:00.0005+00' where id::text like '1049aaaa-%';
      update public.profiles set created_at = created_at + (right(id::text, 2)::int * interval '1 microsecond')
       where id::text like '1049aaaa-%' and right(id::text, 2)::int % 2 = 0;
      insert into auth.users (id, email, email_confirmed_at) values ('${CIEN}', 'cien@humano.test', now());
      update public.profiles set full_name = '100% natural' where id = '${CIEN}';
      -- Una solicitud pendiente (T-043): no tiene que aparecer en la lista de inscripciones.
      insert into public.enrollments (user_id, course_id) values ('${ID.otro}', '${ID.courseB}');
      insert into public.teacher_invitations (email, token_hash, invited_by)
      values ('invitada@humano.test', '${'c'.repeat(64)}', '${ID.admin}');
    `);
  });
  after(async () => db?.close());

  test('ningun cliente ejecuta los listados ni la busqueda por mail (c.6)', async () => {
    const llamadas = [
      `select * from public.admin_list_users(null, null, null, 26)`,
      `select * from public.admin_list_courses(null, null, null, 26)`,
      `select * from public.admin_list_enrollments(null, null, null, 26)`,
      `select * from public.admin_list_invitations(null, null, null, 26)`,
      `select * from public.admin_user_by_email('alumna@humano.test')`,
      `select public.admin_like_pattern('x')`,
    ];
    for (const sql of llamadas) {
      for (const r of [
        await asUser(db, { sub: ID.admin, userRole: 'admin' }, () => attempt(db, sql)),
        await asAnon(db, () => attempt(db, sql)),
      ]) {
        assert.equal(r.ok, false, `un cliente ejecuto: ${sql}`);
        assert.equal(r.code, PRIV, `${sql}: ${r.message}`);
      }
    }
  });

  test('30 coincidencias: 2 paginas de 25, sin repetir ni saltear aunque compartan created_at (c.8)', async () => {
    const { vistos, paginas } = await todasLasPaginas(db, 'delf');
    assert.equal(paginas, 2);
    assert.equal(vistos.length, 30);
    assert.equal(new Set(vistos).size, 30, 'una fila se repitio entre paginas');
    const esperado = (
      await db.query(`select id from public.profiles where id::text like '1049aaaa-%' order by created_at desc, id desc`)
    ).rows.map((f) => f.id);
    assert.deepEqual(vistos, esperado);
  });

  test('por que el cursor es texto: truncado a milisegundos pierde filas', async () => {
    const r = await usuarios(db, 'delf');
    const ultima = r.rows[24];
    const truncado = (await db.query(`select date_trunc('milliseconds', $1::timestamptz)::text as at`, [ultima.at])).rows[0].at;
    const bien = await usuarios(db, 'delf', ultima.at, ultima.id);
    const mal = await usuarios(db, 'delf', truncado, ultima.id);
    assert.equal(bien.rows.length, 5);
    assert.equal(mal.rows.length, 0, 'si esto deja de fallar, el seed dejo de ejercitar los microsegundos');
  });

  test('busca por mail aunque el nombre no coincida, y por nombre', async () => {
    const porMail = await usuarios(db, 'delf07@');
    assert.deepEqual(porMail.rows.map((f) => f.id), [DELF(7)]);
    assert.equal(porMail.rows[0].email, 'delf07@humano.test');
    const porNombre = await usuarios(db, 'DELFINA 1');
    assert.equal(porNombre.rows.length, 10, 'Delfina 10 a 19 (no Delfina 01); ilike tiene que ignorar mayusculas');
  });

  test('los comodines de LIKE son literales', async () => {
    assert.deepEqual((await usuarios(db, '%')).rows.map((f) => f.id), [CIEN]);
    assert.equal((await usuarios(db, '_')).rows.length, 0);
  });

  test('q vacio o en blanco no filtra; after_id sin after_at arranca de cero; el limite se acota', async () => {
    const total = Number((await db.query(`select count(*) from public.profiles`)).rows[0].count);
    assert.equal((await usuarios(db, '   ', null, null, 101)).rows.length, Math.min(total, 101));
    const sinAt = await usuarios(db, 'delf', null, DELF(1));
    assert.equal(sinAt.rows.length, 26);
    assert.equal((await usuarios(db, null, null, null, 1000)).rows.length, Math.min(total, 101));
    assert.equal((await usuarios(db, null, null, null, 0)).rows.length, 1);
  });

  test('cursos: busca por docente, titulo o slug', async () => {
    const r = await comoServidor(db, () => attempt(db, `select id, teacher_name from public.admin_list_courses('sol', null, null, 26)`));
    assert.equal(r.ok, true, r.message);
    assert.ok(r.rows.some((f) => f.id === ID.courseA && f.teacher_name === 'Sol Mayor'));
    const porSlug = await comoServidor(db, () => attempt(db, `select id from public.admin_list_courses('astrologia-natal', null, null, 26)`));
    assert.deepEqual(porSlug.rows.map((f) => f.id), [ID.courseB]);
  });

  test('inscripciones: busca por mail de la alumna y deja afuera las solicitudes pendientes', async () => {
    const r = await comoServidor(db, () =>
      attempt(db, `select user_id, course_id, status, user_email from public.admin_list_enrollments('alumna@', null, null, 26)`),
    );
    assert.equal(r.ok, true, r.message);
    assert.ok(r.rows.some((f) => f.user_id === ID.student && f.course_id === ID.courseA && f.status === 'active'));
    assert.ok(r.rows.every((f) => f.user_email === 'alumna@humano.test'), 'la busqueda por mail trajo a otra');
    const otra = await comoServidor(db, () =>
      attempt(db, `select user_id, course_id, status from public.admin_list_enrollments('otra@', null, null, 26)`),
    );
    assert.equal(otra.ok, true, otra.message);
    assert.ok(otra.rows.every((f) => f.status !== 'requested'), 'una solicitud requested salio en la lista');
    assert.ok(!otra.rows.some((f) => f.course_id === ID.courseB), 'la solicitud pendiente de otra salio en la lista');
  });

  test('invitaciones: busca por mail y nunca devuelve token_hash', async () => {
    const res = await comoServidor(db, () => db.query(`select * from public.admin_list_invitations('invitada', null, null, 26)`));
    assert.equal(res.rows.length, 1);
    const columnas = res.fields.map((f) => f.name);
    assert.equal(columnas.includes('token_hash'), false, 'el listado expone el hash del token');
    assert.equal(res.rows[0].invited_by_name, 'Admin');
  });

  test('admin_user_by_email ignora mayusculas y espacios', async () => {
    const r = await comoServidor(db, () => attempt(db, `select id, role from public.admin_user_by_email(' ALUMNA@humano.test ')`));
    assert.deepEqual(r.rows, [{ id: ID.student, role: 'student' }]);
  });
});

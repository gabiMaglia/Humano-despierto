// T-043 · Inscripcion por solicitud (SP-2, D2). La alumna PIDE un curso; activarlo es de
// service_role. Cada ataque corre en mutacion real y cada capa se prueba sola: con el grant
// "destrabado" el guard tiene que cortar igual, y con el guard caido el ataque tiene que pasar
// (si no pasara, el test estaria verde por otra razon).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const MENSAJE_T043 = /nace solicitada: activarla es privilegio de service_role \(T-043\)/;

// ID.otro no tiene ninguna inscripcion en el seed: es la alumna que pide.
const asPidiente = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const pedir = (db, courseId) =>
  asPidiente(db, () =>
    attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [ID.otro, courseId]),
  );

const filaDe = async (db, userId, courseId) =>
  (
    await db.query(
      `select status, requested_at, decided_at, decided_reason, granted_by
         from public.enrollments where user_id = $1 and course_id = $2`,
      [userId, courseId],
    )
  ).rows[0];

const tieneAcceso = async (db, courseId) =>
  (await asPidiente(db, () => attempt(db, `select public.has_course_access($1) as a`, [courseId]))).rows[0].a;

describe('T-043 · la alumna pide, no se inscribe', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  test('camino legitimo: pedir un curso publicado crea una fila requested, fechada y sin otorgante', async () => {
    const r = await pedir(db, ID.courseB);
    assert.equal(r.ok, true, `la alumna no pudo pedir: ${r.message}`);
    const fila = await filaDe(db, ID.otro, ID.courseB);
    assert.equal(fila.status, 'requested');
    assert.ok(fila.requested_at, 'requested_at quedo nulo');
    assert.equal(fila.granted_by, null);
    assert.equal(fila.decided_at, null);
    assert.equal(fila.decided_reason, null);
  });

  test('la alumna lee su propia solicitud (estado, fecha y motivo estan en el grant de SELECT)', async () => {
    const r = await asPidiente(db, () =>
      attempt(
        db,
        `select status, requested_at, decided_at, decided_reason from public.enrollments where user_id = $1`,
        [ID.otro],
      ),
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
  });

  test('una solicitud no da acceso: has_course_access() es false con requested', async () => {
    assert.equal(await tieneAcceso(db, ID.courseB), false);
  });

  test('con requested no se resena ni se escribe en el hilo del curso', async () => {
    const resena = await asPidiente(db, () =>
      attempt(db, `insert into public.course_reviews (course_id, user_id, rating) values ($1, $2, 5)`, [
        ID.courseB,
        ID.otro,
      ]),
    );
    assert.equal(resena.ok, false, 'una solicitud pendiente habilito resenar');
    assert.equal(resena.code, PRIV_DENIED);

    const post = await asPidiente(db, () =>
      attempt(db, `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, 'hola')`, [
        ID.courseB,
        ID.otro,
      ]),
    );
    assert.equal(post.ok, false, 'una solicitud pendiente habilito el hilo del curso');
    assert.equal(post.code, PRIV_DENIED);
  });

  test('pedir dos veces el mismo curso: 23505 y una sola fila', async () => {
    const r = await pedir(db, ID.courseB);
    assert.equal(r.ok, false);
    assert.equal(r.code, UNIQUE_VIOLATION);
    const n = await db.query(`select count(*)::int as n from public.enrollments where user_id = $1`, [ID.otro]);
    assert.equal(n.rows[0].n, 1);
  });

  test('pedir un curso en el que ya esta activa: 23505', async () => {
    const r = await asStudent(db, () =>
      attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [ID.student, ID.courseA]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, UNIQUE_VIOLATION);
  });

  test('ataque · insertarse active: 42501 (status no esta en el grant)', async () => {
    const r = await asPidiente(db, () =>
      attempt(db, `insert into public.enrollments (user_id, course_id, status) values ($1, $2, 'active')`, [
        ID.otro,
        ID.courseA,
      ]),
    );
    assert.equal(r.ok, false, 'la alumna se auto-inscribio');
    assert.equal(r.code, PRIV_DENIED);
  });

  test('ataque · pedir a nombre de otra: 42501 (policy)', async () => {
    const r = await asPidiente(db, () =>
      attempt(db, `insert into public.enrollments (user_id, course_id) values ($1, $2)`, [ID.student, ID.courseB]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, /row-level security/);
  });

  test('ataque · pedir un curso en borrador: 42501 y ninguna fila', async () => {
    const r = await pedir(db, ID.courseDraft);
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.equal(await filaDe(db, ID.otro, ID.courseDraft), undefined);
  });

  test('ataque · pasar la propia solicitud a active: 42501 (sin grant de UPDATE)', async () => {
    const r = await asPidiente(db, () =>
      attempt(db, `update public.enrollments set status = 'active' where user_id = $1`, [ID.otro]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.equal((await filaDe(db, ID.otro, ID.courseB)).status, 'requested');
  });

  test('ataque · borrar la propia solicitud: 42501', async () => {
    const r = await asPidiente(db, () =>
      attempt(db, `delete from public.enrollments where user_id = $1`, [ID.otro]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('la trigger function nueva no es invocable por ningun rol de cliente', async () => {
    const r = await db.query(`
      select has_function_privilege('anon', 'public.guard_enrollments_insert()', 'execute') as anon,
             has_function_privilege('authenticated', 'public.guard_enrollments_insert()', 'execute') as auth`);
    assert.deepEqual(r.rows[0], { anon: false, auth: false });
  });
});

describe('T-043 · transiciones de service_role', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await pedir(db, ID.courseB);
  });

  after(async () => db?.close());

  const transicion = (set, origen) =>
    asService(db, () =>
      attempt(
        db,
        `update public.enrollments set ${set}
          where user_id = $1 and course_id = $2 and status = any($3::text[]) returning status`,
        [ID.otro, ID.courseB, origen],
      ),
    );

  test('requested -> rejected con motivo', async () => {
    const r = await transicion(`status = 'rejected', decided_at = now(), decided_reason = 'Cupo completo'`, ['requested']);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
    const fila = await filaDe(db, ID.otro, ID.courseB);
    assert.equal(fila.decided_reason, 'Cupo completo');
    assert.ok(fila.decided_at);
    assert.equal(await tieneAcceso(db, ID.courseB), false, 'rejected dio acceso');
  });

  test('rejected -> active sin limpiar el motivo viola el CHECK de consistencia', async () => {
    const r = await transicion(`status = 'active'`, ['rejected']);
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK_VIOLATION);
    assert.match(r.message, /enrollments_decided_reason_consistency/);
  });

  test('rejected -> active (el admin reconsidera) da acceso', async () => {
    const r = await transicion(
      `status = 'active', decided_reason = null, decided_at = now(), granted_by = '${ID.admin}', enrolled_at = now()`,
      ['requested', 'rejected'],
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
    assert.equal(await tieneAcceso(db, ID.courseB), true);
    assert.equal((await filaDe(db, ID.otro, ID.courseB)).granted_by, ID.admin);
  });

  test('aprobar dos veces: el segundo UPDATE con origen requested/rejected no alcanza filas', async () => {
    const r = await transicion(`status = 'active', decided_at = now()`, ['requested', 'rejected']);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 0, 'la segunda aprobacion encontro fila: el mail saldria dos veces por la action');
  });

  test('active -> revoked con motivo', async () => {
    const r = await transicion(`status = 'revoked', decided_at = now(), decided_reason = 'Pedido de la alumna'`, ['active']);
    assert.equal(r.ok, true, r.message);
    assert.equal(await tieneAcceso(db, ID.courseB), false);
  });

  test('R-3 forma · un motivo con link viola el CHECK aunque lo escriba service_role', async () => {
    const r = await transicion(`decided_reason = 'mira drive.google.com/file/d/abc'`, ['revoked']);
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK_VIOLATION);
    assert.match(r.message, /enrollments_decided_reason_no_locator/);
  });

  test('R-3 exacta · un motivo con un video_id real lo corta el guard, sin bypass', async () => {
    const r = await transicion(`decided_reason = 'la clase ${SECRET.videoId}'`, ['revoked']);
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, /localizador de contenido pago/);
  });

  test('un motivo de mas de 500 caracteres viola el CHECK', async () => {
    const r = await transicion(`decided_reason = repeat('a', 501)`, ['revoked']);
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('una fila active no puede llevar motivo', async () => {
    const r = await asService(db, () =>
      attempt(
        db,
        `insert into public.enrollments (user_id, course_id, status, decided_reason) values ($1, $2, 'active', 'x')`,
        [ID.student, ID.courseB],
      ),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('mail_log acepta enrollment_rejected y deduplica por (alumna, tipo, curso)', async () => {
    const reclamar = () =>
      asService(db, () =>
        attempt(db, `select * from public.claim_or_reclaim_mail_slot($1, 'enrollment_rejected', $2)`, [
          ID.otro,
          ID.courseB,
        ]),
      );
    const primero = await reclamar();
    assert.equal(primero.ok, true, primero.message);
    assert.equal(primero.rows.length, 1);
    const segundo = await reclamar();
    assert.equal(segundo.ok, true, segundo.message);
    assert.equal(segundo.rows.length, 0, 'el segundo reclamo dentro de la ventana no puede ganar');
  });

  test('mail_log sigue rechazando un tipo desconocido', async () => {
    const r = await asService(db, () =>
      attempt(db, `insert into public.mail_log (recipient_user_id, mail_type, scope_key) values ($1, 'spam', 'x')`, [
        ID.otro,
      ]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, CHECK_VIOLATION);
  });
});

describe('T-043 · cada capa sola sostiene el invariante (ADR-008, R-6)', () => {
  test('con status en el grant de INSERT, el guard sigue cortando el auto-alta', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`grant insert (status) on public.enrollments to authenticated;`],
    });
    await seed(db);
    const r = await asPidiente(db, () =>
      attempt(db, `insert into public.enrollments (user_id, course_id, status) values ($1, $2, 'active')`, [
        ID.otro,
        ID.courseB,
      ]),
    );
    assert.equal(r.ok, false, 'con el grant destrabado no quedo ninguna guarda');
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, MENSAJE_T043);
    await db.close();
  });

  test('con las columnas de servidor en el grant, el guard las pisa', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (granted_by, enrolled_at, requested_at, decided_at, decided_reason)
           on public.enrollments to authenticated;`,
      ],
    });
    await seed(db);
    const r = await asPidiente(db, () =>
      attempt(
        db,
        `insert into public.enrollments (user_id, course_id, granted_by, requested_at, decided_at, decided_reason)
         values ($1, $2, $3, '2000-01-01', '2000-01-02', 'auto aprobada')`,
        [ID.otro, ID.courseB, ID.admin],
      ),
    );
    assert.equal(r.ok, true, r.message);
    const fila = await filaDe(db, ID.otro, ID.courseB);
    assert.equal(fila.status, 'requested');
    assert.equal(fila.granted_by, null);
    assert.equal(fila.decided_at, null);
    assert.equal(fila.decided_reason, null);
    assert.ok(new Date(fila.requested_at).getFullYear() > 2000, 'el guard respeto la fecha del cliente');
    await db.close();
  });

  test('con grant de UPDATE y una policy que deja ver la fila, el guard de UPDATE corta requested -> active', async () => {
    // La policy es imprescindible: sin ella RLS filtra la fila, el UPDATE afecta 0 filas SIN
    // error y el test daria verde sin que el guard haya corrido.
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant update (status) on public.enrollments to authenticated;
         create policy t043_update_propia on public.enrollments for update to authenticated
           using (user_id = auth.uid()) with check (true);`,
      ],
    });
    await seed(db);
    await pedir(db, ID.courseB);
    const r = await asPidiente(db, () =>
      attempt(db, `update public.enrollments set status = 'active' where user_id = $1 returning status`, [ID.otro]),
    );
    assert.equal(r.ok, false, 'con grant y policy destrabados el guard no corto');
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, /service_role/);
    await db.close();
  });

  test('control negativo · sin el guard de UPDATE, el mismo ataque pasa', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant update (status) on public.enrollments to authenticated;
         create policy t043_update_propia on public.enrollments for update to authenticated
           using (user_id = auth.uid()) with check (true);
         drop trigger enrollments_guard on public.enrollments;`,
      ],
    });
    await seed(db);
    await pedir(db, ID.courseB);
    const r = await asPidiente(db, () =>
      attempt(db, `update public.enrollments set status = 'active' where user_id = $1 returning status`, [ID.otro]),
    );
    assert.equal(r.ok, true, `el ataque no paso ni sin guard: el test de arriba no prueba nada (${r.message})`);
    assert.equal(r.rows[0].status, 'active');
    await db.close();
  });

  test('control negativo · sin el guard de INSERT y con status en el grant, la alumna se activa', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `grant insert (status) on public.enrollments to authenticated;
         drop trigger enrollments_guard_insert on public.enrollments;`,
      ],
    });
    await seed(db);
    const r = await asPidiente(db, () =>
      attempt(db, `insert into public.enrollments (user_id, course_id, status) values ($1, $2, 'active')`, [
        ID.otro,
        ID.courseB,
      ]),
    );
    assert.equal(r.ok, true, `el ataque no paso ni sin guard (${r.message})`);
    await db.close();
  });
});

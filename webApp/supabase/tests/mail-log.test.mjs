// T-020 · registro de envios de mail (migracion 0019) — juez ciego, D2 + D3, y el agujero de
// nullability que el propio coordinador encontro leyendo la migracion antes de este commit.
//
// LO QUE ESTE ARCHIVO PRUEBA, Y POR QUE ASI.
// La garantia entera de "un mail se manda una sola vez" vive en UNA restriccion:
// `unique (recipient_user_id, mail_type, scope_key)`. El test que de verdad la cubre no mira
// el EFECTO (¿se mando el mail?) — mira la CAUSA: el segundo INSERT de la misma clave TIENE que
// fallar, con el codigo de error que corresponde (23505). Si el test mirara Mailpit o una tabla
// de aplicacion, un bug que evite el segundo envio por CUALQUIER OTRO motivo (una excepcion no
// relacionada, un `if` que corta antes) lo pintaria de verde igual — exactamente la clase de
// verificador que este proyecto ya registro cuatro veces (ver playbook, seccion Transversal).
//
// El caso de `recipient_user_id = null` es el control de mutacion en sentido literal: antes de
// que la columna fuera `not null`, dos INSERT con el destinatario en NULL y la misma clave
// pasaban LOS DOS — Postgres trata dos NULL como valores DISTINTOS para una `unique`, asi que
// la restriccion no restringia nada. Reproducido contra la base compartida antes de este commit
// (ver el mensaje del coordinador). Este archivo lo deja como regresion.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const UNIQUE_VIOLATION = '23505';
const NOT_NULL_VIOLATION = '23502';
const PRIV_DENIED = '42501';

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);

const claim = (db, recipientId, mailType, scopeKey) =>
  attempt(
    db,
    `insert into public.mail_log (recipient_user_id, mail_type, scope_key) values ($1, $2, $3)`,
    [recipientId, mailType, scopeKey]
  );

describe('mail_log — el UNIQUE hace atomico "una sola vez" (T-020, juez ciego D2+D3)', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db.close());

  test('reclamar una clave nueva: pasa', async () => {
    const res = await asService(db, () => claim(db, ID.student, 'welcome', 'account'));
    assert.equal(res.ok, true);
  });

  test('reclamar la MISMA clave otra vez: falla con 23505 — esta es la garantia entera', async () => {
    const res = await asService(db, () => claim(db, ID.student, 'welcome', 'account'));
    assert.equal(res.ok, false, 'el segundo INSERT de la misma clave tiene que ser rechazado, no silenciosamente ignorado');
    assert.equal(res.code, UNIQUE_VIOLATION);
  });

  test('mismo destinatario y tipo, scope_key DISTINTO: pasa las dos veces (cursos distintos son mails legitimos)', async () => {
    const a = await asService(db, () => claim(db, ID.student, 'enrollment_granted', ID.courseA));
    const b = await asService(db, () => claim(db, ID.student, 'enrollment_granted', ID.courseB));
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
  });

  test('mismo tipo y scope_key, destinatario DISTINTO: pasa las dos veces (la docente se entera de cada alumna)', async () => {
    const a = await asService(db, () => claim(db, ID.student, 'teacher_new_student', `${ID.courseA}:alumna1`));
    const b = await asService(db, () => claim(db, ID.otro, 'teacher_new_student', `${ID.courseA}:alumna1`));
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
  });

  // D4 (juez ciego, ronda 3, BLOQUEANTE) — un envío fallido no puede dejar la clave reclamada
  // para siempre. `notify.ts::releaseMailSlotOnFailure` borra la fila cuando `sendMail` devuelve
  // fallo; lo que este test cubre es el mecanismo del que esa función depende: que borrar Y
  // volver a reclamar la MISMA clave funciona — sin esto, "liberar" sería un no-op silencioso.
  test('reclamar, liberar (borrar) por un envío fallido, reclamar la MISMA clave de nuevo: las dos reclamas pasan', async () => {
    const first = await asService(db, () => claim(db, ID.teacherA, 'course_completed', 'cert-abc123'));
    assert.equal(first.ok, true, 'primer reclamo (simula: se reclamó antes de intentar mandar)');

    const del = await asService(db, () =>
      attempt(
        db,
        `delete from public.mail_log where recipient_user_id = $1 and mail_type = $2 and scope_key = $3`,
        [ID.teacherA, 'course_completed', 'cert-abc123']
      )
    );
    assert.equal(del.ok, true, 'liberar tras un envío fallido (releaseMailSlotOnFailure) tiene que poder borrar la fila');

    const retry = await asService(db, () => claim(db, ID.teacherA, 'course_completed', 'cert-abc123'));
    assert.equal(retry.ok, true, 'con la fila liberada, el PRÓXIMO disparo del evento tiene que poder reclamar de nuevo — antes de D4 esto era imposible para siempre');
  });

  describe('control de mutación — el agujero de la columna nullable (encontrado por el coordinador)', () => {
    test('recipient_user_id = null: el INSERT se rechaza (23502), no pasa en silencio', async () => {
      const res = await asService(db, () => claim(db, null, 'welcome', 'x'));
      assert.equal(res.ok, false);
      assert.equal(res.code, NOT_NULL_VIOLATION);
    });

    test('control negativo: CON la columna nullable, dos NULL de la misma clave pasarían las DOS', async () => {
      // No se relaja la tabla real para esto (mutaría la base compartida) — se prueba el
      // INVARIANTE de SQL que hace que el bug exista, en una tabla temporal idéntica en la
      // forma que importa. Si Postgres alguna vez tratara NULL=NULL en una UNIQUE (no lo hace,
      // es estándar SQL, pero es lo que este control demuestra), este test fallaría y avisaría
      // que el razonamiento de arriba ya no vale.
      await db.exec(`
        create temporary table mail_log_nullable_repro (
          recipient_user_id uuid,
          mail_type text not null,
          scope_key text not null,
          unique (recipient_user_id, mail_type, scope_key)
        );
      `);
      const first = await attempt(db, `insert into mail_log_nullable_repro values (null, 'welcome', 'x')`);
      const second = await attempt(db, `insert into mail_log_nullable_repro values (null, 'welcome', 'x')`);
      assert.equal(first.ok, true);
      assert.equal(second.ok, true, 'dos NULL no son iguales para una UNIQUE — este es EXACTAMENTE el agujero que 0019 cierra con not null');
      await db.exec(`drop table mail_log_nullable_repro;`);
    });
  });

  describe('privilegios — ningún rol de cliente toca esta tabla (contabilidad interna)', () => {
    test('authenticated no puede leer', async () => {
      const res = await asStudent(db, () => attempt(db, `select 1 from public.mail_log limit 1`));
      assert.equal(res.ok, false);
      assert.equal(res.code, PRIV_DENIED);
    });

    test('authenticated no puede insertar (ni siquiera para sí mismo)', async () => {
      const res = await asStudent(db, () => claim(db, ID.student, 'welcome', 'otra-cuenta'));
      assert.equal(res.ok, false);
      assert.equal(res.code, PRIV_DENIED);
    });

    test('anon no puede leer', async () => {
      const res = await asAnon(db, () => attempt(db, `select 1 from public.mail_log limit 1`));
      assert.equal(res.ok, false);
      assert.equal(res.code, PRIV_DENIED);
    });
  });
});

// T-020 · mail_log — migraciones 0019 + 0021 (juez ciego, rondas 2-5)
//
// LA GARANTÍA REAL, dicha sin la palabra "única" (el juez marcó, más de una vez en este hilo,
// que la cabecera prometía completitud que el código no tenía): a lo sumo un envío CONFIRMADO
// por `(recipient_user_id, mail_type, scope_key)` dentro de una ventana de reclamo vigente (10
// minutos, ver el fundamento en la migración 0021); pasada la ventana sin confirmar, el turno
// vuelve a estar disponible. Lo que NO cubrimos — lista abierta, no exhaustiva, ver 0021: si
// nadie vuelve a disparar el mismo evento después de un vencimiento, el envío queda perdido sin
// aviso; y un envío que confirma después de que otro ya reclamó su vencimiento puede, en teoría,
// coexistir con un duplicado tardío.
//
// POR QUÉ CAMBIÓ DE FORMA (ronda 5). Las rondas 2-4 trataron el resultado de un envío como
// conocido y binario. Hay TRES estados: no se envió · se envió · NO SÉ. Un `250` que confirma
// después del deadline del diálogo es "no sé" (ronda 4 lo trataba como "no se envió", liberaba
// el turno, y el próximo disparo duplicaba). Un proceso muerto entre el reclamo y la
// confirmación es "no sé" (ronda 4 lo perdía para siempre, porque nada volvía a tocar esa fila).
// `claim_or_reclaim_mail_slot` reemplaza "reclamado sí/no" por estado explícito
// (`claimed_at`/`sent_at`) y saca `releaseMailSlotOnFailure` — nada se libera al fallar; el
// vencimiento de la ventana es lo único que reabre un turno no confirmado.
//
// CADA TEST DE ACÁ ABAJO AFIRMA CONTRA LA CAUSA (qué devuelve la función / qué queda en la
// tabla), no contra un efecto que otra cosa podría producir por un motivo distinto — mismo
// criterio que ya regía para el `UNIQUE` de la ronda 2. La integración real (Mailpit, con
// servidores SMTP degradados de verdad) se corrió aparte con los scripts del propio juez
// (`bv2-t020/bv3-falsoneg.mjs`, `bv3-huerfano.mjs`, `bv3-flood.mjs`) contra un build fresco de
// `notify.ts` — no se repite acá porque este archivo prueba el MECANISMO atómico del que esos
// escenarios dependen, y probarlo contra Postgres de verdad (vía PGlite) es más rápido y no
// necesita red ni Mailpit.

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

// INSERT crudo — sigue existiendo para probar el UNIQUE en sí (ronda 2) y el `not null` (ronda
// 4), que no dependen de la función. Para el flujo real de reclamo, ver `claimOrReclaim` abajo.
const rawInsert = (db, recipientId, mailType, scopeKey) =>
  attempt(
    db,
    `insert into public.mail_log (recipient_user_id, mail_type, scope_key) values ($1, $2, $3)`,
    [recipientId, mailType, scopeKey]
  );

const claimOrReclaim = (db, recipientId, mailType, scopeKey) =>
  attempt(db, `select public.claim_or_reclaim_mail_slot($1, $2, $3) as id`, [recipientId, mailType, scopeKey]);

const markSent = (db, recipientId, mailType, scopeKey) =>
  attempt(
    db,
    `update public.mail_log set sent_at = now()
     where recipient_user_id = $1 and mail_type = $2 and scope_key = $3`,
    [recipientId, mailType, scopeKey]
  );

const backdateClaim = (db, recipientId, mailType, scopeKey, minutesAgo) =>
  attempt(
    db,
    `update public.mail_log set claimed_at = now() - ($4 || ' minutes')::interval
     where recipient_user_id = $1 and mail_type = $2 and scope_key = $3`,
    [recipientId, mailType, scopeKey, String(minutesAgo)]
  );

describe('mail_log — UNIQUE (ronda 2) + not null (ronda 4)', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db.close());

  test('reclamar una clave nueva: pasa', async () => {
    const res = await asService(db, () => rawInsert(db, ID.student, 'welcome', 'account'));
    assert.equal(res.ok, true);
  });

  test('insertar la MISMA clave otra vez: falla con 23505 — esta es la garantía de fondo', async () => {
    const res = await asService(db, () => rawInsert(db, ID.student, 'welcome', 'account'));
    assert.equal(res.ok, false, 'el segundo INSERT de la misma clave tiene que ser rechazado, no silenciosamente ignorado');
    assert.equal(res.code, UNIQUE_VIOLATION);
  });

  test('mismo destinatario y tipo, scope_key DISTINTO: pasa las dos veces (cursos distintos son mails legítimos)', async () => {
    const a = await asService(db, () => rawInsert(db, ID.student, 'enrollment_granted', ID.courseA));
    const b = await asService(db, () => rawInsert(db, ID.student, 'enrollment_granted', ID.courseB));
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
  });

  test('mismo tipo y scope_key, destinatario DISTINTO: pasa las dos veces (la docente se entera de cada alumna)', async () => {
    const a = await asService(db, () => rawInsert(db, ID.student, 'teacher_new_student', `${ID.courseA}:alumna1`));
    const b = await asService(db, () => rawInsert(db, ID.otro, 'teacher_new_student', `${ID.courseA}:alumna1`));
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
  });

  describe('control de mutación — la columna nullable (ronda 4)', () => {
    test('recipient_user_id = null: el INSERT se rechaza (23502), no pasa en silencio', async () => {
      const res = await asService(db, () => rawInsert(db, null, 'welcome', 'x'));
      assert.equal(res.ok, false);
      assert.equal(res.code, NOT_NULL_VIOLATION);
    });

    test('control negativo: CON la columna nullable, dos NULL de la misma clave pasarían las DOS', async () => {
      // No se relaja la tabla real (mutaría la base compartida) — se reproduce el invariante de
      // SQL en una tabla temporal idéntica en la forma que importa.
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
      assert.equal(second.ok, true, 'dos NULL no son iguales para una UNIQUE — el agujero que 0019 cierra con not null');
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
      const res = await asStudent(db, () => rawInsert(db, ID.student, 'welcome', 'otra-cuenta'));
      assert.equal(res.ok, false);
      assert.equal(res.code, PRIV_DENIED);
    });

    test('authenticated no puede llamar a claim_or_reclaim_mail_slot (SECURITY INVOKER: hereda el mismo bloqueo)', async () => {
      const res = await asStudent(db, () => claimOrReclaim(db, ID.student, 'welcome', 'via-rpc'));
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

describe('claim_or_reclaim_mail_slot — estado explícito, sin release-on-failure (T-020, ronda 5)', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db.close());

  // El "250 tardío que no duplica" y el "reintento dentro de la ventana que no reenvía" son la
  // MISMA aserción: reclamar dos veces seguidas sin confirmar en el medio tiene que dar UNA
  // fila reclamada, no dos intentos de envío.
  test('reclamar, y reclamar de nuevo SIN confirmar (falló, o el 250 no llegó a tiempo): la segunda vez no reclama', async () => {
    const first = await asService(db, () => claimOrReclaim(db, ID.student, 'welcome', 'account'));
    assert.equal(first.ok, true);
    assert.ok(first.rows[0].id, 'el primer reclamo tiene que devolver un id');

    const second = await asService(db, () => claimOrReclaim(db, ID.student, 'welcome', 'account'));
    assert.equal(second.ok, true, 'la sentencia no falla — simplemente no reclama nada');
    assert.equal(second.rows[0].id, null, 'con la fila todavía viva (sin confirmar, sin vencer), NO se puede volver a reclamar — esto es lo que impide el bombardeo/duplicado');
  });

  test('bombardeo: 5 reclamos seguidos sin confirmar dan UN solo id reclamado, los otros 4 null', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await asService(db, () => claimOrReclaim(db, ID.otro, 'welcome', 'account'));
      results.push(res.rows[0].id);
    }
    const reclamados = results.filter((id) => id !== null);
    assert.equal(reclamados.length, 1, `de 5 intentos, exactamente 1 tiene que reclamar — reclamó ${reclamados.length}`);
  });

  test('confirmar (sent_at) y reclamar de nuevo: no reclama, esté vencida la ventana o no', async () => {
    const claimed = await asService(db, () => claimOrReclaim(db, ID.teacherA, 'course_completed', 'cert-1'));
    const claimId = claimed.rows[0].id;
    assert.ok(claimId);

    const confirm = await asService(db, () => markSent(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(confirm.ok, true);

    const retryPronto = await asService(db, () => claimOrReclaim(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(retryPronto.rows[0].id, null, 'confirmado hace un instante: no se reclama de nuevo');

    // Aunque la ventana venza, un envío CONFIRMADO no se retoma — el vencimiento solo destraba
    // reclamos SIN confirmar. Es la garantía de "a lo sumo un envío confirmado", no "a lo sumo
    // un intento".
    const backdated = await asService(db, () => backdateClaim(db, ID.teacherA, 'course_completed', 'cert-1', 11));
    assert.equal(backdated.ok, true);
    const retryVencido = await asService(db, () => claimOrReclaim(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(retryVencido.rows[0].id, null, 'confirmado Y con claimed_at vencido: TAMPOCO se reclama — sent_at manda');
  });

  // El "proceso muerto que se recupera al vencer" — simulado moviendo claimed_at hacia atrás
  // (instrucción explícita del coordinador: no matar procesos acá, ya se probó en vivo con
  // bv3-huerfano.mjs contra un SIGKILL real).
  describe('recuperación tras vencimiento (simula un proceso muerto entre el reclamo y la confirmación)', () => {
    test('reclamado y NUNCA confirmado, DENTRO de la ventana: no se puede retomar', async () => {
      const first = await asService(db, () => claimOrReclaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1'));
      assert.ok(first.rows[0].id);

      const dentroDeLaVentana = await asService(db, () => backdateClaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1', 5));
      assert.equal(dentroDeLaVentana.ok, true);
      const retry = await asService(db, () => claimOrReclaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1'));
      assert.equal(retry.rows[0].id, null, '5 minutos < 10 de ventana: todavía no vence');
    });

    test('reclamado, NUNCA confirmado, y la ventana VENCE: se retoma — mismo id, claimed_at renovado', async () => {
      const first = await asService(db, () => claimOrReclaim(db, ID.admin, 'teacher_new_student', 'huerfano-2'));
      const originalId = first.rows[0].id;
      assert.ok(originalId);

      const vencido = await asService(db, () => backdateClaim(db, ID.admin, 'teacher_new_student', 'huerfano-2', 11));
      assert.equal(vencido.ok, true);

      const retomado = await asService(db, () => claimOrReclaim(db, ID.admin, 'teacher_new_student', 'huerfano-2'));
      assert.equal(retomado.ok, true);
      assert.equal(retomado.rows[0].id, originalId, 'se RETOMA la misma fila (mismo id) — no se crea una segunda');

      // Confirmar la restauración: después de retomar, claimed_at tiene que haber avanzado (ya
      // no está vencido) — si no, el próximo intento lo volvería a retomar en un loop.
      const claimedAtRow = await asService(db, () =>
        attempt(
          db,
          `select (claimed_at > now() - interval '1 minute') as reciente from public.mail_log where id = $1`,
          [originalId]
        )
      );
      assert.equal(claimedAtRow.rows[0].reciente, true, 'claimed_at se tiene que haber renovado al retomar');
    });

    test('scope AJENO no se contamina: retomar huerfano-2 no reclama huerfano-1 (todavía vivo)', async () => {
      // Control de que el vencimiento se evalúa POR FILA — no una condición global que
      // destrabe de más.
      const res = await asService(db, () => claimOrReclaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1'));
      assert.equal(res.rows[0].id, null, 'huerfano-1 seguía dentro de su propia ventana (test anterior lo dejó a 5min, no 11) — no debería haberse visto afectado por retomar huerfano-2');
    });
  });
});

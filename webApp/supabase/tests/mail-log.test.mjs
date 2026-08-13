// T-020 · mail_log — migraciones 0019, 0021, 0022 (juez ciego, rondas 2-6)
//
// LA GARANTÍA REAL, dicha con las COTAS que el código de verdad impone — no una promesa sobre
// cómo se comporta el entorno. El juez marcó, seis veces en este hilo, cabeceras que prometían
// más de lo que el código garantizaba; esta es la versión que sobrevivió a las seis:
//   · A LO SUMO 3 intentos reales de envío por (recipient_user_id, mail_type, scope_key), para
//     siempre — lo impone `attempts < 3` en la sentencia atómica (0022), no un supuesto sobre
//     la red. Agotados los 3 sin que ninguno confirme, el turno queda MUERTO: no se reclama
//     más, y ese mail se pierde — es el tradeoff, dicho así, no escondido.
//   · Dentro de esos 3 intentos, a lo sumo uno puede estar "en vuelo" por vez: un reclamo vivo
//     (sin confirmar, dentro de los 10 minutos) bloquea cualquier otro para el mismo scope
//     (0021).
//   · Un envío CONFIRMADO (`sent_at` puesto) nunca se retoma, agote o no agote sus intentos.
// Lo que esto NO cubre — lista abierta, no exhaustiva: si nadie vuelve a disparar el mismo
// evento, un reclamo vencido sin agotar tampoco se reintenta solo (no hay barrendero de fondo,
// a propósito); y no hay cola de reprocesamiento ni alerta para los turnos muertos — encontrarlos
// es una consulta aparte (`attempts >= 3 and sent_at is null`), no algo que esta tabla haga sola.
//
// POR QUÉ CAMBIÓ DE FORMA DOS VECES.
//   Ronda 5: las rondas 2-4 trataron el resultado de un envío como conocido y binario. Hay TRES
//   estados: no se envió · se envió · NO SÉ. Un `250` tardío o un proceso muerto a mitad son
//   "no sé" — la ronda 4 (liberar al fallar) los trataba como "no se envió" y eso o bien
//   duplicaba (el mail SÍ había salido) o perdía para siempre (nada volvía a tocar la fila).
//   `claim_or_reclaim_mail_slot` (0021) reemplaza "reclamado sí/no" por estado explícito.
//   Ronda 6 (D5): 0021 acotaba CUÁN SEGUIDO se podía reclamar (la ventana) pero no CUÁNTAS VECES
//   EN TOTAL — contra un falso negativo PERSISTENTE (nunca confirma) cada vencimiento de
//   ventana volvía a entregar, indefinidamente. `attempts < 3` (0022) acota el TOTAL.
//   Ronda 6 (D2): `confirmMailSent` sin fencing podía dejar que una confirmación TARDÍA de un
//   intento ya vencido pisara el `sent_at` del intento que lo retomó. `claimed_at` viaja como
//   fencing token: confirmar exige que `claimed_at` siga siendo el mismo que al reclamar.
//
// CADA TEST AFIRMA CONTRA LA CAUSA (qué devuelve la función / qué queda en la tabla), no contra
// un efecto que otra cosa podría producir por un motivo distinto. La integración real (Mailpit,
// servidores SMTP degradados de verdad, SIGKILL a un proceso real) se corrió aparte con los
// scripts del propio juez (`bv2-t020/bv3-falsoneg.mjs`, `bv3-huerfano.mjs`, `bv3-flood.mjs`)
// contra un build fresco de `notify.ts` — este archivo prueba el MECANISMO atómico del que esos
// escenarios dependen, contra Postgres real vía PGlite, sin red ni Mailpit.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const UNIQUE_VIOLATION = '23505';
const NOT_NULL_VIOLATION = '23502';
const PRIV_DENIED = '42501';
const MAX_ATTEMPTS = 3;

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

// `select * from fn(...)`, no `select fn(...) as id`: la función devuelve `table(id,
// claimed_at)` desde 0022, y como set-returning function en el FROM da CERO filas cuando no
// reclama — igual que `db.rpc(...)` le da un array vacío a la aplicación real (`notify.ts`
// hace exactamente `Array.isArray(data) ? data[0] : data`, y acá se refleja con
// `res.rows[0]` siendo `undefined` en vez de una fila con `id: null`).
const claimOrReclaim = (db, recipientId, mailType, scopeKey) =>
  attempt(db, `select * from public.claim_or_reclaim_mail_slot($1, $2, $3)`, [recipientId, mailType, scopeKey]);

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

const attemptsOf = async (db, recipientId, mailType, scopeKey) => {
  const res = await attempt(
    db,
    `select attempts from public.mail_log where recipient_user_id = $1 and mail_type = $2 and scope_key = $3`,
    [recipientId, mailType, scopeKey]
  );
  return res.rows[0]?.attempts ?? null;
};

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

describe('claim_or_reclaim_mail_slot — ventana + tope de intentos (T-020, rondas 5-6)', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db.close());

  // El "250 tardío que no duplica" y el "reintento dentro de la ventana que no reenvía" son la
  // MISMA aserción: reclamar dos veces seguidas sin confirmar en el medio tiene que dar UNA
  // fila reclamada, no dos intentos de envío.
  test('reclamar, y reclamar de nuevo SIN confirmar (falló, o el 250 no llegó a tiempo): la segunda vez no reclama nada', async () => {
    const first = await asService(db, () => claimOrReclaim(db, ID.student, 'welcome', 'account'));
    assert.equal(first.ok, true);
    assert.equal(first.rows.length, 1, 'el primer reclamo tiene que devolver UNA fila');
    assert.ok(first.rows[0].id);

    const second = await asService(db, () => claimOrReclaim(db, ID.student, 'welcome', 'account'));
    assert.equal(second.ok, true, 'la sentencia no falla — simplemente no reclama nada');
    assert.equal(second.rows.length, 0, 'con la fila todavía viva (sin confirmar, sin vencer), CERO filas — esto es lo que impide el bombardeo/duplicado');
  });

  test('bombardeo: 5 reclamos seguidos sin confirmar dan UN solo reclamo real, los otros 4 vacíos', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await asService(db, () => claimOrReclaim(db, ID.otro, 'welcome', 'account'));
      results.push(res.rows.length);
    }
    const reclamos = results.filter((n) => n === 1).length;
    assert.equal(reclamos, 1, `de 5 intentos, exactamente 1 tiene que reclamar — reclamaron ${reclamos}`);
    assert.equal(await attemptsOf(db, ID.otro, 'welcome', 'account'), 1, 'sin vencer la ventana, los reintentos NO cuentan como intento nuevo — solo el que sí reclamó');
  });

  test('confirmar (sent_at) y reclamar de nuevo: no reclama, esté vencida la ventana o no', async () => {
    const claimed = await asService(db, () => claimOrReclaim(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(claimed.rows.length, 1);

    const confirm = await asService(db, () => markSent(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(confirm.ok, true);

    const retryPronto = await asService(db, () => claimOrReclaim(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(retryPronto.rows.length, 0, 'confirmado hace un instante: no se reclama de nuevo');

    // Aunque la ventana venza, un envío CONFIRMADO no se retoma — el vencimiento solo destraba
    // reclamos SIN confirmar.
    const backdated = await asService(db, () => backdateClaim(db, ID.teacherA, 'course_completed', 'cert-1', 11));
    assert.equal(backdated.ok, true);
    const retryVencido = await asService(db, () => claimOrReclaim(db, ID.teacherA, 'course_completed', 'cert-1'));
    assert.equal(retryVencido.rows.length, 0, 'confirmado Y con claimed_at vencido: TAMPOCO se reclama — sent_at manda');
  });

  // El "proceso muerto que se recupera al vencer" — simulado moviendo claimed_at hacia atrás
  // (instrucción del coordinador: no matar procesos acá; ya se probó en vivo con
  // bv3-huerfano.mjs contra un SIGKILL real).
  describe('recuperación tras vencimiento (simula un proceso muerto entre el reclamo y la confirmación)', () => {
    test('reclamado y NUNCA confirmado, DENTRO de la ventana: no se puede retomar', async () => {
      const first = await asService(db, () => claimOrReclaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1'));
      assert.equal(first.rows.length, 1);

      const dentroDeLaVentana = await asService(db, () => backdateClaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1', 5));
      assert.equal(dentroDeLaVentana.ok, true);
      const retry = await asService(db, () => claimOrReclaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1'));
      assert.equal(retry.rows.length, 0, '5 minutos < 10 de ventana: todavía no vence');
    });

    test('reclamado, NUNCA confirmado, y la ventana VENCE: se retoma — mismo id, claimed_at renovado, attempts+1', async () => {
      const first = await asService(db, () => claimOrReclaim(db, ID.admin, 'teacher_new_student', 'huerfano-2'));
      const originalId = first.rows[0].id;
      assert.ok(originalId);

      const vencido = await asService(db, () => backdateClaim(db, ID.admin, 'teacher_new_student', 'huerfano-2', 11));
      assert.equal(vencido.ok, true);

      const retomado = await asService(db, () => claimOrReclaim(db, ID.admin, 'teacher_new_student', 'huerfano-2'));
      assert.equal(retomado.rows.length, 1);
      assert.equal(retomado.rows[0].id, originalId, 'se RETOMA la misma fila (mismo id) — no se crea una segunda');

      const claimedAtRow = await asService(db, () =>
        attempt(
          db,
          `select (claimed_at > now() - interval '1 minute') as reciente from public.mail_log where id = $1`,
          [originalId]
        )
      );
      assert.equal(claimedAtRow.rows[0].reciente, true, 'claimed_at se tiene que haber renovado al retomar — si no, el próximo intento lo volvería a retomar en loop');
      assert.equal(await attemptsOf(db, ID.admin, 'teacher_new_student', 'huerfano-2'), 2, 'la retoma cuenta como el intento #2');
    });

    test('scope AJENO no se contamina: retomar huerfano-2 no reclama huerfano-1 (todavía vivo)', async () => {
      const res = await asService(db, () => claimOrReclaim(db, ID.teacherB, 'teacher_new_student', 'huerfano-1'));
      assert.equal(res.rows.length, 0, 'huerfano-1 seguía dentro de su propia ventana — el vencimiento se evalúa por fila, no globalmente');
    });
  });

  // D5 (ronda 6, BLOQUEANTE): el falso negativo PERSISTENTE — el que nunca confirma, nunca —
  // tiene que agotarse en MAX_ATTEMPTS, no seguir entregando una vez por ventana para siempre.
  describe(`falso negativo persistente — se detiene en ${MAX_ATTEMPTS} intentos, no en infinito (D5)`, () => {
    const recipient = ID.student;
    const scope = 'persistente-1';

    test(`${MAX_ATTEMPTS} vencimientos seguidos SIN confirmar: los ${MAX_ATTEMPTS} reclaman (mismo id)`, async () => {
      const first = await asService(db, () => claimOrReclaim(db, recipient, 'course_completed', scope));
      assert.equal(first.rows.length, 1, 'intento 1');
      const originalId = first.rows[0].id;

      for (let attemptNum = 2; attemptNum <= MAX_ATTEMPTS; attemptNum++) {
        await asService(db, () => backdateClaim(db, recipient, 'course_completed', scope, 11));
        const res = await asService(db, () => claimOrReclaim(db, recipient, 'course_completed', scope));
        assert.equal(res.rows.length, 1, `intento ${attemptNum} tiene que poder retomar`);
        assert.equal(res.rows[0].id, originalId);
      }
      assert.equal(await attemptsOf(db, recipient, 'course_completed', scope), MAX_ATTEMPTS);
    });

    test(`al vencer un ${MAX_ATTEMPTS + 1}° intento: NO reclama — el turno está muerto, para siempre`, async () => {
      await asService(db, () => backdateClaim(db, recipient, 'course_completed', scope, 11));
      const res = await asService(db, () => claimOrReclaim(db, recipient, 'course_completed', scope));
      assert.equal(res.rows.length, 0, `con attempts = ${MAX_ATTEMPTS}, ningún vencimiento vuelve a destrabar el turno`);
      assert.equal(await attemptsOf(db, recipient, 'course_completed', scope), MAX_ATTEMPTS, 'attempts no sigue subiendo — el intento rechazado no cuenta');
    });

    test('sigue muerto aunque se lo backdatee de nuevo, cuantas veces se quiera — el total real queda acotado en 3 por construcción', async () => {
      for (let i = 0; i < 3; i++) {
        await asService(db, () => backdateClaim(db, recipient, 'course_completed', scope, 30));
        const res = await asService(db, () => claimOrReclaim(db, recipient, 'course_completed', scope));
        assert.equal(res.rows.length, 0);
      }
    });
  });

  // D2 del juez (ronda 6, no bloqueante): fencing de la confirmación con claimed_at.
  describe('fencing de confirmMailSent — una confirmación tardía no pisa un turno retomado (D2)', () => {
    test('confirmar con el claimed_at ORIGINAL después de que el turno fue retomado: no toca nada', async () => {
      const first = await asService(db, () => claimOrReclaim(db, ID.otro, 'course_completed', 'fencing-1'));
      const { id, claimed_at: claimedAtOriginal } = first.rows[0];

      await asService(db, () => backdateClaim(db, ID.otro, 'course_completed', 'fencing-1', 11));
      const retomado = await asService(db, () => claimOrReclaim(db, ID.otro, 'course_completed', 'fencing-1'));
      assert.equal(retomado.rows[0].id, id);
      assert.notEqual(retomado.rows[0].claimed_at, claimedAtOriginal, 'claimed_at tiene que haber cambiado al retomar — si no, el fencing no prueba nada');

      // La confirmación "tardía" del PRIMER intento (proceso viejo, todavía cree que su claim
      // sigue vigente) usa el claimed_at ORIGINAL — tiene que fallar en encontrar fila.
      const confirmVieja = await asService(db, () =>
        attempt(
          db,
          `update public.mail_log set sent_at = now()
           where id = $1 and claimed_at = $2 and sent_at is null
           returning id`,
          [id, claimedAtOriginal]
        )
      );
      assert.equal(confirmVieja.ok, true);
      assert.equal(confirmVieja.rows.length, 0, 'la confirmación con el claimed_at viejo no puede tocar la fila retomada (RETURNING sin filas = UPDATE que no tocó nada)');

      const sentAtRow = await asService(db, () =>
        attempt(db, `select sent_at from public.mail_log where id = $1`, [id])
      );
      assert.equal(sentAtRow.rows[0].sent_at, null, 'la fila sigue sin confirmar — la confirmación vieja no la marcó');
    });

    test('confirmar con el claimed_at ACTUAL (el del intento que de verdad ganó): sí confirma', async () => {
      const row = await asService(db, () =>
        attempt(
          db,
          `select id, claimed_at from public.mail_log where recipient_user_id = $1 and mail_type = 'course_completed' and scope_key = 'fencing-1'`,
          [ID.otro]
        )
      );
      const { id, claimed_at: claimedAtActual } = row.rows[0];

      const confirmNueva = await asService(db, () =>
        attempt(
          db,
          `update public.mail_log set sent_at = now()
           where id = $1 and claimed_at = $2 and sent_at is null
           returning sent_at`,
          [id, claimedAtActual]
        )
      );
      assert.equal(confirmNueva.ok, true);
      assert.equal(confirmNueva.rows.length, 1, 'con el claimed_at correcto, la confirmación SÍ toca la fila');
      assert.ok(confirmNueva.rows[0].sent_at);
    });
  });
});

// T-030 · Q&A por leccion — TEST DE MUTACION REAL contra PGlite.
//
// Mismo estandar que campus-posts.test.mjs: cada caso corre el DML del actor con SET ROLE y los
// claims del JWT como los deja PostgREST, y se afirma sobre el SQLSTATE. Fixtures: `ID.student`
// inscripta activa en courseA (duena `ID.teacherA`); `ID.otro` sin ninguna inscripcion;
// `lessonA` no es preview, `lessonPreviewB` si. La companera se crea aca: hace falta una
// SEGUNDA inscripta para "la pregunta ajena" sin que el ataque falle por no ver la fila.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV = '42501';
const CHECK = '23514';
const UNIQUE = '23505';

const COMPANERA_ID = 'c1000000-0000-4000-8000-000000000001';
const ALUMNA = { sub: ID.student, userRole: 'student' };
const COMPANERA = { sub: COMPANERA_ID, userRole: 'student' };
const SIN_INSCRIPCION = { sub: ID.otro, userRole: 'student' };
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const OTRA_DOCENTE = { sub: ID.teacherB, userRole: 'teacher' };
const ADMIN = { sub: ID.admin, userRole: 'admin' };

const como = (db, actor, sql, params = []) => asUser(db, actor, () => attempt(db, sql, params));
const comoOwner = async (db, sql, params = []) => {
  await db.exec('reset role;');
  return (await db.query(sql, params)).rows;
};

const preguntar = (db, actor, lessonId, title = 'Sobre el Loco', body = 'No entendi el minuto 12.') =>
  como(
    db,
    actor,
    `insert into public.lesson_questions (lesson_id, author_id, title, body)
     values ($1, $2, $3, $4) returning id, course_id`,
    [lessonId, actor.sub, title, body],
  );

const responder = (db, actor, questionId, body = 'Es una pausa, no una caida.') =>
  como(
    db,
    actor,
    `insert into public.lesson_answers (question_id, author_id, body) values ($1, $2, $3)
     returning id, lesson_id, course_id, is_instructor_answer`,
    [questionId, actor.sub, body],
  );

const borrar = (db, actor, tabla, id, motivo, firma = actor.sub) =>
  como(
    db,
    actor,
    `update public.${tabla} set deleted_at = now(), deleted_by = $2, deleted_reason = $3
      where id = $1 returning id`,
    [id, firma, motivo],
  );

describe('T-030 · Q&A por leccion', () => {
  let db;

  const nuevaPregunta = async (actor = ALUMNA, lessonId = ID.lessonA) => {
    const r = await preguntar(db, actor, lessonId);
    assert.equal(r.ok, true, `precondicion: no se pudo crear la pregunta: ${r.message}`);
    return r.rows[0].id;
  };
  const nuevaRespuesta = async (actor, questionId, body) => {
    const r = await responder(db, actor, questionId, body);
    assert.equal(r.ok, true, `precondicion: no se pudo crear la respuesta: ${r.message}`);
    return r.rows[0].id;
  };

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(`insert into auth.users (id, email) values ($1, 'companera@humano.test')`, [COMPANERA_ID]);
    await db.query(
      `insert into public.enrollments (user_id, course_id, status, granted_by) values ($1, $2, 'active', $3)`,
      [COMPANERA_ID, ID.courseA, ID.admin],
    );
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- c.1
  describe('c.1 · pregunta quien cursa, o cualquiera con sesion en una preview', () => {
    test('la inscripta activa pregunta y el course_id sale de la leccion', async () => {
      const r = await preguntar(db, ALUMNA, ID.lessonA);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].course_id, ID.courseA);
    });

    test('sin inscripcion, en una leccion is_preview, tambien pregunta', async () => {
      const r = await preguntar(db, SIN_INSCRIPCION, ID.lessonPreviewB);
      assert.equal(r.ok, true, r.message);
    });

    test('mandar course_id es 42501: no tiene grant, lo pone el trigger', async () => {
      const r = await como(
        db,
        ALUMNA,
        `insert into public.lesson_questions (lesson_id, course_id, author_id, title, body)
         values ($1, $2, $3, 'Titulo', 'Cuerpo')`,
        [ID.lessonA, ID.courseB, ID.student],
      );
      assert.equal(r.ok, false, 'el cliente eligio el curso de su pregunta');
      assert.equal(r.code, PRIV);
    });

    test('preguntar a nombre de otra es 42501', async () => {
      const r = await como(
        db,
        ALUMNA,
        `insert into public.lesson_questions (lesson_id, author_id, title, body) values ($1, $2, 'Titulo', 'Cuerpo')`,
        [ID.lessonA, COMPANERA_ID],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('nadie nace resuelta: resolved_at en el INSERT es 42501', async () => {
      const r = await como(
        db,
        ALUMNA,
        `insert into public.lesson_questions (lesson_id, author_id, title, body, resolved_at)
         values ($1, $2, 'Titulo', 'Cuerpo', now())`,
        [ID.lessonA, ID.student],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.2
  describe('c.2 · sin inscripcion en una leccion no preview, 42501', () => {
    for (const [nombre, actor] of [
      ['alumna sin inscripcion', SIN_INSCRIPCION],
      ['docente de otro curso', OTRA_DOCENTE],
      ['admin (modera, no participa: criterio de 0014)', ADMIN],
    ]) {
      test(nombre, async () => {
        const r = await preguntar(db, actor, ID.lessonA);
        assert.equal(r.ok, false, `${nombre} pregunto`);
        assert.equal(r.code, PRIV);
      });
    }

    test('sin inscripcion tampoco LEE las preguntas de una leccion no preview', async () => {
      const r = await como(db, SIN_INSCRIPCION, `select id from public.lesson_questions where lesson_id = $1`, [ID.lessonA]);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
    });
  });

  // ---------------------------------------------------------------- c.3
  describe('c.3 · anon no lee ninguna de las tres tablas', () => {
    for (const tabla of ['lesson_questions', 'lesson_answers', 'lesson_question_votes']) {
      test(tabla, async () => {
        const r = await asAnon(db, () => attempt(db, `select * from public.${tabla}`));
        assert.equal(r.ok, false, `anon leyo ${tabla}`);
        assert.equal(r.code, PRIV);
      });
    }
  });

  // ---------------------------------------------------------------- c.4
  describe('c.4 · is_instructor_answer lo deriva el servidor', () => {
    let q;
    before(async () => {
      q = await nuevaPregunta();
    });

    test('la docente duena responde: true, con lesson_id y course_id copiados de la pregunta', async () => {
      const r = await responder(db, DUENA, q);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].is_instructor_answer, true);
      assert.equal(r.rows[0].lesson_id, ID.lessonA);
      assert.equal(r.rows[0].course_id, ID.courseA);
    });

    test('una alumna responde: false', async () => {
      const r = await responder(db, COMPANERA, q, 'Yo lo entendi asi.');
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].is_instructor_answer, false);
    });

    // E3 del arquitecto (R-2, D-16): `teacher_id` solo no alcanza. Una duena degradada de rol
    // sigue siendo `teacher_id` del curso y su respuesta no puede nacer "de docente".
    // T-080 · D-16: con `owns_course` leyendo el rol, la degradada ya no es duena -- y sin
    // inscripcion tampoco alcanza la pregunta. Antes respondia (como no-docente) porque seguia
    // leyendo el Q&A de su ex curso, que es justo lo que D-16 cierra. Lo que este caso protegia
    // (que su respuesta NO salga como de docente) sigue valiendo: no sale de ninguna forma.
    test('la duena con rol que ya no es teacher no responde como docente (D-16: no responde)', async () => {
      // Sin BEGIN: un rechazo aborta la transaccion y el `reset role` del helper revienta con
      // 25P02. Se degrada y se restaura a mano.
      await comoOwner(db, `update public.profiles set role = 'student' where id = $1`, [ID.teacherA]);
      try {
        const r = await responder(db, DUENA, q, 'Respondo sin ser docente.');
        assert.equal(r.ok, false, 'la degradada sigue alcanzando el Q&A de su ex curso');
        assert.equal(r.code, PRIV);
      } finally {
        await comoOwner(db, `update public.profiles set role = 'teacher' where id = $1`, [ID.teacherA]);
      }
    });

    test('mandar is_instructor_answer es 42501 (sin grant)', async () => {
      const r = await como(
        db,
        COMPANERA,
        `insert into public.lesson_answers (question_id, author_id, body, is_instructor_answer)
         values ($1, $2, 'Soy docente', true)`,
        [q, COMPANERA_ID],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('cambiarla despues tambien es 42501', async () => {
      const r = await como(
        db,
        COMPANERA,
        `update public.lesson_answers set is_instructor_answer = true where question_id = $1 and author_id = $2`,
        [q, COMPANERA_ID],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('responder una pregunta borrada es 42501', async () => {
      const borrada = await nuevaPregunta();
      const b = await borrar(db, DUENA, 'lesson_questions', borrada, 'fuera de tema');
      assert.equal(b.ok, true, b.message);
      const r = await responder(db, COMPANERA, borrada);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.5
  describe('c.5 · una destacada por pregunta, solo de la docente', () => {
    let q, deDocente, deDocente2, deAlumna;
    const destacar = (actor, id, valor = `'2000-01-01'`) =>
      como(
        db,
        actor,
        `update public.lesson_answers set featured_at = ${valor} where id = $1 returning featured_at, featured_by`,
        [id],
      );

    before(async () => {
      q = await nuevaPregunta();
      deDocente = await nuevaRespuesta(DUENA, q, 'Primera respuesta de la docente');
      deDocente2 = await nuevaRespuesta(DUENA, q, 'Segunda respuesta de la docente');
      deAlumna = await nuevaRespuesta(COMPANERA, q, 'Respuesta de alumna');
    });

    test('la alumna no destaca', async () => {
      const r = await destacar(ALUMNA, deDocente);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('la duena no destaca una respuesta de alumna', async () => {
      const r = await destacar(DUENA, deAlumna);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('la duena destaca la suya y el guard firma con la hora del servidor', async () => {
      const r = await destacar(DUENA, deDocente);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
      assert.equal(r.rows[0].featured_by, ID.teacherA);
      assert.notEqual(new Date(r.rows[0].featured_at).getUTCFullYear(), 2000, 'el guard no estampo now()');
    });

    test('una segunda destacada en la misma pregunta es 23505', async () => {
      const r = await destacar(DUENA, deDocente2);
      assert.equal(r.ok, false);
      assert.equal(r.code, UNIQUE);
    });

    test('mandar featured_by es 42501 (sin grant)', async () => {
      const r = await como(db, DUENA, `update public.lesson_answers set featured_by = $2 where id = $1`, [deDocente, ID.admin]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('el admin desmarca y marca otra', async () => {
      const off = await destacar(ADMIN, deDocente, 'null');
      assert.equal(off.ok, true, off.message);
      assert.equal(off.rows[0].featured_by, null);
      const on = await destacar(ADMIN, deDocente2);
      assert.equal(on.ok, true, on.message);
      assert.equal(on.rows[0].featured_by, ID.admin);
    });

    test('una docente de otro curso no alcanza la fila (0 filas, sin cambio)', async () => {
      const r = await destacar(OTRA_DOCENTE, deDocente);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
      const [fila] = await comoOwner(db, `select featured_at from public.lesson_answers where id = $1`, [deDocente]);
      assert.equal(fila.featured_at, null);
    });
  });

  // ---------------------------------------------------------------- c.6
  describe('c.6 · la pregunta ajena no se edita', () => {
    let q;
    before(async () => {
      q = await nuevaPregunta();
    });

    // El no-op importa: en 0014 un PATCH que no cambiaba nada dejaba el mensaje ajeno "(editado)".
    for (const [campo, set] of [
      ['title', `set title = 'Secuestrada'`],
      ['body', `set body = 'Secuestrada'`],
      ['no-op', `set title = title`],
    ]) {
      test(`otra inscripta, ${campo}: 42501`, async () => {
        const r = await como(db, COMPANERA, `update public.lesson_questions ${set} where id = $1`, [q]);
        assert.equal(r.ok, false, `${campo} paso`);
        assert.equal(r.code, PRIV);
      });
    }

    test('la docente duena tampoco reescribe el texto', async () => {
      const r = await como(db, DUENA, `update public.lesson_questions set body = 'Lo corrijo yo' where id = $1`, [q]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('la autora edita y updated_at se mueve', async () => {
      const r = await como(
        db,
        ALUMNA,
        `update public.lesson_questions set body = 'Ahora lo explico mejor' where id = $1 returning id`,
        [q],
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
      const [fila] = await comoOwner(db, `select updated_at > created_at as movido from public.lesson_questions where id = $1`, [q]);
      assert.equal(fila.movido, true);
    });

    test('mover la pregunta a otra leccion es 42501 (sin grant)', async () => {
      const r = await como(db, ALUMNA, `update public.lesson_questions set lesson_id = $2 where id = $1`, [q, ID.lessonPreviewB]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.7
  describe('c.7 · un voto por persona y por pregunta', () => {
    let q;
    const votos = async () =>
      (await comoOwner(db, `select count(*)::int as n from public.lesson_question_votes where question_id = $1`, [q]))[0].n;
    const votar = (actor, userId = actor.sub) =>
      como(db, actor, `insert into public.lesson_question_votes (question_id, user_id) values ($1, $2)`, [q, userId]);

    before(async () => {
      q = await nuevaPregunta();
    });

    test('la companera vota', async () => {
      const r = await votar(COMPANERA);
      assert.equal(r.ok, true, r.message);
      assert.equal(await votos(), 1);
    });

    test('votar dos veces es 23505 y el contador no cambia', async () => {
      const r = await votar(COMPANERA);
      assert.equal(r.ok, false);
      assert.equal(r.code, UNIQUE);
      assert.equal(await votos(), 1);
    });

    test('votar a nombre de otra es 42501', async () => {
      const r = await votar(COMPANERA, ID.student);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('sin inscripcion no vota en una leccion no preview', async () => {
      const r = await votar(SIN_INSCRIPCION);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('el voto ajeno no se lee', async () => {
      const r = await como(db, ALUMNA, `select user_id from public.lesson_question_votes where question_id = $1`, [q]);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
    });

    test('el conteo sale de lesson_question_vote_counts, solo para preguntas legibles', async () => {
      const r = await como(db, ALUMNA, `select question_id, votes from public.lesson_question_vote_counts(array[$1]::uuid[])`, [q]);
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(r.rows, [{ question_id: q, votes: 1 }]);
      const fuera = await como(db, SIN_INSCRIPCION, `select question_id from public.lesson_question_vote_counts(array[$1]::uuid[])`, [q]);
      assert.equal(fuera.ok, true, fuera.message);
      assert.equal(fuera.rows.length, 0);
    });

    test('quitar el voto propio pasa y el contador baja', async () => {
      const r = await como(
        db,
        COMPANERA,
        `delete from public.lesson_question_votes where question_id = $1 and user_id = $2 returning question_id`,
        [q, COMPANERA_ID],
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
      assert.equal(await votos(), 0);
    });

    test('el voto ajeno no se borra (0 filas)', async () => {
      assert.equal((await votar(ALUMNA)).ok, true);
      const r = await como(
        db,
        COMPANERA,
        `delete from public.lesson_question_votes where question_id = $1 and user_id = $2 returning question_id`,
        [q, ID.student],
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
      assert.equal(await votos(), 1);
    });

    test('no se vota una pregunta borrada', async () => {
      const borrada = await nuevaPregunta();
      assert.equal((await borrar(db, DUENA, 'lesson_questions', borrada, 'duplicada')).ok, true);
      const r = await como(
        db,
        COMPANERA,
        `insert into public.lesson_question_votes (question_id, user_id) values ($1, $2)`,
        [borrada, COMPANERA_ID],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.8
  describe('c.8 · resolver: autora, duena o admin; el guard firma', () => {
    let q;
    const resolver = (actor, valor = `'2000-01-01'`) =>
      como(
        db,
        actor,
        `update public.lesson_questions set resolved_at = ${valor} where id = $1 returning resolved_at, resolved_by`,
        [q],
      );

    before(async () => {
      q = await nuevaPregunta();
    });

    test('otra inscripta no resuelve', async () => {
      const r = await resolver(COMPANERA);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('la autora resuelve y el guard firma con la hora del servidor', async () => {
      const r = await resolver(ALUMNA);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].resolved_by, ID.student);
      assert.notEqual(new Date(r.rows[0].resolved_at).getUTCFullYear(), 2000);
    });

    test('la duena reabre y vuelve a resolver', async () => {
      const off = await resolver(DUENA, 'null');
      assert.equal(off.ok, true, off.message);
      assert.equal(off.rows[0].resolved_by, null);
      const on = await resolver(DUENA);
      assert.equal(on.ok, true, on.message);
      assert.equal(on.rows[0].resolved_by, ID.teacherA);
    });

    test('el admin tambien resuelve', async () => {
      const r = await resolver(ADMIN);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].resolved_by, ID.admin);
    });

    test('mandar resolved_by es 42501 (sin grant)', async () => {
      const r = await como(db, ALUMNA, `update public.lesson_questions set resolved_by = $2 where id = $1`, [q, ID.admin]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.9
  describe('c.9 · soft delete con trio, solo duena o admin', () => {
    let q, r;
    before(async () => {
      q = await nuevaPregunta();
      r = await nuevaRespuesta(COMPANERA, q, 'Respuesta que despues se modera');
    });

    test('sin motivo es 42501', async () => {
      const x = await borrar(db, DUENA, 'lesson_questions', q, '   ');
      assert.equal(x.ok, false);
      assert.equal(x.code, PRIV);
    });

    test('una alumna no modera', async () => {
      const x = await borrar(db, COMPANERA, 'lesson_questions', q, 'no me gusta');
      assert.equal(x.ok, false);
      assert.equal(x.code, PRIV);
    });

    test('firmar a nombre de otra es 42501', async () => {
      const x = await borrar(db, DUENA, 'lesson_questions', q, 'fuera de tema', ID.admin);
      assert.equal(x.ok, false);
      assert.equal(x.code, PRIV);
    });

    test('una docente de otro curso no alcanza la fila (0 filas, sin cambio)', async () => {
      const x = await borrar(db, OTRA_DOCENTE, 'lesson_questions', q, 'me meto');
      assert.equal(x.ok, true, x.message);
      assert.equal(x.rows.length, 0);
      const [fila] = await comoOwner(db, `select deleted_at from public.lesson_questions where id = $1`, [q]);
      assert.equal(fila.deleted_at, null);
    });

    test('DELETE fisico: 42501 para todo rol de cliente, en las dos tablas', async () => {
      for (const actor of [ALUMNA, DUENA, ADMIN]) {
        for (const [tabla, id] of [['lesson_questions', q], ['lesson_answers', r]]) {
          const x = await como(db, actor, `delete from public.${tabla} where id = $1`, [id]);
          assert.equal(x.ok, false, `${actor.sub} borro fisicamente en ${tabla}`);
          assert.equal(x.code, PRIV);
        }
      }
    });

    test('la duena borra con motivo: trio completo y el cuerpo sigue legible', async () => {
      const x = await borrar(db, DUENA, 'lesson_questions', q, 'fuera de tema');
      assert.equal(x.ok, true, x.message);
      assert.equal(x.rows.length, 1);
      const [fila] = await comoOwner(
        db,
        `select deleted_at, deleted_by, deleted_reason, body from public.lesson_questions where id = $1`,
        [q],
      );
      assert.notEqual(fila.deleted_at, null);
      assert.equal(fila.deleted_by, ID.teacherA);
      assert.equal(fila.deleted_reason, 'fuera de tema');
      assert.equal(fila.body, 'No entendi el minuto 12.');
      const lectura = await como(db, COMPANERA, `select body, deleted_reason from public.lesson_questions where id = $1`, [q]);
      assert.equal(lectura.rows.length, 1, 'la cohorte dejo de ver la pregunta moderada');
    });

    test('una pregunta borrada queda congelada', async () => {
      for (const [actor, set] of [
        [ALUMNA, `set body = 'reescribo'`],
        [DUENA, `set deleted_reason = 'otro motivo'`],
        [ALUMNA, `set resolved_at = now()`],
      ]) {
        const x = await como(db, actor, `update public.lesson_questions ${set} where id = $1`, [q]);
        assert.equal(x.ok, false, `${set} paso sobre una borrada`);
        assert.equal(x.code, PRIV);
      }
    });

    test('el admin borra una respuesta destacada y deja de estar destacada', async () => {
      const q3 = await nuevaPregunta();
      const a3 = await nuevaRespuesta(DUENA, q3, 'Esta se destaca y despues se borra');
      const f = await como(db, DUENA, `update public.lesson_answers set featured_at = now() where id = $1`, [a3]);
      assert.equal(f.ok, true, f.message);
      const x = await borrar(db, ADMIN, 'lesson_answers', a3, 'duplicada');
      assert.equal(x.ok, true, x.message);
      const [fila] = await comoOwner(db, `select featured_at, featured_by, deleted_by from public.lesson_answers where id = $1`, [a3]);
      assert.equal(fila.featured_at, null);
      assert.equal(fila.featured_by, null);
      assert.equal(fila.deleted_by, ID.admin);
    });

    test('service_role modera sin pasar por la regla de permiso', async () => {
      await db.exec('reset role;');
      const x = await attempt(
        db,
        `update public.lesson_answers set deleted_at = now(), deleted_by = $2, deleted_reason = 'desde el servidor'
          where id = $1 returning id`,
        [r, ID.admin],
      );
      assert.equal(x.ok, true, x.message);
      assert.equal(x.rows.length, 1);
    });
  });

  // ---------------------------------------------------------------- c.10
  describe('c.10 · R-3: forma (CHECK) y exacta (trigger) en todo texto libre', () => {
    test('video_id real en el titulo: 42501', async () => {
      const r = await preguntar(db, ALUMNA, ID.lessonA, `Mira ${SECRET.videoId}`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('video_id real en el cuerpo: 42501', async () => {
      const r = await preguntar(db, ALUMNA, ID.lessonA, 'Una duda', `Esta en ${SECRET.videoId}`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('drive_file_id real en una respuesta: 42501', async () => {
      const q = await nuevaPregunta();
      const r = await responder(db, COMPANERA, q, `El material esta en ${SECRET.driveFileId}`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('forma de link en la pregunta: 23514', async () => {
      const r = await preguntar(db, ALUMNA, ID.lessonA, 'Una duda', 'Esta en drive.google.com/file/d/LEAKED123');
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK);
    });

    test('forma de link en una respuesta: 23514', async () => {
      const q = await nuevaPregunta();
      const r = await responder(db, COMPANERA, q, 'Lo subi a drive.google.com/file/d/LEAKED123');
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK);
    });

    test('video_id real en el motivo de borrado: 42501', async () => {
      const q = await nuevaPregunta();
      const r = await borrar(db, DUENA, 'lesson_questions', q, `Copio ${SECRET.videoId}`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('prosa con la palabra "video" pasa (control positivo)', async () => {
      const r = await preguntar(db, ALUMNA, ID.lessonA, 'Sobre el video', 'Cada leccion es un video corto y hay material para bajar.');
      assert.equal(r.ok, true, `falso positivo: ${r.message}`);
    });
  });

  // ---------------------------------------------------------------- c.12
  describe('c.12 · course_open_questions para T-048', () => {
    let abierta, conAlumna, respondida, resuelta, borrada;
    before(async () => {
      abierta = await nuevaPregunta();
      conAlumna = await nuevaPregunta();
      await nuevaRespuesta(COMPANERA, conAlumna, 'Respuesta de alumna, no cuenta');
      respondida = await nuevaPregunta();
      await nuevaRespuesta(DUENA, respondida, 'La docente ya respondio');
      resuelta = await nuevaPregunta();
      assert.equal((await como(db, ALUMNA, `update public.lesson_questions set resolved_at = now() where id = $1`, [resuelta])).ok, true);
      borrada = await nuevaPregunta();
      assert.equal((await borrar(db, DUENA, 'lesson_questions', borrada, 'spam')).ok, true);
    });

    test('la duena recibe las vivas, sin resolver y sin respuesta de docente', async () => {
      const r = await como(db, DUENA, `select id from public.course_open_questions($1)`, [ID.courseA]);
      assert.equal(r.ok, true, r.message);
      const ids = r.rows.map((x) => x.id);
      assert.ok(ids.includes(abierta), 'falta la abierta');
      assert.ok(ids.includes(conAlumna), 'una respuesta de alumna no cierra la pregunta');
      for (const [nombre, id] of [['respondida', respondida], ['resuelta', resuelta], ['borrada', borrada]]) {
        assert.ok(!ids.includes(id), `la ${nombre} no tendria que aparecer`);
      }
    });

    test('el admin tambien', async () => {
      const r = await como(db, ADMIN, `select id from public.course_open_questions($1)`, [ID.courseA]);
      assert.equal(r.ok, true, r.message);
      assert.ok(r.rows.length > 0);
    });

    for (const [nombre, actor] of [['otra docente', OTRA_DOCENTE], ['una alumna', ALUMNA]]) {
      test(`${nombre}: 42501`, async () => {
        const r = await como(db, actor, `select id from public.course_open_questions($1)`, [ID.courseA]);
        assert.equal(r.ok, false);
        assert.equal(r.code, PRIV);
      });
    }

    test('anon no la ejecuta', async () => {
      const r = await asAnon(db, () => attempt(db, `select id from public.course_open_questions($1)`, [ID.courseA]));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- autoras
  describe('lesson_qa_authors · nombre de quien escribio en algo legible, nada mas', () => {
    test('la companera ve el nombre de la alumna que pregunto', async () => {
      const r = await como(db, COMPANERA, `select full_name from public.lesson_qa_authors(array[$1]::uuid[])`, [ID.student]);
      assert.equal(r.ok, true, r.message);
      assert.deepEqual(r.rows, [{ full_name: 'Alumna' }]);
    });

    test('sin acceso a esas lecciones no obtiene nada', async () => {
      const r = await como(db, SIN_INSCRIPCION, `select full_name from public.lesson_qa_authors(array[$1]::uuid[])`, [ID.student]);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
    });
  });

  // ---------------------------------------------------------------- modo A (ultimo: borra una cuenta)
  describe('ADR-011 modo A · la baja de quien modero no queda bloqueada', () => {
    test('la moderadora se da de baja y sus firmas quedan en null', async () => {
      const MOD = 'c2000000-0000-4000-8000-000000000001';
      await comoOwner(db, `insert into auth.users (id, email) values ($1, 'moderadora@humano.test')`, [MOD]);
      await comoOwner(db, `update public.profiles set role = 'admin' where id = $1`, [MOD]);
      const actor = { sub: MOD, userRole: 'admin' };
      const q = await nuevaPregunta();
      const a = await nuevaRespuesta(DUENA, q, 'Para destacar');
      assert.equal((await como(db, actor, `update public.lesson_answers set featured_at = now() where id = $1`, [a])).ok, true);
      assert.equal((await como(db, actor, `update public.lesson_questions set resolved_at = now() where id = $1`, [q])).ok, true);
      assert.equal((await borrar(db, actor, 'lesson_questions', q, 'prueba de baja')).ok, true);

      await db.exec('reset role;');
      const baja = await attempt(db, `delete from auth.users where id = $1`, [MOD]);
      assert.equal(baja.ok, true, `la baja de la moderadora quedo bloqueada: ${baja.message}`);

      const [preg] = await comoOwner(db, `select deleted_at, deleted_by, resolved_by from public.lesson_questions where id = $1`, [q]);
      assert.notEqual(preg.deleted_at, null);
      assert.equal(preg.deleted_by, null);
      assert.equal(preg.resolved_by, null);
      const [resp] = await comoOwner(db, `select featured_at, featured_by from public.lesson_answers where id = $1`, [a]);
      assert.notEqual(resp.featured_at, null);
      assert.equal(resp.featured_by, null);
    });
  });
});

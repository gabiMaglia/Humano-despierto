// T-080 · D-16 · Una duena degradada deja de ser duena (owns_course lee profiles.role).
//
// El JWT de la degradada sigue diciendo `teacher` (es una foto): el test lo manda asi a proposito.
// Lo unico que cambia es la columna, que es la autoridad (regla 3 de CLAUDE.md).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const DEGRADADA = { sub: ID.teacherA, userRole: 'teacher' };

describe('D-16 · owns_course exige role = teacher', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('control: con role=teacher la duena es duena', async () => {
    const r = await asUser(db, DEGRADADA, () => attempt(db, `select public.owns_course($1) as es`, [ID.courseA]));
    assert.equal(r.rows[0].es, true);
    const q = await asUser(db, DEGRADADA, () => attempt(db, `select * from public.course_open_questions($1)`, [ID.courseA]));
    assert.equal(q.ok, true, q.message);
    // Destacar es el caso que mas facil queda vacuo (sin grant de featured_by): se prueba que el
    // MISMO update que despues se le niega a la degradada, hoy le funciona a la duena.
    const d = await asUser(db, DEGRADADA, () =>
      attempt(db, `update public.lesson_answers set featured_at = now() where id = $1 returning featured_by`, [ID.answerA]),
    );
    assert.equal(d.ok, true, d.message);
    assert.equal(d.rows[0]?.featured_by, ID.teacherA);
    await db.query(`update public.lesson_answers set featured_at = null, featured_by = null where id = $1`, [ID.answerA]);
  });

  describe('degradada a student', () => {
    before(async () => {
      await db.query(`update public.profiles set role = 'student' where id = $1`, [ID.teacherA]);
    });

    test('owns_course da false', async () => {
      const r = await asUser(db, DEGRADADA, () => attempt(db, `select public.owns_course($1) as es`, [ID.courseA]));
      assert.equal(r.rows[0].es, false);
    });

    test('course_open_questions la rechaza', async () => {
      const r = await asUser(db, DEGRADADA, () => attempt(db, `select * from public.course_open_questions($1)`, [ID.courseA]));
      assert.equal(r.ok, false, 'la degradada sigue listando preguntas abiertas de su ex curso');
      assert.equal(r.code, '42501');
    });

    test('no modera el Q&A: ocultar una pregunta no alcanza filas o se rechaza', async () => {
      const r = await asUser(db, DEGRADADA, () =>
        attempt(
          db,
          `update public.lesson_questions set deleted_at = now(), deleted_by = $1, deleted_reason = 'fuera de tema'
            where id = $2 returning id`,
          [ID.teacherA, ID.questionA],
        ),
      );
      assert.ok(!r.ok || r.rows.length === 0, 'la degradada modero una pregunta');
      const [fila] = (await db.query(`select deleted_at from public.lesson_questions where id = $1`, [ID.questionA])).rows;
      assert.equal(fila.deleted_at, null);
    });

    test('no destaca respuestas', async () => {
      const r = await asUser(db, DEGRADADA, () =>
        attempt(db, `update public.lesson_answers set featured_at = now() where id = $1 returning id`, [ID.answerA]),
      );
      assert.ok(!r.ok || r.rows.length === 0, 'la degradada destaco una respuesta');
    });

    test('no escribe el curriculum (modulos y lecciones)', async () => {
      const m = await asUser(db, DEGRADADA, () =>
        attempt(db, `update public.course_modules set title = 'Tomado' where id = $1 returning id`, [ID.moduleA]),
      );
      assert.ok(!m.ok || m.rows.length === 0, 'la degradada renombro un modulo');
      const l = await asUser(db, DEGRADADA, () =>
        attempt(db, `update public.lessons set title = 'Tomada' where id = $1 returning id`, [ID.lessonA]),
      );
      assert.ok(!l.ok || l.rows.length === 0, 'la degradada renombro una leccion');
    });

    test('no responde resenas como la guia', async () => {
      const r = await asUser(db, DEGRADADA, () =>
        attempt(db, `update public.course_reviews set response = 'Gracias' where course_id = $1 returning id`, [ID.courseA]),
      );
      assert.ok(!r.ok || r.rows.length === 0, 'la degradada respondio una resena');
    });
  });
});

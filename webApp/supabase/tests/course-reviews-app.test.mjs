// T-028 ronda 2 · el camino de la APP contra la base, no solo el DML directo.
//
// POR QUE EXISTE. La ronda 1 tenia 449 tests verdes y ni la primera resena se podia crear desde
// la ficha: `saveReviewAction` usaba `.upsert`, PostgREST lo traduce a
// `ON CONFLICT DO UPDATE SET course_id = EXCLUDED.course_id, user_id = ...` y el grant de UPDATE
// de `course_reviews` no cubre esas columnas -> 42501. Los tests solo ejercitaban INSERT/UPDATE
// escritos a mano, que no es lo que manda la app.
//
// Por eso aca se importan los modulos REALES que usan las actions (`src/lib/reviews/*.mjs`) y se
// los corre contra PGlite a traves de un cliente que emite el MISMO SQL que PostgREST para cada
// metodo del query builder (QueryBuilder.hs: `ON CONFLICT(cols) DO UPDATE SET c = EXCLUDED.c`
// para TODAS las columnas del payload).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const { guardarResena, responderResena, traducirErrorResena, reportarResena, traducirErrorReporte } = await import('../../src/lib/reviews/write.mjs');
const { elegirDestacada } = await import('../../src/lib/reviews/featured.mjs');
const { reviewAnchorPath, REVIEWS_ANCHOR } = await import('../../src/lib/reviews/links.mjs');

/** Cliente minimo con la forma de supabase-js que emite el SQL de PostgREST, como `sub`. */
function clientePostgrest(db, actor) {
  const run = (sql, params) =>
    asUser(db, actor, async () => {
      const r = await attempt(db, sql, params);
      return r.ok ? { data: r.rows, error: null } : { data: null, error: { code: r.code, message: r.message } };
    });

  return {
    from(table) {
      return {
        insert(row) {
          const cols = Object.keys(row);
          return run(
            `insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
            Object.values(row),
          );
        },
        upsert(row, { onConflict }) {
          const cols = Object.keys(row);
          return run(
            `insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
             on conflict (${onConflict}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}`,
            Object.values(row),
          );
        },
        update(vals) {
          const filtros = [];
          let returning = '';
          const b = {
            eq(col, v) { filtros.push([col, v]); return b; },
            select(cols) { returning = ` returning ${cols}`; return b; },
            then(resolve, reject) {
              const sets = Object.keys(vals);
              const params = [...Object.values(vals), ...filtros.map(([, v]) => v)];
              const where = filtros.map(([c], i) => `${c} = $${sets.length + i + 1}`).join(' and ');
              return run(
                `update public.${table} set ${sets.map((c, i) => `${c} = $${i + 1}`).join(', ')} where ${where}${returning}`,
                params,
              ).then(resolve, reject);
            },
          };
          return b;
        },
      };
    },
  };
}

const ALUMNA = { sub: ID.student, userRole: 'student' };
const GUIA_DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const GUIA_AJENA = { sub: ID.teacherB, userRole: 'teacher' };

const fila = async (db, sql, params) => {
  await db.exec('reset role;');
  return (await db.query(sql, params)).rows[0];
};

describe('T-028 r2 · la app escribe resenas por el camino que PostgREST realmente ejecuta', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    // El seed deja una resena de la alumna en courseA. Para probar la PRIMERA resena se borra.
    await db.query(`delete from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
  });

  after(async () => db?.close());

  test('reproduccion del bug: el upsert de PostgREST da 42501 sobre una inscripta activa', async () => {
    const r = await clientePostgrest(db, ALUMNA)
      .from('course_reviews')
      .upsert({ course_id: ID.courseA, user_id: ID.student, rating: 5, body: null }, { onConflict: 'user_id,course_id' });
    assert.equal(r.error?.code, '42501', 'si esto pasa, PostgREST cambio el SQL del upsert y hay que revisar la action');
  });

  describe('criterio 1 y 2 · crear y despues editar con la misma action', () => {
    test('la primera resena de una inscripta activa se crea', async () => {
      const r = await guardarResena(clientePostgrest(db, ALUMNA), {
        courseId: ID.courseA, userId: ID.student, rating: 4, body: 'Muy claro.',
      });
      assert.equal(r.error, null, r.error?.message);
      assert.equal(r.created, true);
      const row = await fila(db, `select rating, body from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]);
      assert.deepEqual(row, { rating: 4, body: 'Muy claro.' });
    });

    test('la segunda llamada EDITA la misma resena, no crea otra', async () => {
      const r = await guardarResena(clientePostgrest(db, ALUMNA), {
        courseId: ID.courseA, userId: ID.student, rating: 2, body: null,
      });
      assert.equal(r.error, null, r.error?.message);
      assert.equal(r.created, false);
      const filas = (await db.query(`select rating, body from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA])).rows;
      assert.deepEqual(filas, [{ rating: 2, body: null }]);
    });

    test('sin inscripcion la action devuelve el 42501 de RLS, sin fallback a UPDATE', async () => {
      const r = await guardarResena(clientePostgrest(db, ALUMNA), {
        courseId: ID.courseB, userId: ID.student, rating: 5, body: null,
      });
      assert.equal(r.error?.code, '42501');
    });
  });

  describe('criterio 5 · la guia responde desde la app', () => {
    const reviewId = async () =>
      (await fila(db, `select id from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA])).id;

    test('una guia AJENA afecta 0 filas y la action lo reporta como error', async () => {
      const r = await responderResena(clientePostgrest(db, GUIA_AJENA), { reviewId: await reviewId(), response: 'Gracias' });
      assert.notEqual(r.error, null, 'la action dijo "Respuesta publicada" sin haber escrito nada');
      const row = await fila(db, `select response from public.course_reviews where id = $1`, [await reviewId()]);
      assert.equal(row.response, null);
    });

    test('la guia duena responde y el SERVIDOR firma quien y cuando', async () => {
      const r = await responderResena(clientePostgrest(db, GUIA_DUENA), { reviewId: await reviewId(), response: 'Gracias por contarlo.' });
      assert.equal(r.error, null, r.error?.message);
      const row = await fila(
        db,
        `select response, responded_by, responded_at is not null as fechada from public.course_reviews where id = $1`,
        [await reviewId()],
      );
      assert.deepEqual(row, { response: 'Gracias por contarlo.', responded_by: ID.teacherA, fechada: true });
    });
  });

  describe('traducirErrorResena · cada 42501 dice lo que paso', () => {
    test('el guard de localizador -> mensaje de contenido pago', () => {
      const m = traducirErrorResena({ code: '42501', message: 'la resena contiene un localizador de contenido pago' }, 'x');
      assert.match(m, /contenido pago/);
    });

    test('el guard generico de 0025 tambien es localizador', () => {
      const m = traducirErrorResena({ code: '42501', message: 'un campo publico de course_reviews contiene un localizador de contenido pago' }, 'x');
      assert.match(m, /contenido pago/);
    });

    test('un 42501 de permiso (RLS o grant) NO habla de videos', () => {
      for (const message of [
        'new row violates row-level security policy for table "course_reviews"',
        'permission denied for table course_reviews',
      ]) {
        const m = traducirErrorResena({ code: '42501', message }, 'x');
        assert.doesNotMatch(m, /video|contenido pago/i, `"${message}" se tradujo como localizador`);
        assert.match(m, /permiso/i);
      }
    });

    test('23505 y 23514 conservan su traduccion', () => {
      assert.match(traducirErrorResena({ code: '23505', message: '' }, 'x'), /Ya dejaste/);
      assert.match(traducirErrorResena({ code: '23514', message: '' }, 'x'), /links/);
    });
  });

  test('el video_id real en el body llega a la action como localizador, no como permiso', async () => {
    const r = await guardarResena(clientePostgrest(db, ALUMNA), {
      courseId: ID.courseA, userId: ID.student, rating: 5, body: `Ver ${SECRET.videoId}`,
    });
    assert.equal(r.error?.code, '42501');
    assert.match(traducirErrorResena(r.error, 'x'), /contenido pago/);
  });
});

describe('criterio 4 · resena destacada: la mas reciente con 4-5 estrellas y cuerpo no vacio', () => {
  const r = (id, rating, body, updatedAt) => ({ id, rating, body, updatedAt });

  test('elige la mas reciente entre las de 4-5 con texto', () => {
    const d = elegirDestacada([
      r('a', 5, 'vieja', '2026-01-01T00:00:00Z'),
      r('b', 4, 'nueva', '2026-03-01T00:00:00Z'),
      r('c', 5, null, '2026-04-01T00:00:00Z'),
      r('d', 3, 'mas nueva pero de 3', '2026-05-01T00:00:00Z'),
      r('e', 5, '   ', '2026-06-01T00:00:00Z'),
    ]);
    assert.equal(d?.id, 'b');
  });

  test('sin candidatas no hay destacada', () => {
    assert.equal(elegirDestacada([r('a', 3, 'meh', '2026-01-01T00:00:00Z')]), null);
    assert.equal(elegirDestacada([]), null);
  });

  test('empate de fecha se resuelve por id: determinista, no por orden de llegada', () => {
    const t = '2026-01-01T00:00:00Z';
    assert.equal(elegirDestacada([r('b', 5, 'x', t), r('a', 5, 'y', t)])?.id, 'a');
    assert.equal(elegirDestacada([r('a', 5, 'y', t), r('b', 5, 'x', t)])?.id, 'a');
  });
});

describe('criterio 7 · el mail de curso completado invita a resenar', () => {
  test('el ancla apunta a la seccion de resenas de la ficha', () => {
    assert.equal(reviewAnchorPath('tarot-i'), `/cursos/tarot-i#${REVIEWS_ANCHOR}`);
  });

  test('el template usa el link en HTML y en texto, y notify lo arma con el ancla', async () => {
    const src = (p) => readFile(new URL(`../../src/${p}`, import.meta.url), 'utf8');
    const tpl = await src('lib/server/mail/templates/course-completed.ts');
    assert.ok((tpl.match(/props\.reviewUrl/g) ?? []).length >= 2, 'el link a resenar falta en html o en texto');
    const notify = await src('lib/server/mail/notify.ts');
    assert.match(notify, /reviewUrl:[^\n]*reviewAnchorPath\(input\.courseSlug\)/);
    const seccion = await src('components/reviews/ReviewsSection.tsx');
    assert.match(seccion, /id=\{REVIEWS_ANCHOR\}/, 'el ancla del mail no existe en la ficha');
  });
});

describe('T-037 · la app reporta por el camino que PostgREST ejecuta', () => {
  let db;
  let reviewId;
  const ADMIN = { sub: ID.admin, userRole: 'admin' };

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    reviewId = (await fila(db, `select id from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA])).id;
  });
  after(async () => db?.close());

  test('la guia duena reporta', async () => {
    const { error } = await reportarResena(clientePostgrest(db, GUIA_DUENA), {
      reviewId, reporterId: ID.teacherA, reason: 'Expone datos de una tercera persona.',
    });
    assert.equal(error, null, error?.message);
  });

  test('reportar dos veces se traduce, sin SQLSTATE a la vista', async () => {
    const { error } = await reportarResena(clientePostgrest(db, GUIA_DUENA), { reviewId, reporterId: ID.teacherA, reason: 'Otra vez' });
    assert.equal(error.code, '23505');
    assert.match(traducirErrorReporte(error, 'x'), /Ya reportaste/);
  });

  test('la guia ajena recibe el mensaje de permiso', async () => {
    const { error } = await reportarResena(clientePostgrest(db, GUIA_AJENA), { reviewId, reporterId: ID.teacherB, reason: 'Competencia' });
    assert.equal(error.code, '42501');
    assert.match(traducirErrorReporte(error, 'x'), /Solo la guía del curso/);
  });

  test('un video_id en el motivo recibe el mensaje de localizador, no el de permiso', async () => {
    const { error } = await reportarResena(clientePostgrest(db, ADMIN), { reviewId, reporterId: ID.admin, reason: `Mira ${SECRET.videoId}` });
    assert.equal(error.code, '42501');
    assert.match(traducirErrorReporte(error, 'x'), /identificador de un video/);
  });

  test('una resena que ya no existe (23503) no se muestra como permiso', () => {
    assert.match(traducirErrorReporte({ code: '23503', message: 'fk' }, 'x'), /ya no existe/);
  });
});

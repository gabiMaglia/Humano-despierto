// T-037 · Reportes de resenas (ADR-012). Mismo estandar que course-reviews: DML del actor contra
// Postgres real con SET ROLE y claims de PostgREST, y se afirma sobre el SQLSTATE.
// seed.mjs: `ID.student` reseno `courseA` (duena `ID.teacherA`); `ID.teacherB` es duena de
// `courseB` y no tiene nada que ver con esa resena.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';

const ALUMNA = { sub: ID.student, userRole: 'student' };
const OTRA = { sub: ID.otro, userRole: 'student' };
const GUIA_DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const GUIA_AJENA = { sub: ID.teacherB, userRole: 'teacher' };
const ADMIN = { sub: ID.admin, userRole: 'admin' };

const owner = async (db, sql, params = []) => {
  await db.exec('reset role;');
  return (await db.query(sql, params)).rows;
};

const reportar = (db, actor, reviewId, reporterId, reason) =>
  asUser(db, actor, () =>
    attempt(db, `insert into public.course_review_reports (review_id, reporter_id, reason) values ($1, $2, $3)`, [
      reviewId, reporterId, reason,
    ]),
  );

const resenaDeLaAlumna = async (db) =>
  (await owner(db, `select id from public.course_reviews where user_id = $1 and course_id = $2`, [ID.student, ID.courseA]))[0].id;

describe('T-037 · course_review_reports', () => {
  let db;
  let review;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    review = await resenaDeLaAlumna(db);
  });
  after(async () => db?.close());

  describe('ADR-012 c.3 · reporta la guia duena o el admin, y lo impide RLS', () => {
    test('la alumna autora no reporta', async () => {
      const r = await reportar(db, ALUMNA, review, ID.student, 'Me arrepenti');
      assert.equal(r.ok, false, 'la alumna reporto');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('otra alumna no reporta', async () => {
      const r = await reportar(db, OTRA, review, ID.otro, 'No me gusta');
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la guia de OTRO curso no reporta', async () => {
      const r = await reportar(db, GUIA_AJENA, review, ID.teacherB, 'Competencia');
      assert.equal(r.ok, false, 'una guia reporto una resena de un curso que no es suyo');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('nadie reporta a nombre de la guia duena', async () => {
      const r = await reportar(db, GUIA_AJENA, review, ID.teacherA, 'A nombre de otra');
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('una guia degradada a alumna ya no reporta aunque siga siendo teacher_id (R-2)', async () => {
      await owner(db, `update public.profiles set role = 'student' where id = $1`, [ID.teacherA]);
      try {
        const r = await reportar(db, GUIA_DUENA, review, ID.teacherA, 'Insultos');
        assert.equal(r.ok, false, 'el rol se leyo del claim o no se leyo');
        assert.equal(r.code, PRIV_DENIED);
      } finally {
        await owner(db, `update public.profiles set role = 'teacher' where id = $1`, [ID.teacherA]);
      }
    });

    test('control: la guia duena reporta', async () => {
      const r = await reportar(db, GUIA_DUENA, review, ID.teacherA, 'Expone datos de una tercera persona.');
      assert.equal(r.ok, true, r.message);
    });

    test('la misma guia no reporta dos veces la misma resena', async () => {
      const r = await reportar(db, GUIA_DUENA, review, ID.teacherA, 'Otra vez');
      assert.equal(r.ok, false);
      assert.equal(r.code, UNIQUE_VIOLATION);
    });

    test('control: el admin tambien reporta', async () => {
      const r = await reportar(db, ADMIN, review, ID.admin, 'Lo vi en la ficha.');
      assert.equal(r.ok, true, r.message);
    });
  });

  describe('el motivo', () => {
    test('en blanco lo rechaza el CHECK', async () => {
      await owner(db, `delete from public.course_review_reports where reporter_id = $1`, [ID.admin]);
      const r = await reportar(db, ADMIN, review, ID.admin, '   ');
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('mas de 1000 caracteres lo rechaza el CHECK', async () => {
      const r = await reportar(db, ADMIN, review, ID.admin, 'x'.repeat(1001));
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('ADR-009 mitad exacta: el video_id real se rechaza en el guard', async () => {
      const r = await reportar(db, ADMIN, review, ID.admin, `Pego ${SECRET.videoId} en la resena`);
      assert.equal(r.ok, false, 'un video_id entro al motivo');
      assert.equal(r.code, PRIV_DENIED);
      assert.match(r.message, /localizador de contenido pago/);
    });
  });

  describe('ADR-012 c.4 · nadie mas lee reportes', () => {
    test('la alumna autora no ve que la reportaron', async () => {
      const r = await asUser(db, ALUMNA, () => attempt(db, `select id from public.course_review_reports`));
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'la alumna ve reportes');
    });

    test('anon no tiene ni el grant', async () => {
      const r = await asAnon(db, () => attempt(db, `select id from public.course_review_reports`));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la guia ve su reporte pero no quien lo resolvio', async () => {
      const propios = await asUser(db, GUIA_DUENA, () =>
        attempt(db, `select id, resolution from public.course_review_reports where reporter_id = $1`, [ID.teacherA]),
      );
      assert.equal(propios.ok, true, propios.message);
      assert.equal(propios.rows.length, 1);
      const quien = await asUser(db, GUIA_DUENA, () => attempt(db, `select resolved_by from public.course_review_reports`));
      assert.equal(quien.ok, false, 'resolved_by es legible desde el cliente');
      assert.equal(quien.code, PRIV_DENIED);
    });

    test('la guia ajena no ve el reporte de otra', async () => {
      const r = await asUser(db, GUIA_AJENA, () => attempt(db, `select id from public.course_review_reports`));
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
    });
  });

  describe('ADR-012 c.5 · resolved_* no existe para ningun cliente', () => {
    test('la guia no se resuelve su propio reporte', async () => {
      const r = await asUser(db, GUIA_DUENA, () =>
        attempt(db, `update public.course_review_reports set resolved_at = now(), resolution = 'oculta' where reporter_id = $1`, [ID.teacherA]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni el admin con su JWT: resolver es de service_role', async () => {
      const r = await asUser(db, ADMIN, () =>
        attempt(db, `update public.course_review_reports set resolution = 'desestimada', resolved_at = now(), resolved_by = $1`, [ID.admin]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('un reporte no nace resuelto', async () => {
      const r = await asUser(db, ADMIN, () =>
        attempt(
          db,
          `insert into public.course_review_reports (review_id, reporter_id, reason, resolved_at, resolution)
           values ($1, $2, 'x', now(), 'desestimada')`,
          [review, ID.admin],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la guia no borra su reporte', async () => {
      const r = await asUser(db, GUIA_DUENA, () => attempt(db, `delete from public.course_review_reports where reporter_id = $1`, [ID.teacherA]));
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el trio de resolucion va junto', async () => {
      const r = await owner(db, `select 1`).then(() =>
        attempt(db, `update public.course_review_reports set resolution = 'oculta' where reporter_id = $1`, [ID.teacherA]),
      );
      assert.equal(r.ok, false, 'resolution sin resolved_at paso el CHECK');
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });

  // Al final: borra la resena del seed.
  describe('ADR-012 c.7 · el reporte muere con la resena y no bloquea el borrado', () => {
    test('la autora borra su resena reportada', async () => {
      const r = await asUser(db, ALUMNA, () =>
        attempt(db, `delete from public.course_reviews where id = $1 returning id`, [review]),
      );
      assert.equal(r.ok, true, `el reporte bloqueo el borrado: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el DELETE no alcanzo la resena: el caso no probo nada');
      const quedan = await owner(db, `select count(*)::int n from public.course_review_reports where review_id = $1`, [review]);
      assert.equal(quedan[0].n, 0, 'quedo un reporte huerfano');
    });
  });
});

describe('T-037 · moderate_* es el unico camino y es de service_role', () => {
  let db;
  let review;

  const comoServidor = async (fn) => {
    await db.exec('set role service_role;');
    try {
      return await fn();
    } finally {
      await db.exec('reset role;');
    }
  };
  const ocultar = (reviewId, adminId, reason) =>
    comoServidor(() => attempt(db, `select public.moderate_hide_review($1, $2, $3) as n`, [reviewId, adminId, reason]));

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    review = await resenaDeLaAlumna(db);
    await reportar(db, GUIA_DUENA, review, ID.teacherA, 'Expone a una tercera persona.');
  });
  after(async () => db?.close());

  test('el admin con su JWT no ejecuta la funcion', async () => {
    const r = await asUser(db, ADMIN, () => attempt(db, `select public.moderate_hide_review($1, $2, 'spam')`, [review, ID.admin]));
    assert.equal(r.ok, false, 'un cliente ejecuto la moderacion');
    assert.equal(r.code, PRIV_DENIED);
    // El 42501 tiene que ser el de EXECUTE. Con execute otorgado, el mismo codigo llega desde el
    // grant de columna de hidden_* o desde el re-chequeo de rol, y el caso pasaria por otra razon.
    assert.match(r.message, /permission denied for function/);
  });

  test('la guia tampoco', async () => {
    const r = await asUser(db, GUIA_DUENA, () => attempt(db, `select public.moderate_hide_review($1, $2, 'spam')`, [review, ID.teacherA]));
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, /permission denied for function/);
  });

  test('servidor con un p_admin_id que no es admin: 42501 (R-2, segunda capa)', async () => {
    const r = await ocultar(review, ID.teacherA, 'spam');
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('motivo en blanco: 22023 y nada cambia (SP-4 c.3)', async () => {
    const r = await ocultar(review, ID.admin, '   ');
    assert.equal(r.ok, false);
    assert.equal(r.code, '22023');
    const [f] = await owner(db, `select hidden_at from public.course_reviews where id = $1`, [review]);
    assert.equal(f.hidden_at, null);
  });

  test('resena inexistente: P0002', async () => {
    const r = await ocultar('00000000-0000-4000-8000-000000000000', ID.admin, 'spam');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'P0002');
  });

  test('ocultar: trio escrito, reportes pendientes resueltos como oculta, y sale del publico (SP-4 c.1)', async () => {
    const r = await ocultar(review, ID.admin, '  Datos personales de un tercero  ');
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].n, 1, 'no resolvio el reporte pendiente');

    const [f] = await owner(db, `select hidden_at, hidden_by, hidden_reason from public.course_reviews where id = $1`, [review]);
    assert.notEqual(f.hidden_at, null);
    assert.equal(f.hidden_by, ID.admin);
    assert.equal(f.hidden_reason, 'Datos personales de un tercero');

    const [rep] = await owner(db, `select resolution, resolved_by, resolved_at from public.course_review_reports where review_id = $1`, [review]);
    assert.equal(rep.resolution, 'oculta');
    assert.equal(rep.resolved_by, ID.admin);
    assert.notEqual(rep.resolved_at, null);

    // Lo que lee getCourseReviews: cliente anon, filtrado por course_reviews_read.
    const publico = await asAnon(db, () => attempt(db, `select id, rating from public.course_reviews where course_id = $1`, [ID.courseA]));
    assert.equal(publico.ok, true, publico.message);
    assert.equal(publico.rows.length, 0, 'la resena oculta sigue saliendo al publico y al promedio');
  });

  test('ocultar dos veces no reescribe el motivo ni resuelve nada', async () => {
    const r = await ocultar(review, ID.admin, 'Otro motivo');
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].n, 0);
    const [f] = await owner(db, `select hidden_reason from public.course_reviews where id = $1`, [review]);
    assert.equal(f.hidden_reason, 'Datos personales de un tercero');
  });

  test('desocultar: vuelve al publico y los reportes resueltos no cambian (SP-4 c.2)', async () => {
    const r = await comoServidor(() => attempt(db, `select public.moderate_unhide_review($1, $2) as ok`, [review, ID.admin]));
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].ok, true);
    const publico = await asAnon(db, () => attempt(db, `select id from public.course_reviews where id = $1`, [review]));
    assert.equal(publico.rows.length, 1, 'no volvio a la ficha');
    const [rep] = await owner(db, `select resolution from public.course_review_reports where review_id = $1`, [review]);
    assert.equal(rep.resolution, 'oculta', 'desocultar toco un reporte resuelto');

    const otra = await comoServidor(() => attempt(db, `select public.moderate_unhide_review($1, $2) as ok`, [review, ID.admin]));
    assert.equal(otra.rows[0].ok, false, 'desocultar una visible deberia avisar que no habia nada');
  });

  test('desestimar: resuelve con desestimada, una sola vez, sin tocar la resena', async () => {
    await reportar(db, ADMIN, review, ID.admin, 'Revisar el tono.');
    const [{ id: rep }] = await owner(db, `select id from public.course_review_reports where reporter_id = $1`, [ID.admin]);
    const r = await comoServidor(() => attempt(db, `select public.moderate_dismiss_report($1, $2) as ok`, [rep, ID.admin]));
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows[0].ok, true);
    const [f] = await owner(db, `select resolution, resolved_by from public.course_review_reports where id = $1`, [rep]);
    assert.equal(f.resolution, 'desestimada');
    assert.equal(f.resolved_by, ID.admin);
    const [res] = await owner(db, `select hidden_at from public.course_reviews where id = $1`, [review]);
    assert.equal(res.hidden_at, null);

    const otra = await comoServidor(() => attempt(db, `select public.moderate_dismiss_report($1, $2) as ok`, [rep, ID.admin]));
    assert.equal(otra.rows[0].ok, false);
  });
});

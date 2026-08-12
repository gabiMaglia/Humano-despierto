// T-022 · Diario — las docentes escriben — TEST DE MUTACION REAL.
//
// Mismo estandar que el resto de la suite: `SET ROLE` + claims en `request.jwt.claims`, como
// los deja PostgREST. Se afirma sobre el SQLSTATE devuelto, no sobre lo que el codigo "deberia"
// hacer, y todo control de mutacion revierte UNA sola cosa y comprueba que el ataque VUELVE A
// PASAR (no se asume: se mide) — la leccion que este proyecto pagó cuatro veces (ver playbook).
//
// Fixtures de `seed.mjs`: `ID.postA` (teacherA, publicado) y `ID.postDraftB` (teacherB, borrador).

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';

const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOwnerTeacher = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asOtherTeacher = (db, fn) => asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, fn);
const asAdmin = (db, fn) => asUser(db, { sub: ID.admin, userRole: 'admin' }, fn);
const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};
const asRawOwner = async (db, sql, params = []) => {
  await db.exec(`reset role;`);
  return (await db.query(sql, params)).rows;
};

const insertPost = (db, actorFn, teacherId, overrides = {}) =>
  actorFn(db, () =>
    attempt(
      db,
      `insert into public.diario_posts (teacher_id, slug, title, excerpt, body${overrides.extraCols ?? ''})
       values ($1, $2, $3, $4, $5${overrides.extraVals ?? ''}) returning id, status, published_at`,
      [
        teacherId,
        overrides.slug ?? 'post-nuevo',
        overrides.title ?? 'Un post nuevo',
        overrides.excerpt ?? null,
        overrides.body ?? 'Cuerpo del post, prosa comun sin ningun link.',
        ...(overrides.extraParams ?? []),
      ],
    ),
  );

describe('T-022 · Diario — RLS de diario_posts', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- criterio 1 · CRUD propio
  describe('criterio 1 · CRUD de posts, cada docente solo los suyos', () => {
    test('anon no puede insertar', async () => {
      const r = await asAnon(db, () =>
        attempt(
          db,
          `insert into public.diario_posts (teacher_id, slug, title, body) values ($1, 'x', 'x', 'x')`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('un alumno (no docente) no puede insertar aunque mande su propio id', async () => {
      const r = await insertPost(db, asStudent, ID.student, { slug: 'post-de-alumna' });
      assert.equal(r.ok, false, 'un alumno pudo publicar en el diario');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('una docente no puede insertar un post a nombre de OTRA docente', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherB, { slug: 'post-suplantado' });
      assert.equal(r.ok, false, 'una docente publico a nombre de otra');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('una docente SI puede insertar un post propio — nace en draft', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-propio-nuevo' });
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].status, 'draft', 'un post no nace en borrador');
      assert.equal(r.rows[0].published_at, null, 'un post nace con published_at seteado');
    });

    test('una docente puede editar su propio post', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.diario_posts set title = $1 where id = $2 returning id`, ['Titulo corregido', ID.postA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test('una docente NO puede editar el post de otra (no-op silencioso: la fila no entra al USING)', async () => {
      const r = await asOtherTeacher(db, () =>
        attempt(db, `update public.diario_posts set title = $1 where id = $2 returning id`, ['Me lo apropio', ID.postA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'una docente ajena pudo tocar la fila de otra');
      const real = await asRawOwner(db, `select title from public.diario_posts where id = $1`, [ID.postA]);
      assert.notEqual(real[0].title, 'Me lo apropio');
    });

    test('una docente puede borrar su propio post', async () => {
      const created = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-a-borrar' });
      assert.equal(created.ok, true, created.message);
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `delete from public.diario_posts where id = $1 returning id`, [created.rows[0].id]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test('una docente NO puede borrar el post de otra', async () => {
      const created = await insertPost(db, asOtherTeacher, ID.teacherB, { slug: 'post-de-b-protegido' });
      assert.equal(created.ok, true, created.message);
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `delete from public.diario_posts where id = $1 returning id`, [created.rows[0].id]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'una docente ajena pudo borrar el post de otra');
      const real = await asRawOwner(db, `select id from public.diario_posts where id = $1`, [created.rows[0].id]);
      assert.equal(real.length, 1, 'el post de la otra docente desaparecio');
    });
  });

  // ---------------------------------------------------------------- criterio 2 · lectura publica
  describe('criterio 2 · `/diario` lista solo publicados', () => {
    test('anon lee un post publicado', async () => {
      const r = await asAnon(db, () =>
        attempt(db, `select slug, title, body from public.diario_posts where id = $1`, [ID.postA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test('anon NO ve el borrador de otra docente', async () => {
      const r = await asAnon(db, () =>
        attempt(db, `select id from public.diario_posts where id = $1`, [ID.postDraftB]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0, 'un borrador ajeno fue visible sin sesion');
    });

    test('una docente sin relacion con el post ajeno tampoco ve su borrador', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `select id from public.diario_posts where id = $1`, [ID.postDraftB]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
    });

    test('la propia autora SI ve su borrador (para poder editarlo en el panel)', async () => {
      const r = await asOtherTeacher(db, () =>
        attempt(db, `select id from public.diario_posts where id = $1`, [ID.postDraftB]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test('el admin ve cualquier borrador (superusuario de lectura, mismo criterio que courses_read)', async () => {
      const r = await asAdmin(db, () =>
        attempt(db, `select id from public.diario_posts where id = $1`, [ID.postDraftB]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });
  });

  // ---------------------------------------------------------------- criterio 3 · status/published_at de servidor
  describe('criterio 3 · status y published_at son del servidor', () => {
    test('el INSERT no puede nacer publicado', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-autopublicado',
        extraCols: ', status',
        extraVals: ', $6',
        extraParams: ['published'],
      });
      assert.equal(r.ok, false, 'un post nacio publicado por decision del cliente');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el INSERT no puede traer published_at propio', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-con-fecha-propia',
        extraCols: ', published_at',
        extraVals: ', now()',
      });
      assert.equal(r.ok, false, 'el cliente fijo su propia fecha de publicacion');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('la autora NO puede publicar su propio post por UPDATE directo', async () => {
      const created = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-quiere-autopublicarse' });
      assert.equal(created.ok, true, created.message);
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.diario_posts set status = 'published' where id = $1`, [created.rows[0].id]),
      );
      assert.equal(r.ok, false, 'la autora se autopublico');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('service_role SI puede publicar, y published_at se fija solo (sync_published_at)', async () => {
      const created = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-que-se-publica' });
      assert.equal(created.ok, true, created.message);
      const r = await asService(db, () =>
        attempt(db, `update public.diario_posts set status = 'published' where id = $1 returning published_at`, [
          created.rows[0].id,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.notEqual(r.rows[0].published_at, null, 'se publico sin fecha');
    });

    test('service_role puede despublicar, y published_at vuelve a null', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `update public.diario_posts set status = 'draft' where id = $1 returning published_at`,
          [ID.postA],
        ),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].published_at, null);
      // se restaura para no romper el resto de la suite
      await asRawOwner(db, `update public.diario_posts set status = 'published', published_at = now() where id = $1`, [
        ID.postA,
      ]);
    });
  });

  // ---------------------------------------------------------------- criterio 4 · ADR-009
  describe('criterio 4 · ADR-009 en el cuerpo — coincidencia exacta, no forma', () => {
    test('el localizador REAL de un video de esta plataforma es rechazado en el body, al insertar', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-con-video-id-real',
        body: `Miren la clase completa, el id es ${SECRET.videoId} y lo buscan en youtube.`,
      });
      assert.equal(r.ok, false, 'el video_id real paso en el cuerpo');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el localizador REAL de un recurso de Drive de esta plataforma es rechazado en el body', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-con-url-real',
        body: `El manual completo esta aca: ${SECRET.url}`,
      });
      assert.equal(r.ok, false, 'la url real del material pago paso en el cuerpo');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('lo mismo al EDITAR: no se puede colar el localizador real en una actualizacion', async () => {
      const created = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-editado-con-fuga' });
      assert.equal(created.ok, true, created.message);
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.diario_posts set body = $1 where id = $2`, [
          `Ahora sí les dejo el drive: ${SECRET.url}`,
          created.rows[0].id,
        ]),
      );
      assert.equal(r.ok, false, 'el localizador real paso al editar el cuerpo');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('ni service_role puede escribir el localizador real en el cuerpo: es invariante, sin bypass', async () => {
      const r = await asService(db, () =>
        attempt(db, `update public.diario_posts set body = $1 where id = $2`, [
          `Material: ${SECRET.url}`,
          ID.postA,
        ]),
      );
      assert.equal(r.ok, false, 'service_role pudo escribir el localizador real en el cuerpo');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('control positivo — LA TENSION DEL TICKET: un link LEGITIMO externo SI pasa en el cuerpo', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-con-link-legitimo',
        body: 'Si quieren profundizar, este articulo de referencia es excelente: https://es.wikipedia.org/wiki/Tarot',
      });
      assert.equal(r.ok, true, r.message);
    });

    test('control positivo: prosa comun, sin ningun link, pasa sin problema', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-prosa-comun',
        body: 'Hay transitos que pasan rozando y hay otros que parten la corteza. No se interpretan, se atraviesan.',
      });
      assert.equal(r.ok, true, r.message);
    });

    test('control: el link legitimo SI se lee sin inscripcion una vez publicado (es contenido, no un locator)', async () => {
      await asService(db, () =>
        attempt(db, `update public.diario_posts set status = 'published' where slug = 'post-con-link-legitimo'`),
      );
      const r = await asAnon(db, () =>
        attempt(db, `select body from public.diario_posts where slug = 'post-con-link-legitimo'`),
      );
      assert.equal(r.ok, true, r.message);
      assert.match(r.rows[0].body, /wikipedia\.org/);
    });
  });

  // ---------------------------------------------------------------- criterio 5 · barrido de titulo/slug/excerpt
  describe('title/slug/excerpt SI llevan la heuristica de forma completa (misma clase que courses)', () => {
    test('un link en el titulo se rechaza', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-titulo-con-link',
        title: 'Miralo en drive.google.com/file/d/LEAKED123',
      });
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('un link en el excerpt se rechaza', async () => {
      const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
        slug: 'post-excerpt-con-link',
        excerpt: 'Bajalo de www.humano-archivos.net',
      });
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });
});

// =====================================================================================
// CONTROLES DE MUTACION — cada uno revierte UNA cosa y AFIRMA que el ataque vuelve a pasar
// (no lo asume). Sin esto, los verdes de arriba no distinguen "el guard lo detiene" de
// "la sentencia estaba mal escrita" — es el defecto que ya paso cuatro veces en este proyecto.
// =====================================================================================
describe('T-022 · controles de mutacion', () => {
  test('c.1 · sin el guard NI el whitelist, una docente logra autopublicarse por UPDATE', async () => {
    // Dos capas independientes protegen `status`/`published_at` (ADR-008): el whitelist de
    // columnas de 0003 (`status` no esta en el GRANT UPDATE) y el guard trigger de esta migracion.
    // Revertir SOLO el guard no alcanza para probar nada — el GRANT ya bloquea la sentencia antes
    // de llegar al trigger. Hay que tumbar las dos, igual que el "defecto 5" de `courses`
    // (insert-guards.test.mjs) para el mismo patron.
    const { db } = await bootDatabase({
      afterMigrations: [
        `drop trigger diario_posts_guard on public.diario_posts;`,
        `grant update (status, published_at) on public.diario_posts to authenticated;`,
      ],
    });
    await seed(db);

    const created = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-sin-guard' });
    assert.equal(created.ok, true, created.message);

    const r = await asOwnerTeacher(db, () =>
      attempt(
        db,
        `update public.diario_posts set status = 'published', published_at = now() where id = $1`,
        [created.rows[0].id],
      ),
    );
    assert.equal(r.ok, true, 'no era el guard lo que bloqueaba la autopublicacion');

    const check = await asRawOwner(db, `select status from public.diario_posts where id = $1`, [created.rows[0].id]);
    assert.equal(check[0].status, 'published', 'el ataque no se confirma en el estado real de la fila');
    await db.close();
  });

  test('c.2 · sin el guard, el localizador real de un video se filtra en el cuerpo y queda LEGIBLE sin inscripcion', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`drop trigger diario_posts_guard on public.diario_posts;`],
    });
    await seed(db);

    const FUGA = `El video secreto es ${SECRET.videoId}, buscalo en youtube.`;
    const r = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-con-fuga-sin-guard', body: FUGA });
    assert.equal(r.ok, true, 'no era el guard lo que bloqueaba la fuga del localizador');

    await asService(db, () =>
      attempt(db, `update public.diario_posts set status = 'published' where id = $1`, [r.rows[0].id]),
    );
    const anon = await asAnon(db, () =>
      attempt(db, `select body from public.diario_posts where id = $1`, [r.rows[0].id]),
    );
    assert.equal(anon.ok, true, anon.message);
    assert.equal(anon.rows[0].body, FUGA, 'el localizador filtrado no quedo legible: el control no prueba lo que dice');
    await db.close();
  });

  test('c.3 · revirtiendo SOLO el CHECK del titulo, el link vuelve a pasar', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`alter table public.diario_posts drop constraint diario_posts_title_no_locator;`],
    });
    await seed(db);

    const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
      slug: 'post-titulo-sin-check',
      title: 'Miralo en drive.google.com/file/d/LEAKED123',
    });
    assert.equal(r.ok, true, 'no era el CHECK de title lo que bloqueaba el link');
    await db.close();
  });

  test('c.3b · sin `sync_published_at`, el CHECK de pareja igual sostiene el invariante (defensa en profundidad real)', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`drop trigger diario_posts_sync_published_at on public.diario_posts;`],
    });
    await seed(db);

    const created = await insertPost(db, asOwnerTeacher, ID.teacherA, { slug: 'post-sin-sync' });
    assert.equal(created.ok, true, created.message);

    // Sin el sync trigger, `service_role` puede publicar SIN que nadie complete `published_at` —
    // el guard ya bypasseo el resto de las reglas por ser service_context. Si el CHECK fuera
    // adorno (nunca alcanzable porque sync siempre corrige antes), esto pasaria en silencio.
    const r = await asService(db, () =>
      attempt(db, `update public.diario_posts set status = 'published' where id = $1`, [created.rows[0].id]),
    );
    assert.equal(r.ok, false, 'quedo un post "publicado" sin fecha de publicacion');
    assert.equal(r.code, CHECK_VIOLATION);
    await db.close();
  });

  test('c.4 · con el grant de tabla completo (status incluido), el guard sigue siendo la unica barrera y aguanta', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [`grant insert (status, published_at) on public.diario_posts to authenticated;`],
    });
    await seed(db);

    const r = await insertPost(db, asOwnerTeacher, ID.teacherA, {
      slug: 'post-con-grant-de-mas',
      extraCols: ', status',
      extraVals: ', $6',
      extraParams: ['published'],
    });
    assert.equal(r.ok, false, 'con el grant de mas, el guard dejo de sostener la regla');
    assert.equal(r.code, PRIV_DENIED);
    await db.close();
  });
});

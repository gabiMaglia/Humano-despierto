// T-031 · Anuncios de la docente — TEST DE MUTACION REAL contra PGlite.
//
// Mismo estandar que lesson-questions.test.mjs: cada caso corre el DML del actor con SET ROLE y
// los claims del JWT como los deja PostgREST, y se afirma sobre el SQLSTATE. Publicar se corre
// como `service_role` porque es lo que hace el Server Action (R-4): ningun cliente tiene grant
// sobre `status`. Fixtures: `ID.student` inscripta activa en courseA (duena `ID.teacherA`),
// `ID.otro` sin inscripcion. La companera (activa) y la revocada se crean aca.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV = '42501';
const CHECK = '23514';

const COMPANERA_ID = 'c3100000-0000-4000-8000-000000000001';
const REVOCADA_ID = 'c3100000-0000-4000-8000-000000000002';
const MODERADORA_ID = 'c3100000-0000-4000-8000-000000000003';

const ALUMNA = { sub: ID.student, userRole: 'student' };
const COMPANERA = { sub: COMPANERA_ID, userRole: 'student' };
const REVOCADA = { sub: REVOCADA_ID, userRole: 'student' };
const SIN_INSCRIPCION = { sub: ID.otro, userRole: 'student' };
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const OTRA_DOCENTE = { sub: ID.teacherB, userRole: 'teacher' };
const ADMIN = { sub: ID.admin, userRole: 'admin' };
const MODERADORA = { sub: MODERADORA_ID, userRole: 'admin' };
// El Server Action de publicar usa la service key: sin `sub`, rol `service_role`.
const SERVIDOR = { sub: null, role: 'service_role' };

const como = (db, actor, sql, params = []) => asUser(db, actor, () => attempt(db, sql, params));

const escribir = (
  db,
  actor,
  { courseId = ID.courseA, title = 'Clase nueva en el modulo dos', body = 'Subi un ejercicio para practicar la tirada de tres cartas.' } = {},
) =>
  como(
    db,
    actor,
    `insert into public.course_announcements (course_id, author_id, title, body)
     values ($1, $2, $3, $4) returning id, status, published_at`,
    [courseId, actor.sub, title, body],
  );

const publicar = (db, id) =>
  como(
    db,
    SERVIDOR,
    `update public.course_announcements set status = 'published'
      where id = $1 and status = 'draft' returning id, published_at`,
    [id],
  );

const retirar = (db, actor, id, motivo, firma = actor.sub) =>
  como(
    db,
    actor,
    `update public.course_announcements set deleted_at = now(), deleted_by = $2, deleted_reason = $3
      where id = $1 returning id`,
    [id, firma, motivo],
  );

const ve = async (db, actor, id) => {
  const r = await como(db, actor, `select id from public.course_announcements where id = $1`, [id]);
  assert.equal(r.ok, true, r.message);
  return r.rows.length;
};

const fila = async (db, id) =>
  (await db.query(`select * from public.course_announcements where id = $1`, [id])).rows[0];

describe('T-031 · anuncios de la docente', () => {
  let db;

  const borrador = async (opts) => {
    const r = await escribir(db, DUENA, opts);
    assert.equal(r.ok, true, `precondicion: la duena no pudo escribir: ${r.message}`);
    return r.rows[0].id;
  };
  const publicado = async (opts) => {
    const id = await borrador(opts);
    const p = await publicar(db, id);
    assert.equal(p.ok, true, `precondicion: el servidor no pudo publicar: ${p.message}`);
    assert.equal(p.rows.length, 1, 'precondicion: publicar no alcanzo la fila');
    return id;
  };

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(
      `insert into auth.users (id, email) values ($1, 'companera-anuncios@humano.test'),
              ($2, 'revocada-anuncios@humano.test'), ($3, 'moderadora-anuncios@humano.test')`,
      [COMPANERA_ID, REVOCADA_ID, MODERADORA_ID],
    );
    await db.query(`update public.profiles set role = 'admin' where id = $1`, [MODERADORA_ID]);
    await db.query(
      `insert into public.enrollments (user_id, course_id, status, granted_by) values
         ($1, $3, 'active', $4), ($2, $3, 'revoked', $4)`,
      [COMPANERA_ID, REVOCADA_ID, ID.courseA, ID.admin],
    );
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- c.1
  describe('c.1 · la duena crea un borrador; nadie mas escribe en su curso', () => {
    test('nace draft, sin published_at, y ninguna alumna lo ve', async () => {
      const r = await escribir(db, DUENA);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].status, 'draft');
      assert.equal(r.rows[0].published_at, null);
      const id = r.rows[0].id;
      assert.equal(await ve(db, ALUMNA, id), 0, 'la inscripta vio un borrador');
      assert.equal(await ve(db, DUENA, id), 1, 'la duena no ve su propio borrador');
    });

    for (const [nombre, actor] of [
      ['otra docente', OTRA_DOCENTE],
      ['una alumna inscripta', ALUMNA],
      ['el admin (modera, no anuncia)', ADMIN],
    ]) {
      test(`${nombre} insertando en el curso: 42501`, async () => {
        const r = await escribir(db, actor);
        assert.equal(r.ok, false, `${nombre} escribio un anuncio`);
        assert.equal(r.code, PRIV);
      });
    }

    test('a nombre de otra (author_id ajeno): 42501', async () => {
      const r = await como(
        db,
        DUENA,
        `insert into public.course_announcements (course_id, author_id, title, body) values ($1, $2, 'Titulo', 'Cuerpo')`,
        [ID.courseA, ID.teacherB],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('nacer publicado mandando status: 42501 (sin grant de INSERT)', async () => {
      const r = await como(
        db,
        DUENA,
        `insert into public.course_announcements (course_id, author_id, title, body, status)
         values ($1, $2, 'Titulo', 'Cuerpo', 'published')`,
        [ID.courseA, ID.teacherA],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.2
  describe('c.2 · publicar solo existe del lado del servidor', () => {
    test('la duena manda status=published: 42501 por grant, y la fila sigue en draft', async () => {
      const id = await borrador();
      const r = await como(db, DUENA, `update public.course_announcements set status = 'published' where id = $1`, [id]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
      assert.equal((await fila(db, id)).status, 'draft');
    });

    test('la duena manda published_at: 42501', async () => {
      const id = await borrador();
      const r = await como(db, DUENA, `update public.course_announcements set published_at = now() where id = $1`, [id]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });
  });

  // ---------------------------------------------------------------- c.3
  describe('c.3 · publicado: lo leen las inscriptas activas, la duena y el admin', () => {
    let id;
    before(async () => {
      id = await publicado();
    });

    test('service_role publica y published_at lo pone el servidor', async () => {
      const f = await fila(db, id);
      assert.equal(f.status, 'published');
      assert.ok(f.published_at, 'published_at quedo nulo');
    });

    for (const [nombre, actor, esperado] of [
      ['inscripta activa', ALUMNA, 1],
      ['otra inscripta activa', COMPANERA, 1],
      ['la duena', DUENA, 1],
      ['el admin', ADMIN, 1],
      ['inscripcion revocada', REVOCADA, 0],
      ['sin inscripcion', SIN_INSCRIPCION, 0],
      ['docente de otro curso', OTRA_DOCENTE, 0],
    ]) {
      test(`${nombre}: ${esperado} fila(s)`, async () => {
        assert.equal(await ve(db, actor, id), esperado);
      });
    }

    test('el admin no ve borradores ajenos (spec: publicados + borradores propios de la duena)', async () => {
      const draft = await borrador();
      assert.equal(await ve(db, ADMIN, draft), 0);
    });
  });

  // ---------------------------------------------------------------- c.6
  describe('c.6 · lo publicado no se reescribe, ni siquiera desde el servidor', () => {
    let id;
    before(async () => {
      id = await publicado();
    });

    test('la duena edita el body: 42501', async () => {
      const r = await como(db, DUENA, `update public.course_announcements set body = 'Otro texto' where id = $1`, [id]);
      assert.equal(r.ok, false, 'se reescribio lo que ya salio por mail');
      assert.equal(r.code, PRIV);
    });

    test('la duena edita el titulo: 42501', async () => {
      const r = await como(db, DUENA, `update public.course_announcements set title = 'Otro titulo' where id = $1`, [id]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('service_role edita el body: 42501 (invariante sin bypass)', async () => {
      const r = await como(db, SERVIDOR, `update public.course_announcements set body = 'Otro texto' where id = $1`, [id]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('service_role lo devuelve a draft: 42501', async () => {
      const r = await como(db, SERVIDOR, `update public.course_announcements set status = 'draft' where id = $1`, [id]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('control: el BORRADOR si se edita, y updated_at se mueve', async () => {
      const draft = await borrador();
      // Se fecha a mano en el pasado (como owner) en vez de dormir: PGlite no garantiza pg_sleep.
      await db.exec('reset role;');
      await db.query(`update public.course_announcements set updated_at = '2000-01-01' where id = $1`, [draft]);
      const r = await como(db, DUENA, `update public.course_announcements set body = 'Texto corregido' where id = $1 returning id`, [draft]);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo la fila');
      assert.ok(new Date((await fila(db, draft)).updated_at).getFullYear() > 2000, 'updated_at no se movio');
    });

    test('otra docente edita el borrador ajeno: 0 filas y la fila intacta (desvio 6)', async () => {
      const draft = await borrador();
      const r = await como(db, OTRA_DOCENTE, `update public.course_announcements set body = 'Secuestrado' where id = $1 returning id`, [draft]);
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 0);
      assert.equal((await fila(db, draft)).body, 'Subi un ejercicio para practicar la tirada de tres cartas.');
    });
  });

  // ---------------------------------------------------------------- c.7
  describe('c.7 · retirar: firmado, con motivo, congelado; sin DELETE', () => {
    test('el admin retira con motivo: trio completo y la alumna deja de verlo', async () => {
      const id = await publicado();
      const r = await retirar(db, ADMIN, id, 'Contenido fuera de lugar');
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo la fila');
      const f = await fila(db, id);
      assert.ok(f.deleted_at);
      assert.equal(f.deleted_by, ID.admin);
      assert.equal(f.deleted_reason, 'Contenido fuera de lugar');
      assert.equal(await ve(db, ALUMNA, id), 0, 'el retirado sigue visible para la inscripta');
      assert.equal(await ve(db, DUENA, id), 1, 'la duena tiene que seguir viendo que se lo retiraron');
    });

    test('la duena retira el suyo con motivo', async () => {
      const id = await publicado();
      const r = await retirar(db, DUENA, id, 'Lo publique por error');
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test('la duena sin motivo: 42501', async () => {
      const id = await publicado();
      const r = await como(
        db,
        DUENA,
        `update public.course_announcements set deleted_at = now(), deleted_by = $2 where id = $1`,
        [id, ID.teacherA],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('la duena con motivo en blanco: 42501 (el guard gana al CHECK de largo)', async () => {
      const id = await publicado();
      const r = await retirar(db, DUENA, id, '   ');
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('una alumna inscripta (ve la fila): 42501', async () => {
      const id = await publicado();
      const r = await retirar(db, ALUMNA, id, 'No me gusta');
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('firmar a nombre de otra: 42501', async () => {
      const id = await publicado();
      const r = await retirar(db, DUENA, id, 'Motivo', ID.admin);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('retirar y editar en la misma sentencia: 42501', async () => {
      const id = await borrador();
      const r = await como(
        db,
        DUENA,
        `update public.course_announcements set body = 'Cambio', deleted_at = now(), deleted_by = $2, deleted_reason = 'x'
          where id = $1`,
        [id, ID.teacherA],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('un retirado no se vuelve a tocar (des-retirar): 42501', async () => {
      const id = await borrador();
      assert.equal((await retirar(db, DUENA, id, 'Borrador viejo')).ok, true);
      const r = await como(
        db,
        DUENA,
        `update public.course_announcements set deleted_at = null, deleted_by = null, deleted_reason = null where id = $1`,
        [id],
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    test('un borrador retirado no se publica, ni desde el servidor: 42501', async () => {
      const id = await borrador();
      assert.equal((await retirar(db, DUENA, id, 'Descartado')).ok, true);
      const r = await publicar(db, id);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    for (const [nombre, actor] of [
      ['la duena', DUENA],
      ['el admin', ADMIN],
      ['una alumna', ALUMNA],
    ]) {
      test(`DELETE fisico, ${nombre}: 42501`, async () => {
        const id = await publicado();
        const r = await como(db, actor, `delete from public.course_announcements where id = $1`, [id]);
        assert.equal(r.ok, false, `${nombre} borro fisicamente`);
        assert.equal(r.code, PRIV);
      });
    }

    test('trio relajado: dar de baja a la moderadora deja el retiro en pie con deleted_by nulo', async () => {
      const id = await publicado();
      assert.equal((await retirar(db, MODERADORA, id, 'Moderado')).ok, true);
      await db.exec('reset role;');
      await db.query(`delete from auth.users where id = $1`, [MODERADORA_ID]);
      const f = await fila(db, id);
      assert.ok(f.deleted_at, 'el retiro se perdio con la baja');
      assert.equal(f.deleted_by, null);
      assert.equal(f.deleted_reason, 'Moderado');
    });
  });

  // ---------------------------------------------------------------- c.9
  describe('c.9 · R-3 doble: el localizador real es 42501, la forma de link 23514', () => {
    for (const [campo, valor] of [
      ['title', `Clase ${SECRET.videoId}`],
      ['body', `Miren esto: ${SECRET.videoId}`],
      ['body', `El cuaderno esta en ${SECRET.driveFileId}`],
    ]) {
      test(`${campo} con ${valor}: 42501`, async () => {
        const r = await escribir(db, DUENA, { [campo]: valor });
        assert.equal(r.ok, false, 'entro un localizador pago');
        assert.equal(r.code, PRIV);
      });
    }

    test('editar un borrador para meter el video_id: 42501', async () => {
      const id = await borrador();
      const r = await como(db, DUENA, `update public.course_announcements set body = $2 where id = $1`, [id, `Ver ${SECRET.videoId}`]);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV);
    });

    for (const [nombre, opts] of [
      ['link en el body', { body: 'Miren https://ejemplo.com/clase' }],
      ['link en el titulo', { title: 'Nueva clase en www.ejemplo' }],
      ['titulo de 2 caracteres', { title: 'ab' }],
      ['titulo de 201 caracteres', { title: 'x'.repeat(201) }],
      ['body vacio', { body: '   ' }],
      ['body de 6001 caracteres', { body: 'y'.repeat(6001) }],
    ]) {
      test(`${nombre}: 23514`, async () => {
        const r = await escribir(db, DUENA, opts);
        assert.equal(r.ok, false);
        assert.equal(r.code, CHECK);
      });
    }

    test('control: 6000 caracteres de prosa pasan', async () => {
      const r = await escribir(db, DUENA, { body: 'Una frase de prosa. '.repeat(300) });
      assert.equal(r.ok, true, r.message);
    });
  });

  // ---------------------------------------------------------------- c.10
  describe('c.10 · anon no lee nada', () => {
    test('select directo: 42501', async () => {
      await publicado();
      const r = await asAnon(db, () => attempt(db, `select id, title from public.course_announcements`));
      assert.equal(r.ok, false, 'anon leyo anuncios');
      assert.equal(r.code, PRIV);
    });
  });
});

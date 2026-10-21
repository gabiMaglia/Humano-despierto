// ADR-011 · Un guard trigger tambien se prueba por el lado LEGITIMO.
//
// POR QUE EXISTE. Los tests de ataque prueban que lo prohibido no pasa. Ninguno prueba que lo
// permitido si. Esa mitad faltante dejo pasar el mismo bug DOS VECES:
//
//   0017 · el guard de inmutabilidad de `certificates` rechazaba todo UPDATE, incluido el que
//          dispara `on delete set null`. Una cuenta con certificado NO SE PODIA DAR DE BAJA.
//   0024 · el guard de `course_reviews` exigia `is_admin()` para tocar `hidden_*`, pero con
//          service_role `auth.uid()` es null. LA MODERACION QUEDABA INALCANZABLE.
//
// Los dos dieron verde en toda la suite mientras rompian una funcion del producto.
//
// POR QUE LOS CASOS SE ESCRIBEN A MANO. "Cual es la operacion legitima" es semantica del dominio,
// no una propiedad del esquema: no hay nada en el catalogo que diga que borrar una cuenta tiene
// que poder anular su certificado. Lo que SI se automatiza es el aviso -- la meta-asercion de
// abajo -- para que un trigger nuevo no entre sin su caso.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

// Triggers que NO pueden bloquear nada y por eso no necesitan caso. Se enumeran a mano para que
// agregar uno exija justificarlo -- misma friccion que EXENTAS_POR_ENUM en locator-free-text.
//
// `*_set_updated_at` estampan `now()` en una columna y no tienen un solo `raise` en su cuerpo.
// Un trigger que no puede levantar no puede hacer inalcanzable nada.
const EXENTOS_NO_BLOQUEAN = [
  'campus_posts_set_updated_at',
  'lesson_answers_set_updated_at',
  'lesson_questions_set_updated_at',
  'course_modules_set_updated_at',
  'courses_set_updated_at',
  'diario_posts_set_updated_at',
  'enrollments_set_updated_at',
  'lesson_chapters_set_updated_at',
  'lesson_notes_set_updated_at',
  'lesson_resources_set_updated_at',
  'lessons_set_updated_at',
  'profiles_set_updated_at',
  // Estos dos SI escriben, pero solo derivan `published_at` de `status` para satisfacer el CHECK
  // `published_at_matches_status`. Tampoco tienen `raise`: no pueden bloquear, solo corregir.
  'courses_sync_published_at',
  'diario_posts_sync_published_at',
];

// Cada entrada declara el trigger y QUE OPERACION protege de volverse inalcanzable. El texto va
// en el nombre del test para que un fallo diga que se rompio sin abrir el archivo.
const CASOS = {
  // --- los dos que YA se rompieron. Estos dos casos son la razon de ser del archivo.
  certificates_guard_immutable: 'borrar la cuenta anula el certificado (on delete set null) — bug de 0017',
  course_reviews_guard: 'service_role oculta una resena — bug de 0024',

  // --- estado de servidor
  courses_guard: 'service_role publica y despublica un curso',
  courses_guard_insert: 'la docente crea un curso, que nace en draft',
  lessons_guard: 'service_role carga video_id + duration_seconds y publica (T-005 c.4b)',
  diario_posts_guard: 'service_role publica un post del diario',
  enrollments_guard: 'service_role aprueba, rechaza con motivo, reconsidera y revoca',
  enrollments_guard_insert: 'la alumna pide un curso publicado y la fila nace requested',
  profiles_guard: 'la docente edita su bio sin tocar su rol',
  certificates_guard_insert: 'service_role emite el certificado de un curso completo',

  // --- progreso
  lesson_progress_guard_insert: 'la alumna guarda progreso real y la fila nace incompleta',
  lesson_progress_monotonic: 'el progreso avanza dentro del tope de tasa de 0009',

  // --- moderacion
  campus_posts_guard: 'la moderadora hace soft delete con autor y motivo',
  // --- q&a por leccion (T-030)
  lesson_questions_derive_scope: 'la alumna pregunta sin mandar course_id y el curso sale de la leccion',
  lesson_questions_guard: 'la autora marca resuelta y la docente duena modera con motivo',
  lesson_questions_locator_guard: 'la alumna pregunta con prosa normal',
  lesson_answers_derive_scope: 'la docente responde y la respuesta nace de docente',
  lesson_answers_guard: 'la docente duena destaca su respuesta',
  lesson_answers_locator_guard: 'una alumna responde con prosa normal',
  // T-030 E1 (D-26): la mitad exacta de R-3 sobre el motivo de moderacion del Campus.
  campus_posts_locator_guard: 'la moderadora borra un mensaje del Campus con un motivo en prosa normal',
  // --- moderacion de resenas (T-037)
  course_review_reports_guard: 'la guia duena reporta con prosa normal y la cuenta de quien resolvio se puede borrar',

  // --- localizadores (T-035). De estos seis, TRES nunca se verificaron por el lado legitimo:
  //     course_modules, lesson_chapters y lesson_resources. Este ticket existe en parte por eso.
  courses_locator_guard: 'la docente edita la ficha de su curso con prosa normal',
  lessons_locator_guard: 'la docente renombra una leccion con prosa normal',
  course_modules_locator_guard: 'la docente renombra un modulo con prosa normal',
  lesson_chapters_locator_guard: 'la docente crea y renombra un capitulo',
  lesson_resources_locator_guard: 'la docente renombra un recurso',
  profiles_locator_guard: 'el hook de alta crea el perfil y la docente edita su bio',
  // --- perfil (T-042)
  profiles_avatar_path_guard: 'el alta crea el perfil sin avatar y la duena apunta el suyo a su carpeta y lo saca',
  // --- T-049 · invitaciones
  teacher_invitations_guard: 'service_role crea, revoca y acepta; borrar la cuenta de quien invito o acepto',
};

const triggersDeLaDb = async (db) =>
  (
    await db.query(`
      select t.tgname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and not t.tgisinternal
       order by 1
    `)
  ).rows.map((r) => r.tgname);

describe('ADR-011 · ningun guard hace inalcanzable la operacion legitima', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- la meta-asercion
  test('todo trigger de la base tiene caso de alcanzabilidad o exencion justificada', async () => {
    // NO se filtra por `like '%guard%'`. `lesson_progress_monotonic` impone un invariante y no se
    // llama guard: filtrar por nombre haria que la cobertura dependa de como alguien bautizo algo,
    // que es el mismo agujero que ADR-010 vino a cerrar en la otra mitad de ADR-009.
    const enLaDb = await triggersDeLaDb(db);
    const declarados = new Set([...Object.keys(CASOS), ...EXENTOS_NO_BLOQUEAN]);
    const huerfanos = enLaDb.filter((t) => !declarados.has(t));

    assert.deepEqual(
      huerfanos,
      [],
      `triggers sin caso de alcanzabilidad ni exencion:\n  ${huerfanos.join('\n  ')}\n` +
        `Aparecio un trigger nuevo y nadie probo su camino legitimo — que es exactamente como ` +
        `0017 y 0024 llegaron al repo.`,
    );
  });

  // La meta-asercion tambien tiene que apuntar al reves: un caso para un trigger que ya no existe
  // es un caso que no prueba nada y da verde para siempre.
  test('no hay casos declarados para triggers que ya no existen', async () => {
    const enLaDb = new Set(await triggersDeLaDb(db));
    const fantasmas = [...Object.keys(CASOS), ...EXENTOS_NO_BLOQUEAN].filter((t) => !enLaDb.has(t));
    assert.deepEqual(fantasmas, [], `casos/exenciones de triggers inexistentes: ${fantasmas.join(', ')}`);
  });
  // ---------------------------------------------------------------- estado de servidor
  describe('estado de servidor · service_role sigue pudiendo lo suyo', () => {
    test(`courses_guard · ${CASOS.courses_guard}`, async () => {
      await db.exec(`reset role;`);
      const publicar = await attempt(
        db,
        `update public.courses set status = 'published', published_at = now() where id = $1 returning id`,
        [ID.courseDraft],
      );
      assert.equal(publicar.ok, true, `service_role no pudo publicar: ${publicar.message}`);
      assert.equal(publicar.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');

      const despublicar = await attempt(
        db,
        `update public.courses set status = 'draft', published_at = null where id = $1 returning id`,
        [ID.courseDraft],
      );
      assert.equal(despublicar.ok, true, `service_role no pudo despublicar: ${despublicar.message}`);
    });

    test(`courses_guard_insert · ${CASOS.courses_guard_insert}`, async () => {
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id)
           values ('t036-curso-nuevo', 'Curso nuevo', 'tarot', 'inicial', $1) returning status`,
          [ID.teacherA],
        ),
      );
      assert.equal(r.ok, true, `la docente no pudo crear un curso: ${r.message}`);
      assert.equal(r.rows[0].status, 'draft', 'el curso no nacio en draft');
    });

    test(`lessons_guard · ${CASOS.lessons_guard}`, async () => {
      await db.exec(`reset role;`);
      const r = await attempt(
        db,
        `update public.lessons set video_id = 'aBcD1234_-x', duration_seconds = 600, is_published = true
          where id = $1 returning is_published`,
        [ID.lessonA],
      );
      assert.equal(r.ok, true, `service_role no pudo cargar video y publicar: ${r.message}`);
      assert.equal(r.rows[0].is_published, true);
    });

    test(`diario_posts_guard · ${CASOS.diario_posts_guard}`, async () => {
      await db.exec(`reset role;`);
      const r = await attempt(
        db,
        `update public.diario_posts set status = 'published', published_at = now()
          where id = $1 returning status`,
        [ID.postDraftB],
      );
      assert.equal(r.ok, true, `service_role no pudo publicar un post: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`enrollments_guard_insert · ${CASOS.enrollments_guard_insert}`, async () => {
      const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(
          db,
          `insert into public.enrollments (user_id, course_id) values ($1, $2)
           returning status, requested_at is not null as fechada, granted_by`,
          [ID.student, ID.courseB],
        ),
      );
      assert.equal(r.ok, true, `la alumna no pudo pedir el curso: ${r.message}`);
      assert.equal(r.rows[0].status, 'requested');
      assert.equal(r.rows[0].fechada, true, 'el guard no fecho la solicitud');
      assert.equal(r.rows[0].granted_by, null);
    });

    test(`enrollments_guard · ${CASOS.enrollments_guard}`, async () => {
      await db.exec(`reset role;`);
      const alta = await attempt(
        db,
        `insert into public.enrollments (user_id, course_id, status) values ($1, $2, 'requested') returning id`,
        [ID.otro, ID.courseB],
      );
      assert.equal(alta.ok, true, `service_role no pudo registrar una solicitud: ${alta.message}`);

      const pasos = [
        [`status = 'rejected', decided_at = now(), decided_reason = 'Cupo completo'`, 'rejected'],
        [`status = 'active', decided_reason = null, decided_at = now(), granted_by = '${ID.admin}', enrolled_at = now()`, 'active'],
        [`status = 'revoked', decided_at = now()`, 'revoked'],
      ];
      for (const [set, esperado] of pasos) {
        const r = await attempt(
          db,
          `update public.enrollments set ${set} where user_id = $1 and course_id = $2 returning status`,
          [ID.otro, ID.courseB],
        );
        assert.equal(r.ok, true, `service_role no pudo pasar a ${esperado}: ${r.message}`);
        assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
        assert.equal(r.rows[0].status, esperado);
      }
    });

    test(`profiles_guard · ${CASOS.profiles_guard}`, async () => {
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(db, `update public.profiles set bio = $1 where id = $2 returning id`, [
          'Trabajo con tarot desde 2019.',
          ID.teacherA,
        ]),
      );
      assert.equal(r.ok, true, `la docente no pudo editar su bio: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });
  });

  // ---------------------------------------------------------------- progreso
  describe('progreso', () => {
    test(`lesson_progress_guard_insert · ${CASOS.lesson_progress_guard_insert}`, async () => {
      const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(
          db,
          // `course_id` es obligatorio: ADR-005 lo denormaliza en toda la jerarquia de contenido
          // para que las politicas de RLS no tengan que unir contra `lessons` en cada consulta.
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched)
           values ($1, $2, $3, 30) returning completed, seconds_watched`,
          [ID.student, ID.courseA, ID.lessonPreviewB],
        ),
      );
      assert.equal(r.ok, true, `la alumna no pudo guardar progreso real: ${r.message}`);
      assert.equal(r.rows[0].completed, false, 'la fila deberia nacer incompleta');
      // El valor guardado NO es 30: en el INSERT no hay `old` contra el que acotar, asi que el
      // tope de 0009 se reduce al margen fijo (`0*2 + 10`) y recorta a 10. Es el comportamiento
      // correcto — se afirma sobre el, no sobre el numero que el cliente pidio.
      assert.ok(r.rows[0].seconds_watched > 0, 'no se guardo nada de progreso');
    });

    test(`lesson_progress_monotonic · ${CASOS.lesson_progress_monotonic}`, async () => {
      // El tope de 0009 es 2N + margen entre escrituras, medido con el reloj del SERVIDOR. Un
      // avance chico tiene que pasar; si no pasa, el tope quedo tan ajustado que el progreso
      // normal es inalcanzable — que es exactamente lo que este archivo busca.
      await db.exec(`reset role;`);
      const previo = await db.query(
        `select seconds_watched from public.lesson_progress where user_id = $1 and lesson_id = $2`,
        [ID.student, ID.lessonPreviewB],
      );
      const antes = previo.rows[0].seconds_watched;

      const r = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(
          db,
          `update public.lesson_progress set seconds_watched = $3 where user_id = $1 and lesson_id = $2
            returning seconds_watched`,
          [ID.student, ID.lessonPreviewB, antes + 5],
        ),
      );
      assert.equal(r.ok, true, `el progreso normal quedo bloqueado por el tope: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
      // Este guard RECORTA en vez de rechazar (`least(new, old + tope)`), asi que `ok: true` sale
      // igual aunque el valor no haya avanzado ni un segundo. Sin afirmar sobre el VALOR el caso
      // seria vacuo: lo que importa es que el progreso legitimo AVANZO.
      //
      // No se afirma un numero exacto a proposito: el tope es `transcurrido*2 + 10` y en una suite
      // que corre en milisegundos el transcurrido es 0, asi que cuanto deja pasar depende del
      // reloj. Fijar un valor exacto haria un test que falla por lentitud de la maquina, no por
      // un bug.
      assert.ok(
        r.rows[0].seconds_watched > antes,
        `el tope no dejo avanzar nada: quedo en ${r.rows[0].seconds_watched}, venia de ${antes}`,
      );
    });
  });

  // ---------------------------------------------------------------- moderacion
  describe('moderacion', () => {
    test(`campus_posts_guard · ${CASOS.campus_posts_guard}`, async () => {
      await db.exec(`reset role;`);
      const post = (
        await db.query(
          `insert into public.campus_posts (course_id, author_id, body)
           values ($1, $2, 'Mensaje de prueba') returning id`,
          [ID.courseA, ID.student],
        )
      ).rows[0];

      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(
          db,
          `update public.campus_posts
              set deleted_at = now(), deleted_by = $1, deleted_reason = 'fuera de tema'
            where id = $2 returning id`,
          [ID.teacherA, post.id],
        ),
      );
      assert.equal(r.ok, true, `la moderadora no pudo hacer soft delete: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`campus_posts_locator_guard · ${CASOS.campus_posts_locator_guard}`, async () => {
      await db.exec(`reset role;`);
      const post = (
        await db.query(
          `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, 'Otro mensaje') returning id`,
          [ID.courseA, ID.student],
        )
      ).rows[0];
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(
          db,
          `update public.campus_posts
              set deleted_at = now(), deleted_by = $1, deleted_reason = 'Repite el video de la clase 2'
            where id = $2 returning id`,
          [ID.teacherA, post.id],
        ),
      );
      assert.equal(r.ok, true, `un motivo en prosa quedo bloqueado: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    // T-030 E2 · el bug de 0017 en el Campus: `deleted_by` es `on delete set null` y el trio
    // estricto de 0014 hacia que la cuenta de una moderadora no se pudiera borrar.
    test('campus_posts_guard · la baja de una moderadora deja su firma en null y no queda bloqueada', async () => {
      const MOD = 'c4000000-0000-4000-8000-000000000001';
      await db.exec(`reset role;`);
      await db.query(`insert into auth.users (id, email) values ($1, 'moderadora-campus@humano.test')`, [MOD]);
      await db.query(`update public.profiles set role = 'admin' where id = $1`, [MOD]);
      const post = (
        await db.query(
          `insert into public.campus_posts (course_id, author_id, body) values ($1, $2, 'Para moderar') returning id`,
          [ID.courseA, ID.student],
        )
      ).rows[0];
      const moderar = await asUser(db, { sub: MOD, userRole: 'admin' }, () =>
        attempt(
          db,
          `update public.campus_posts set deleted_at = now(), deleted_by = $1, deleted_reason = 'spam'
            where id = $2 returning id`,
          [MOD, post.id],
        ),
      );
      assert.equal(moderar.ok, true, `la moderadora no pudo moderar: ${moderar.message}`);

      await db.exec(`reset role;`);
      const baja = await attempt(db, `delete from auth.users where id = $1`, [MOD]);
      assert.equal(baja.ok, true, `la baja de la moderadora quedo bloqueada (bug de 0017): ${baja.message}`);
      const [fila] = (
        await db.query(`select deleted_at, deleted_by, deleted_reason from public.campus_posts where id = $1`, [post.id])
      ).rows;
      assert.notEqual(fila.deleted_at, null);
      assert.equal(fila.deleted_by, null);
      assert.equal(fila.deleted_reason, 'spam');
    });

    test(`course_reviews_guard · ${CASOS.course_reviews_guard}`, async () => {
      await db.exec(`reset role;`);
      const r = await attempt(
        db,
        `update public.course_reviews
            set hidden_at = now(), hidden_by = $1, hidden_reason = 'spam'
          where course_id = $2 returning id`,
        [ID.admin, ID.courseA],
      );
      assert.equal(r.ok, true, `la moderacion legitima quedo bloqueada (bug de 0024): ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila — el caso no probo nada');
      await db.query(
        `update public.course_reviews set hidden_at = null, hidden_by = null, hidden_reason = null
          where course_id = $1`,
        [ID.courseA],
      );
    });

    test('course_reviews_guard · una inscripta que no es la guia resena (D-20 no corta de mas)', async () => {
      await db.exec(`reset role;`);
      await db.query(`insert into public.enrollments (user_id, course_id, status, granted_by) values ($1, $2, 'active', $3)`, [ID.otro, ID.courseA, ID.admin]);
      try {
        const r = await asUser(db, { sub: ID.otro, userRole: 'student' }, () =>
          attempt(db, `insert into public.course_reviews (course_id, user_id, rating) values ($1, $2, 4) returning id`, [ID.courseA, ID.otro]),
        );
        assert.equal(r.ok, true, `D-20 bloqueo a una alumna legitima: ${r.message}`);
        assert.equal(r.rows.length, 1);
      } finally {
        await db.exec(`reset role;`);
        await db.query(`delete from public.course_reviews where user_id = $1 and course_id = $2`, [ID.otro, ID.courseA]);
        await db.query(`delete from public.enrollments where user_id = $1 and course_id = $2`, [ID.otro, ID.courseA]);
      }
    });

    // 0026 metio la firma de la respuesta en este mismo guard. Su camino legitimo: la guia dueña
    // manda SOLO el texto (sin grant sobre `responded_*`) y el guard firma por ella.
    test('course_reviews_guard · la guia dueña responde y el guard firma (0026)', async () => {
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(db, `update public.course_reviews set response = $1 where course_id = $2 returning id`, [
          'Gracias por escribir.',
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true, `la guia no pudo responder: ${r.message}`);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila — el caso no probo nada');
      await db.exec(`reset role;`);
      const [firma] = (await db.query(`select responded_by from public.course_reviews where id = $1`, [r.rows[0].id])).rows;
      assert.equal(firma.responded_by, ID.teacherA);
      await db.query(
        `update public.course_reviews set response = null, responded_at = null, responded_by = null where id = $1`,
        [r.rows[0].id],
      );
    });
  });

  // ---------------------------------------------------------------- localizadores (T-035)
  describe('localizadores · prosa normal no se bloquea', () => {
    const comoDocente = (fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);

    test(`courses_locator_guard · ${CASOS.courses_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.courses set intro = $1 where id = $2 returning id`, [
          'Un recorrido por los 22 arcanos, con ejercicios de lectura.',
          ID.courseA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`lessons_locator_guard · ${CASOS.lessons_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.lessons set title = $1 where id = $2 returning id`, [
          'Clase 3 — los arcanos menores',
          ID.lessonA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`course_modules_locator_guard · ${CASOS.course_modules_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.course_modules set title = $1 where id = $2 returning id`, [
          'Modulo II — el viaje del heroe',
          ID.moduleA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`lesson_chapters_locator_guard · ${CASOS.lesson_chapters_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.lesson_chapters set label = $1 where id = $2 returning id`, [
          'Apertura del arcano',
          ID.chapterA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`lesson_resources_locator_guard · ${CASOS.lesson_resources_locator_guard}`, async () => {
      const r = await comoDocente(() =>
        attempt(db, `update public.lesson_resources set name = $1 where id = $2 returning id`, [
          'Manual v2.1',
          ID.resourceA,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`profiles_locator_guard · ${CASOS.profiles_locator_guard}`, async () => {
      // El alta NO se simula insertando en `profiles`: esa fila tiene FK contra `auth.users` y no
      // existe suelta. El camino real es insertar el usuario, que dispara `handle_new_user` — y es
      // justo ahi donde un guard sobre `profiles` puede romper el registro entero.
      await db.exec(`reset role;`);
      const nuevoId = '11111111-1111-4111-8111-111111111111';
      const alta = await attempt(
        db,
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, 't036-alta@test.local', '{"full_name":"Alta de prueba"}'::jsonb) returning id`,
        [nuevoId],
      );
      assert.equal(alta.ok, true, `el guard rompe el alta de cuenta: ${alta.message}`);
      const perfil = await db.query(`select full_name from public.profiles where id = $1`, [nuevoId]);
      assert.equal(perfil.rows.length, 1, 'el hook handle_new_user no creo el perfil');

      const edicion = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(db, `update public.profiles set bio = $1 where id = $2 returning id`, [
          'Ensenio tarot desde 2019.',
          ID.teacherA,
        ]),
      );
      assert.equal(edicion.ok, true, edicion.message);
      assert.equal(edicion.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });
  });

  // ---------------------------------------------------------------- perfil
  describe('perfil', () => {
    test(`profiles_avatar_path_guard · ${CASOS.profiles_avatar_path_guard}`, async () => {
      await db.exec(`reset role;`);
      // El alta real: insertar en auth.users y dejar que handle_new_user cree la fila (T-036).
      const alta = await attempt(db, `insert into auth.users (id, email) values ($1, $2) returning id`, [
        '10000000-0000-4000-8000-0000000000f1',
        'avatar-alta@humano.test',
      ]);
      assert.equal(alta.ok, true, `el alta no paso el guard: ${alta.message}`);

      const propio = `avatars/${ID.student}/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.png`;
      const poner = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(db, `update public.profiles set avatar_path = $1 where id = $2 returning avatar_path`, [
          propio,
          ID.student,
        ]),
      );
      assert.equal(poner.ok, true, `la alumna no pudo poner su avatar: ${poner.message}`);
      assert.equal(poner.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');

      const sacar = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
        attempt(db, `update public.profiles set avatar_path = null where id = $1 returning id`, [ID.student]),
      );
      assert.equal(sacar.ok, true, `la alumna no pudo sacar su avatar: ${sacar.message}`);
      assert.equal(sacar.rows.length, 1);
    });
  });

  // ---------------------------------------------------------------- q&a (T-030)
  // Antes de certificados: el ultimo caso de alla borra a la alumna, autora de la pregunta del seed.
  describe('q&a por leccion (T-030) · lo legitimo pasa', () => {
    const ALUMNA = { sub: ID.student, userRole: 'student' };
    const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
    let preguntaId;
    let respuestaId;

    test(`lesson_questions_derive_scope · ${CASOS.lesson_questions_derive_scope}`, async () => {
      const r = await asUser(db, ALUMNA, () =>
        attempt(
          db,
          `insert into public.lesson_questions (lesson_id, author_id, title, body)
           values ($1, $2, 'Una duda', 'Sobre el minuto 3') returning id, course_id`,
          [ID.lessonA, ID.student],
        ),
      );
      assert.equal(r.ok, true, `la alumna no pudo preguntar: ${r.message}`);
      assert.equal(r.rows[0].course_id, ID.courseA, 'el curso no salio de la leccion');
      preguntaId = r.rows[0].id;
    });

    test(`lesson_questions_locator_guard · ${CASOS.lesson_questions_locator_guard}`, async () => {
      const r = await asUser(db, ALUMNA, () =>
        attempt(
          db,
          `insert into public.lesson_questions (lesson_id, author_id, title, body)
           values ($1, $2, 'Sobre el video', 'Cada leccion es un video corto y hay material para bajar.') returning id`,
          [ID.lessonA, ID.student],
        ),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });

    test(`lesson_questions_guard · ${CASOS.lesson_questions_guard}`, async () => {
      const resolver = await asUser(db, ALUMNA, () =>
        attempt(db, `update public.lesson_questions set resolved_at = now() where id = $1 returning resolved_by`, [preguntaId]),
      );
      assert.equal(resolver.ok, true, `la autora no pudo resolver: ${resolver.message}`);
      assert.equal(resolver.rows[0].resolved_by, ID.student);

      await db.exec(`reset role;`);
      const otra = (
        await db.query(
          `insert into public.lesson_questions (lesson_id, course_id, author_id, title, body)
           values ($1, $2, $3, 'Para moderar', 'Fuera de tema') returning id`,
          [ID.lessonA, ID.courseA, ID.student],
        )
      ).rows[0];
      const moderar = await asUser(db, DUENA, () =>
        attempt(
          db,
          `update public.lesson_questions set deleted_at = now(), deleted_by = $1, deleted_reason = 'fuera de tema'
            where id = $2 returning id`,
          [ID.teacherA, otra.id],
        ),
      );
      assert.equal(moderar.ok, true, `la duena no pudo moderar: ${moderar.message}`);
      assert.equal(moderar.rows.length, 1, 'el UPDATE no alcanzo ninguna fila');
    });

    test(`lesson_answers_derive_scope · ${CASOS.lesson_answers_derive_scope}`, async () => {
      const r = await asUser(db, DUENA, () =>
        attempt(
          db,
          `insert into public.lesson_answers (question_id, author_id, body)
           values ($1, $2, 'Es una pausa, no una caida.') returning id, lesson_id, is_instructor_answer`,
          [ID.questionA, ID.teacherA],
        ),
      );
      assert.equal(r.ok, true, `la docente no pudo responder: ${r.message}`);
      assert.equal(r.rows[0].is_instructor_answer, true);
      assert.equal(r.rows[0].lesson_id, ID.lessonA);
      respuestaId = r.rows[0].id;
    });

    test(`lesson_answers_guard · ${CASOS.lesson_answers_guard}`, async () => {
      const r = await asUser(db, DUENA, () =>
        attempt(db, `update public.lesson_answers set featured_at = now() where id = $1 returning featured_by`, [respuestaId]),
      );
      assert.equal(r.ok, true, `la duena no pudo destacar: ${r.message}`);
      assert.equal(r.rows[0].featured_by, ID.teacherA);
      await db.exec(`reset role;`);
      await db.query(`update public.lesson_answers set featured_at = null, featured_by = null where id = $1`, [respuestaId]);
    });

    test(`lesson_answers_locator_guard · ${CASOS.lesson_answers_locator_guard}`, async () => {
      const r = await asUser(db, ALUMNA, () =>
        attempt(
          db,
          `insert into public.lesson_answers (question_id, author_id, body)
           values ($1, $2, 'Yo lo vi en el video de la clase 2.') returning id`,
          [ID.questionA, ID.student],
        ),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows.length, 1);
    });
  });

  // ---------------------------------------------------------------- certificados
  //
  // VAN AL FINAL A PROPOSITO: el caso de inmutabilidad BORRA `ID.student`, que es la autora de la
  // resena del seed, la duena del progreso y la inscripta de courseA. Corriendolo antes, todos los
  // casos de arriba se quedan sin fila y darian `ok: true` sobre cero registros.
  describe('T-049 · invitaciones', () => {
    test(`teacher_invitations_guard · ${CASOS.teacher_invitations_guard}`, async () => {
      const ADMIN_T049 = '30490000-0000-4000-8000-000000000001';
      const INVITADA_T049 = '10490000-0000-4000-8000-0000000000aa';
      await db.exec(`reset role;
        insert into auth.users (id, email, email_confirmed_at) values
          ('${ADMIN_T049}', 'admin-t049@humano.test', now()),
          ('${INVITADA_T049}', 'invitada-t049@humano.test', now());
        update public.profiles set role = 'admin' where id = '${ADMIN_T049}';`);

      const crear = (email, hash) =>
        attempt(db, `insert into public.teacher_invitations (email, token_hash, invited_by) values ($1, $2, $3) returning id`, [
          email,
          hash,
          ADMIN_T049,
        ]);
      const a = await crear('invitada-t049@humano.test', 'a'.repeat(64));
      assert.equal(a.ok, true, `service_role no pudo invitar: ${a.message}`);
      const b = await crear('otra-t049@humano.test', 'b'.repeat(64));
      assert.equal(b.ok, true, b.message);

      const revocar = await attempt(db, `update public.teacher_invitations set revoked_at = now(), revoked_by = $1 where id = $2`, [
        ADMIN_T049,
        b.rows[0].id,
      ]);
      assert.equal(revocar.ok, true, `service_role no pudo revocar: ${revocar.message}`);

      const aceptar = await attempt(db, `select public.accept_teacher_invitation($1, $2) as ok`, ['a'.repeat(64), INVITADA_T049]);
      assert.equal(aceptar.ok, true, `la aceptacion no corrio: ${aceptar.message}`);
      assert.equal(aceptar.rows[0].ok, true, 'la aceptacion legitima devolvio false');

      // El bug de 0017 en esta tabla: on delete set null contra un CHECK simetrico.
      const borrar = await attempt(db, `delete from auth.users where id in ($1, $2)`, [ADMIN_T049, INVITADA_T049]);
      assert.equal(borrar.ok, true, `borrar las cuentas quedo bloqueado: ${borrar.message}`);
      const [fila] = (
        await db.query(`select invited_by, accepted_by, accepted_at from public.teacher_invitations where id = $1`, [a.rows[0].id])
      ).rows;
      assert.equal(fila.invited_by, null);
      assert.equal(fila.accepted_by, null);
      assert.notEqual(fila.accepted_at, null, 'perder la cuenta borro el hecho de que se acepto');
    });
  });

  describe('certificados · van ultimos porque el segundo borra al alumno del seed', () => {
    test(`certificates_guard_insert · ${CASOS.certificates_guard_insert}`, async () => {
      await db.exec(`reset role;`);
      // PRECONDICION, no asercion. Completar un curso exige TIEMPO DE RELOJ REAL: el guard de
      // 0009 no rechaza un salto grande, lo RECORTA (`least(new, old + tope)`), asi que ninguna
      // escritura puede declarar el curso completo de una. `seed.sql` resuelve exactamente esto
      // con `session_replication_role = replica`, que deshabilita los triggers de la sesion sin
      // tocar RLS ni los CHECKs — se usa el mismo mecanismo y por el mismo motivo.
      //
      // Deshabilitar el guard del PROGRESO para montar el estado no debilita este caso: lo que
      // se prueba aca es `certificates_guard_insert`, y el guard de progreso tiene sus dos casos
      // propios mas arriba.
      const lecciones = (
        await db.query(
          `select id, duration_seconds from public.lessons where course_id = $1 and is_published`,
          [ID.courseA],
        )
      ).rows;
      assert.ok(lecciones.length > 0, 'el seed no tiene lecciones publicadas en courseA');

      await db.exec(`set session_replication_role = replica;`);
      try {
        for (const l of lecciones) {
          await db.query(
            `insert into public.lesson_progress
               (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
             values ($1, $2, $3, $4, true, now(), now())
             on conflict (user_id, lesson_id) do update
               set seconds_watched = excluded.seconds_watched,
                   completed = true, completed_at = now()`,
            [ID.student, ID.courseA, l.id, l.duration_seconds],
          );
        }
      } finally {
        await db.exec(`set session_replication_role = origin;`);
      }

      const r = await attempt(
        db,
        `insert into public.certificates (user_id, course_id, code) values ($1, $2, $3) returning id`,
        [ID.student, ID.courseA, 't036-codigo-de-prueba'],
      );
      assert.equal(r.ok, true, `service_role no pudo emitir un certificado legitimo: ${r.message}`);
    });

    test(`certificates_guard_immutable · ${CASOS.certificates_guard_immutable}`, async () => {
      // La cadena real: borrar `auth.users` cascadea a `profiles`, y de ahi el `on delete set
      // null` de `certificates.user_id` dispara un UPDATE sobre una fila que el guard de
      // inmutabilidad ve. Antes de 0017 ese UPDATE se rechazaba y la cuenta quedaba imborrable.
      await db.exec(`reset role;`);
      const r = await attempt(db, `delete from auth.users where id = $1`, [ID.student]);
      assert.equal(
        r.ok,
        true,
        `el guard de inmutabilidad bloquea el on-delete-set-null (bug de 0017): ${r.message}`,
      );
    });
  });
  // ---------------------------------------------------------------- meta-control
  // Este caso prueba LA META-ASERCION, no un guard. Sin el, el archivo protege el presente y nada
  // mas: el dia que alguien agregue un trigger sin caso, el aviso tiene que saltar.
  //
  // SIN transaccion, y no es un descuido: es la leccion de T-035. Cuando algo falla dentro de un
  // BEGIN explicito, Postgres aborta la transaccion y el `reset role` de limpieza revienta con
  // 25P02, arrastrando al caso siguiente. El drop explicito es ademas mas legible.
  test('meta · un trigger nuevo sin caso hace fallar la meta-asercion', async () => {
    await db.exec(`reset role;`);
    await db.exec(`
      create trigger t036_trigger_intruso before update on public.lessons
      for each row execute function public.guard_locator_exacto('title');
    `);
    try {
      const enLaDb = await triggersDeLaDb(db);
      const declarados = new Set([...Object.keys(CASOS), ...EXENTOS_NO_BLOQUEAN]);
      const huerfanos = enLaDb.filter((t) => !declarados.has(t));
      assert.deepEqual(
        huerfanos,
        ['t036_trigger_intruso'],
        'la meta-asercion no detecto un trigger nuevo sin caso — no protege nada',
      );
    } finally {
      await db.exec(`reset role;`);
      await db.exec(`drop trigger if exists t036_trigger_intruso on public.lessons;`);
    }
  });
});

// T-037 · la cadena de 0017 sobre `course_reviews`: borrar la cuenta del admin que oculto una
// resena dispara `on delete set null` sobre `hidden_by`, y el CHECK del trio lo rechazaba. Medido
// en rojo el 2026-10-21 (23514 course_reviews_hidden_consistency).
describe('ADR-011 · borrar la cuenta del admin que modero no queda bloqueado', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test(`course_review_reports_guard · ${CASOS.course_review_reports_guard}`, async () => {
    await db.exec(`reset role;`);
    const [{ id: review }] = (await db.query(`select id from public.course_reviews where course_id = $1`, [ID.courseA])).rows;
    const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `insert into public.course_review_reports (review_id, reporter_id, reason) values ($1, $2, $3)`, [
        review, ID.teacherA, 'Insulta a otra alumna por su nombre.',
      ]),
    );
    assert.equal(r.ok, true, `la guia no pudo reportar: ${r.message}`);
    await db.exec(`reset role;`);
    await db.query(
      `update public.course_review_reports set resolved_at = now(), resolved_by = $1, resolution = 'desestimada' where review_id = $2`,
      [ID.admin, review],
    );
    // El borrado del admin lo hace el caso siguiente (hidden_by); aca se deja el reporte resuelto
    // por el admin para que ese mismo DELETE pruebe tambien el set null de resolved_by.
  });

  test('course_reviews · on delete set null de hidden_by', async () => {
    await db.exec(`reset role;`);
    await db.query(
      `update public.course_reviews set hidden_at = now(), hidden_by = $1, hidden_reason = 'spam' where course_id = $2`,
      [ID.admin, ID.courseA],
    );
    const r = await attempt(db, `delete from auth.users where id = $1`, [ID.admin]);
    assert.equal(r.ok, true, `la cuenta del admin que oculto quedo imborrable: ${r.message}`);
    const [rep] = (await db.query(`select resolved_at, resolved_by, resolution from public.course_review_reports`)).rows;
    assert.equal(rep.resolved_by, null, 'resolved_by no se anulo');
    assert.equal(rep.resolution, 'desestimada', 'se perdio la resolucion al borrar a quien resolvio');
    const [fila] = (await db.query(`select hidden_at, hidden_by, hidden_reason from public.course_reviews where course_id = $1`, [ID.courseA])).rows;
    assert.notEqual(fila.hidden_at, null, 'la resena se desoculto al borrar a quien la oculto');
    assert.equal(fila.hidden_by, null);
    assert.equal(fila.hidden_reason, 'spam');
  });
});

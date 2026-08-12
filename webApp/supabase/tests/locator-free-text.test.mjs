// T-016 · El localizador republicado en la columna de al lado — TEST DE MUTACION REAL.
//
// EL DEFECTO, reproducido en vivo contra PostgREST antes de escribir una linea:
//     PATCH /rest/v1/lesson_resources?id=eq.<propio>
//     {"name":"Manual — drive.google.com/file/d/LEAKED123"}   => HTTP 204, el valor queda
// `url` y `drive_file_id` son de service_role (ADR-003 regla A) pero `name` es texto libre que
// la docente escribe y que `anon` lee sin inscripcion a proposito (el "que incluye el curso").
// El esquema esconde el localizador en una columna y lo publica en la de al lado.
//
// Mismo estandar que las otras dos suites: `SET ROLE` + claims en `request.jwt.claims`, como los
// deja PostgREST. El bloque final revierte UNA cosa por vez y afirma que el ataque vuelve a pasar.
//
// Lo que este archivo tiene de distinto: el caso 5 no afirma sobre una LISTA de columnas sino
// sobre el INVARIANTE de la clase (leccion de T-014 c.adicional). Si mañana alguien suma una
// columna de texto libre al whitelist de SELECT de `anon` y se olvida del CHECK, se pone rojo.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const PRIV_DENIED = '42501';

const asOwnerTeacher = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

// El ataque textual del ticket, y sus variantes por si alguien "arregla" el nombre a mano.
const LOCALIZADORES = [
  ['url pegada tal cual',        'https://drive.google.com/file/d/LEAKED123/view'],
  ['url sin esquema',            'Manual — drive.google.com/file/d/LEAKED123'],
  ['esquema pelado, otro host',  'Material: ftp://archivos.humano/manual.pdf'],
  ['www sin esquema',            'Manual completo en www.humano-archivos.net'],
  ['acortador',                  'Descarga: bit.ly/3xKmQ2p'],
  ['youtube corto',              'Clase completa youtu.be/dQw4w9WgXcQ'],
  ['telegram',                   'Pedilo por t.me/humanocanal'],
  ['id de Drive suelto (44)',    'Manual 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'],
  ['id de Drive suelto (28)',    'Manual 0B7l3RHEZ8bC9dGVKLW5aVXpDSDQ'],
];

// Los nombres REALES con los que la docente bautiza sus archivos. Un patron que rompa
// cualquiera de estos hace que el ticket termine revertido: son el otro lado del equilibrio.
const NOMBRES_LEGITIMOS = [
  'Manual v2.1',
  'Bibliografía cap. IV',
  'Meditación 20 min',
  'Cuaderno de trabajo',
  'Guía nº 3 · ejercicios.pdf',
  'Audio · respiración 4-7-8',
  'Tirada de tres cartas (versión 2026)',
  'Módulo I — Introducción a la práctica',
  'Ritual-de-Luna-Nueva-Enero2026',
  'El Loco invertido, Jodorowsky & Costa',
];

const TAMANOS_LEGITIMOS = ['2.4 MB', '12 págs.', '48:31', '1,2 GB'];

/**
 * Las columnas alcanzadas por la restriccion, con la sentencia que las escribe desde el rol
 * que efectivamente puede hacerlo. Es la lista del barrido de criterio 2 (ver ADR-009).
 */
const COLUMNAS = [
  ['lesson_resources.name',        (v) => [`update public.lesson_resources set name = $1 where id = $2`, [v, ID.resourceA]]],
  ['lesson_resources.size_label',  (v) => [`update public.lesson_resources set size_label = $1 where id = $2`, [v, ID.resourceA]]],
  ['lessons.title',                (v) => [`update public.lessons set title = $1 where id = $2`, [v, ID.lessonA]]],
  ['lessons.description',          (v) => [`update public.lessons set description = $1 where id = $2`, [v, ID.lessonA]]],
  ['course_modules.title',         (v) => [`update public.course_modules set title = $1 where id = $2`, [v, ID.moduleA]]],
  ['course_modules.description',   (v) => [`update public.course_modules set description = $1 where id = $2`, [v, ID.moduleA]]],
  ['lesson_chapters.label',        (v) => [`update public.lesson_chapters set label = $1 where id = $2`, [v, ID.chapterPreview]]],
  ['courses.slug',                 (v) => [`update public.courses set slug = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.title',                (v) => [`update public.courses set title = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.title_em',             (v) => [`update public.courses set title_em = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.subtitle',             (v) => [`update public.courses set subtitle = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.intro',                (v) => [`update public.courses set intro = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.discipline',           (v) => [`update public.courses set discipline = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.level',                (v) => [`update public.courses set level = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.roman_num',            (v) => [`update public.courses set roman_num = $1 where id = $2`, [v, ID.courseA]]],
  // Encontrada por el caso 5 de este mismo archivo, no por la lectura del esquema: la primera
  // version del barrido a mano se la habia salteado. Es exactamente el olvido que el invariante existe para atrapar.
  ['courses.moon_glyph',           (v) => [`update public.courses set moon_glyph = $1 where id = $2`, [v, ID.courseA]]],
  ['courses.includes',             (v) => [`update public.courses set includes = array['Acceso de por vida', $1] where id = $2`, [v, ID.courseA]]],
  ['profiles.full_name',           (v) => [`update public.profiles set full_name = $1 where id = $2`, [v, ID.teacherA]]],
  ['profiles.slug',                (v) => [`update public.profiles set slug = $1 where id = $2`, [v, ID.teacherA]]],
  ['profiles.glyph',               (v) => [`update public.profiles set glyph = $1 where id = $2`, [v, ID.teacherA]]],
  ['profiles.bio',                 (v) => [`update public.profiles set bio = $1 where id = $2`, [v, ID.teacherA]]],
  // T-017 · agregadas junto con la ficha publica de la docente (0011): misma clase que `bio` --
  // texto libre, escrito por la propia docente, legible por `anon` sin inscripcion.
  ['profiles.headline',            (v) => [`update public.profiles set headline = $1 where id = $2`, [v, ID.teacherA]]],
  ['profiles.location',            (v) => [`update public.profiles set location = $1 where id = $2`, [v, ID.teacherA]]],
  ['profiles.quote',               (v) => [`update public.profiles set quote = $1 where id = $2`, [v, ID.teacherA]]],
  // T-022 · Diario. `slug`/`title`/`excerpt` son metadata corta de catalogo, misma clase que
  // `courses.*`. `body` queda deliberadamente AFUERA de esta lista — ver EXENTAS_POR_GUARD y la
  // nota larga de la migracion 0018: lo protege `guard_diario_posts` (coincidencia exacta contra
  // los localizadores reales, sin falsos positivos en un link legitimo), no la heuristica de forma.
  ['diario_posts.slug',            (v) => [`update public.diario_posts set slug = $1 where id = $2`, [v, ID.postA]]],
  ['diario_posts.title',           (v) => [`update public.diario_posts set title = $1 where id = $2`, [v, ID.postA]]],
  ['diario_posts.excerpt',         (v) => [`update public.diario_posts set excerpt = $1 where id = $2`, [v, ID.postA]]],
];

/**
 * EL INVARIANTE, medido sobre el catalogo y no sobre una lista escrita a mano:
 * toda columna de TEXTO LIBRE que el cliente puede ESCRIBIR y que `anon` puede LEER
 * (o sea: legible sin inscripcion) tiene que estar cubierta por un CHECK `*_no_locator`.
 */
const columnasDeLaClase = async (db) =>
  (
    await db.query(`
      with cols as (
        select c.relname as tabla, a.attname as col, c.oid as reloid, a.attnum
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        where c.relkind = 'r'
          and format_type(a.atttypid, a.atttypmod) ~ 'text|char'
      )
      select tabla || '.' || col as columna,
             exists (
               select 1 from pg_constraint k
               where k.conrelid = cols.reloid
                 and k.contype = 'c'
                 and k.conname like '%\\_no\\_locator'
                 and cols.attnum = any (k.conkey)
             ) as cubierta
      from cols
      where has_column_privilege('anon', reloid, attnum, 'SELECT')
        and (has_column_privilege('authenticated', reloid, attnum, 'UPDATE')
          or has_column_privilege('authenticated', reloid, attnum, 'INSERT'))
      order by 1
    `)
  ).rows;

// Unica excepcion admitida: columnas cuyo dominio ya esta cerrado por un CHECK de enumeracion,
// donde "texto libre" es falso. Se enumeran a mano para que agregar una exija justificarla.
const EXENTAS_POR_ENUM = ['courses.currency', 'lesson_resources.type', 'lessons.video_provider'];

// T-022 · Segunda excepcion admitida, con motivo distinto: la columna ES texto libre de la
// clase (anon la lee, la docente la escribe) pero deliberadamente NO lleva la heuristica de
// FORMA (`text_has_locator`) porque bloquearia todo link, y un post de blog es justo el lugar
// donde un link legitimo pertenece — a diferencia de `lesson_resources.name` o `courses.intro`,
// que nunca lo necesitan. La protege otro mecanismo de la MISMA adr (ADR-009/0016): un guard con
// coincidencia EXACTA contra los localizadores reales (`body_has_known_locator`, ya usado por
// `campus_posts.body`), sin bypass de service_role — invariante, no permiso. Ver la nota larga
// en la migracion 0018 para el razonamiento completo, incluida la comparacion con el precedente.
const EXENTAS_POR_GUARD = ['diario_posts.body'];

describe('T-016 · ningun texto libre del catalogo acepta un localizador', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ---------------------------------------------------------------- 1 · el defecto reportado
  describe('el PATCH exacto del ticket', () => {
    test('la docente DUEÑA no puede republicar el link en `name`', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lesson_resources set name = $1 where id = $2`, [
          'Manual — drive.google.com/file/d/LEAKED123',
          ID.resourceA,
        ]),
      );
      assert.equal(r.ok, false, 'el localizador se publico en la columna de catalogo');
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('el nombre sembrado no se movio', async () => {
      const r = await db.query(`select name from public.lesson_resources where id = $1`, [ID.resourceA]);
      assert.equal(r.rows[0].name, 'Cuaderno de trabajo');
    });

    test('tampoco en `size_label`', async () => {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lesson_resources set size_label = $1 where id = $2`, [
          'https://drive.google.com/file/d/LEAKED123',
          ID.resourceA,
        ]),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('ni el INSERT con service_role: el invariante no tiene puerta trasera', async () => {
      // A diferencia de los guards de 0005/0006, que arbitran un permiso y por eso llevan bypass
      // de is_service_context(). Un Server Action tiene la columna `url` para el localizador.
      const r = await asService(db, () =>
        attempt(
          db,
          `insert into public.lesson_resources (course_id, lesson_id, position, type, name, url)
           values ($1, $2, 9, 'pdf', $3, 'https://drive.google.com/file/d/OTRO')`,
          [ID.courseA, ID.lessonA, 'Manual — drive.google.com/file/d/LEAKED123'],
        ),
      );
      assert.equal(r.ok, false, 'service_role puede sembrar el localizador en el catalogo');
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });

  // ---------------------------------------------------------------- 2 · vectores
  describe('las formas del localizador', () => {
    for (const [rotulo, valor] of LOCALIZADORES) {
      test(`rechaza ${rotulo}`, async () => {
        const r = await asOwnerTeacher(db, () =>
          attempt(db, `update public.lesson_resources set name = $1 where id = $2`, [valor, ID.resourceA]),
        );
        assert.equal(r.ok, false, `paso: ${valor}`);
        assert.equal(r.code, CHECK_VIOLATION);
      });
    }
  });

  // ---------------------------------------------------------------- 3 · control positivo
  // El otro lado del equilibrio: un patron goloso rompe el trabajo de la docente y el ticket
  // se revierte. Estos casos valen tanto como los de arriba.
  describe('control positivo · la docente sigue nombrando sus archivos', () => {
    for (const nombre of NOMBRES_LEGITIMOS) {
      test(`acepta "${nombre}"`, async () => {
        const r = await asOwnerTeacher(db, () =>
          attempt(db, `update public.lesson_resources set name = $1 where id = $2`, [nombre, ID.resourceA]),
        );
        assert.equal(r.ok, true, r.message);
      });
    }

    for (const tam of TAMANOS_LEGITIMOS) {
      test(`acepta el tamaño "${tam}"`, async () => {
        const r = await asOwnerTeacher(db, () =>
          attempt(db, `update public.lesson_resources set size_label = $1 where id = $2`, [tam, ID.resourceA]),
        );
        assert.equal(r.ok, true, r.message);
      });
    }

    test('y el catalogo se sigue leyendo sin inscripcion (ADR-003: la fila es catalogo)', async () => {
      await db.query(`update public.lesson_resources set name = 'Cuaderno de trabajo' where id = $1`, [
        ID.resourceA,
      ]);
      const r = await asAnon(db, () =>
        attempt(db, `select name, type, size_label from public.lesson_resources where id = $1`, [ID.resourceA]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].name, 'Cuaderno de trabajo');
    });

    test('el alta legitima de un recurso por service_role sigue funcionando', async () => {
      const r = await asService(db, () =>
        attempt(
          db,
          `insert into public.lesson_resources (course_id, lesson_id, position, type, name, url, size_label)
           values ($1, $2, 7, 'pdf', 'Manual v2.1', 'https://drive.google.com/file/d/OK', '2.4 MB')`,
          [ID.courseA, ID.lessonA],
        ),
      );
      assert.equal(r.ok, true, r.message);
      await db.query(`delete from public.lesson_resources where position = 7 and lesson_id = $1`, [ID.lessonA]);
    });
  });

  // ---------------------------------------------------------------- 4 · el barrido (criterio 2)
  describe('barrido de la clase · toda columna de la lista rechaza el localizador', () => {
    for (const [columna, sentencia] of COLUMNAS) {
      test(columna, async () => {
        const [sql, params] = sentencia('Manual — drive.google.com/file/d/LEAKED123');
        const r = await asOwnerTeacher(db, () => attempt(db, sql, params));
        assert.equal(r.ok, false, `${columna} acepta un localizador`);
        assert.equal(r.code, CHECK_VIOLATION, `${columna} fallo por otra razon: ${r.message}`);
      });
    }
  });

  // ---------------------------------------------------------------- 5 · el invariante
  describe('el invariante, no la lista', () => {
    test('toda columna de texto libre escribible por el cliente y legible por anon esta cubierta', async () => {
      const descubiertas = (await columnasDeLaClase(db))
        .filter((c) => !c.cubierta)
        .map((c) => c.columna);
      assert.deepEqual(
        descubiertas.sort(),
        [...EXENTAS_POR_ENUM, ...EXENTAS_POR_GUARD].sort(),
        'hay texto libre de catalogo sin CHECK de localizador (o una exencion sin justificar)',
      );
    });

    test('la lista del barrido y el catalogo dicen lo mismo', async () => {
      const cubiertas = (await columnasDeLaClase(db)).filter((c) => c.cubierta).map((c) => c.columna);
      assert.deepEqual(cubiertas, COLUMNAS.map(([c]) => c).sort());
    });
  });
});

// =====================================================================================
// CONTROLES DE MUTACION.
// Cada uno revierte UNA sola cosa y comprueba que el ataque vuelve a pasar. Sin esto, los
// verdes de arriba no distinguen "el CHECK lo detiene" de "el UPDATE estaba mal escrito".
// =====================================================================================
describe('T-016 · controles de mutacion', () => {
  test('c.1 · revirtiendo SOLO el CHECK de `name`, el PATCH del ticket vuelve a pasar y el link se lee sin inscripcion', async () => {
    const { db } = await bootDatabase({
      afterMigrations: [
        `alter table public.lesson_resources drop constraint lesson_resources_name_no_locator;`,
      ],
    });
    await seed(db);

    const FUGA = 'Manual — drive.google.com/file/d/LEAKED123';
    const r = await asOwnerTeacher(db, () =>
      attempt(db, `update public.lesson_resources set name = $1 where id = $2`, [FUGA, ID.resourceA]),
    );
    assert.equal(r.ok, true, 'no era el CHECK lo que detenia el ataque');

    // El valor queda guardado — y lo lee cualquiera, sin JWT y sin inscripcion. Eso ES la fuga:
    // el localizador que `drive_file_id`/`url` esconden, republicado en la columna de catalogo.
    const anon = await asAnon(db, () =>
      attempt(db, `select name from public.lesson_resources where id = $1`, [ID.resourceA]),
    );
    assert.equal(anon.rows[0].name, FUGA);

    // Y el resto de las capas sigue en pie: no es que se hayan caido todas juntas.
    const localizador = await asAnon(db, () =>
      attempt(db, `select url from public.lesson_resources where id = $1`, [ID.resourceA]),
    );
    assert.equal(localizador.ok, false);
    assert.equal(localizador.code, PRIV_DENIED);
    await db.close();
  });

  test('c.2 · revirtiendo SOLO el CHECK de `includes`, el "que incluye el curso" publica el link', async () => {
    // El gemelo semantico de `name`: mismo rol escribiendo, misma vista de catalogo leyendo.
    const { db } = await bootDatabase({
      afterMigrations: [`alter table public.courses drop constraint courses_includes_no_locator;`],
    });
    await seed(db);
    const r = await asOwnerTeacher(db, () =>
      attempt(
        db,
        `update public.courses set includes = array['Manual: drive.google.com/file/d/LEAKED123'] where id = $1`,
        [ID.courseA],
      ),
    );
    assert.equal(r.ok, true, 'no era el CHECK lo que lo detenia');
    const anon = await asAnon(db, () =>
      attempt(db, `select includes from public.courses where id = $1`, [ID.courseA]),
    );
    assert.match(anon.rows[0].includes[0], /drive\.google\.com/);
    await db.close();
  });

  test('c.3 · sin el GRANT EXECUTE, el camino legitimo de la docente muere en el CHECK', async () => {
    // El riesgo simetrico del fix, y la razon por la que ese grant no es decorativo: la expresion
    // de un CHECK se evalua con los privilegios de QUIEN ESCRIBE, igual que `is_service_context()`
    // dentro de un guard INVOKER (0005:161). Sin el grant, renombrar un PDF da 42501.
    const { db } = await bootDatabase({
      afterMigrations: [
        `revoke execute on function public.text_has_locator(text) from authenticated;`,
      ],
    });
    await seed(db);
    const r = await asOwnerTeacher(db, () =>
      attempt(db, `update public.lesson_resources set name = $1 where id = $2`, ['Manual v2.1', ID.resourceA]),
    );
    assert.equal(r.ok, false, 'el grant de EXECUTE no era lo que sostenia el camino legitimo');
    assert.equal(r.code, PRIV_DENIED);
    await db.close();
  });

  test('c.4 · el invariante detecta una columna nueva de catalogo sin su CHECK', async () => {
    // La prueba de que el caso 5 no es vacuo: se agrega texto libre al whitelist de `anon`
    // y al de UPDATE de `authenticated`, sin CHECK — exactamente el olvido que tiene que atrapar.
    const { db } = await bootDatabase({
      afterMigrations: [
        `alter table public.lesson_resources add column caption text;
         grant select (caption) on public.lesson_resources to anon, authenticated;
         grant update (caption) on public.lesson_resources to authenticated;`,
      ],
    });
    const descubiertas = (await columnasDeLaClase(db)).filter((c) => !c.cubierta).map((c) => c.columna);
    assert.ok(
      descubiertas.includes('lesson_resources.caption'),
      'el barrido estructural no ve una columna nueva: seria vacuo',
    );
    await db.close();
  });

  test('c.5 · el control positivo no es vacuo: un patron goloso rompe los nombres reales', async () => {
    // La otra forma de fallar este ticket. Se instala el patron "cualquier punto o cualquier
    // corrida larga" —la version golosa que uno escribe de primera— y se mide contra los nombres
    // que la docente usa de verdad: si el control positivo de arriba no distinguiera, seria adorno.
    // El swap va DESPUES del seed a proposito: el patron goloso ni siquiera deja sembrar el
    // catalogo (los slugs con guion caen en la corrida de 11+), que ya es evidencia de lo suyo.
    const { db } = await bootDatabase();
    await seed(db);
    await db.exec(
      `create or replace function public.text_has_locator(v text) returns boolean
       language sql immutable set search_path = '' as $fn$
         select v ~* '[[:alnum:]]\\.[[:alnum:]]' or v ~ '[A-Za-z0-9_-]{11,}';
       $fn$;`,
    );
    const rotos = [];
    for (const nombre of NOMBRES_LEGITIMOS) {
      const r = await asOwnerTeacher(db, () =>
        attempt(db, `update public.lesson_resources set name = $1 where id = $2`, [nombre, ID.resourceA]),
      );
      if (!r.ok) rotos.push(nombre);
    }
    assert.ok(rotos.length >= 4, `el patron goloso solo rompio ${rotos.length} nombres legitimos`);
    assert.ok(rotos.includes('Manual v2.1'), '"Manual v2.1" es el caso testigo del falso positivo');
    await db.close();
  });
});

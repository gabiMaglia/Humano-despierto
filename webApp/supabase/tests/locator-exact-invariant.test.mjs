// ADR-010 · La mitad EXACTA de ADR-009 tambien tiene invariante.
//
// POR QUE EXISTE. ADR-009 se defiende con dos mecanismos: `text_has_locator` (la FORMA de un
// localizador, en un CHECK) y `body_has_known_locator` (COINCIDENCIA EXACTA contra los valores
// reales de `lessons.video_id` y `lesson_resources`, en un guard trigger -- no puede ir en un
// CHECK porque lee otras tablas).
//
// `locator-free-text.test.mjs` tiene invariante para la primera. Para la segunda NO HABIA
// NINGUNO: se aplicaba tabla por tabla, a quien se acordara. Consecuencia medida: `courses.intro`
// acepto durante meses el video_id real de una leccion paga -- servido a `anon` sin sesion por
// PostgREST -- CON el invariante de forma en verde, porque el CHECK si estaba. Eso es S-05.
//
// POR QUE PRUEBA EN VEZ DE CONSULTAR EL CATALOGO. De un CHECK se puede preguntar a
// `pg_constraint.conkey` que columnas toca. De un trigger plpgsql no: habria que parsear
// `pg_proc.prosrc`, y `guard_courses_locator` recorre un `array[...]` que ningun parser razonable
// veria. El proyecto ya enfrento esta disyuntiva en `locator-parity.test.mjs` y la resolvio
// igual: ejecutar la funcion real en vez de leer su fuente.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { columnasDeLaClase } from './locator-columns.mjs';
import { seed, ID, SECRET } from './seed.mjs';

// Quien escribe cada tabla en la realidad. El barrido de la mitad 1 nacio asumiendo que TODO el
// catalogo lo escribe la docente, y T-028 rompio esa asuncion (`course_reviews.body` lo escribe
// la alumna). Este test nace con el actor explicito -- es la correccion que ya se pago una vez.
const ACTOR_POR_TABLA = {
  courses:          { sub: ID.teacherA, userRole: 'teacher' },
  course_modules:   { sub: ID.teacherA, userRole: 'teacher' },
  lessons:          { sub: ID.teacherA, userRole: 'teacher' },
  lesson_resources: { sub: ID.teacherA, userRole: 'teacher' },
  lesson_chapters:  { sub: ID.teacherA, userRole: 'teacher' },
  diario_posts:     { sub: ID.teacherA, userRole: 'teacher' },
  profiles:         { sub: ID.teacherA, userRole: 'teacher' },
  course_reviews:   { sub: ID.student, userRole: 'student' },
};

// Como alcanzar UNA fila de cada tabla, escribible por su actor. Sin fila el UPDATE afecta cero
// registros y pasa trivialmente -- el modo de falla vacuo que este proyecto ya arrastro dos veces.
const FILA_POR_TABLA = {
  courses:          () => [`id = $1`, [ID.courseA]],
  course_modules:   () => [`id = $1`, [ID.moduleA]],
  lessons:          () => [`id = $1`, [ID.lessonA]],
  lesson_resources: () => [`id = $1`, [ID.resourceA]],
  lesson_chapters:  () => [`id = $1`, [ID.chapterA]],
  diario_posts:     () => [`id = $1`, [ID.postA]],
  profiles:         () => [`id = $1`, [ID.teacherA]],
  course_reviews:   () => [`user_id = $1 and course_id = $2`, [ID.student, ID.courseA]],
};

// Unica excepcion admitida, y se justifica por entrada. NO se agrega una sin escribir por que.
const EXENTAS_DE_COINCIDENCIA_EXACTA = [
  // Dominio cerrado por regex: `char(2)` con CHECK `^[a-z]{2}$`. No cabe un localizador.
  'courses.language',
  // Dominio cerrado: `^[A-Z]{3}$`.
  'courses.currency',
  // Dominio cerrado por enumeracion.
  'lesson_resources.type',
  'lessons.video_provider',
  // EXENCION QUE NO ES OBVIA Y POR ESO SE ESCRIBE: `promo_video_id` acepta, POR DISENO, un id de
  // YouTube de 11 caracteres (CHECK `^[A-Za-z0-9_-]{11}$`, T-027). Si una docente pone ahi el
  // video_id de una leccion suya, el formato lo permite -- y esta bien que lo permita: un video
  // promocional ES un video de YouTube, y bloquear los que existen en el catalogo le impediria
  // usar como adelanto un fragmento que tambien es leccion. La exencion es deliberada.
  'courses.promo_video_id',
];

// Columnas de tipo text[]. El ataque tiene que ir DENTRO del array, no en lugar de el, o se
// estaria probando otra cosa: el CHECK/guard de ADR-009 evalua POR ELEMENTO.
const COLUMNAS_ARRAY = ['includes', 'learning_objectives', 'prerequisites'];

// Los dos localizadores reales del seed. `videoId` son 11 caracteres sin forma de URL: es
// exactamente lo que `text_has_locator` deja pasar por construccion, y la razon de ser de la
// mitad exacta.
const PAYLOADS = [
  ['video_id de una leccion paga', (v) => `Mira esta clase: ${v}`, SECRET.videoId],
  ['drive_file_id de un recurso', (v) => `El material esta en ${v}`, SECRET.driveFileId],
];

describe('ADR-010 · ninguna columna de la clase acepta un localizador REAL', () => {
  let db;
  let columnas;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    columnas = await columnasDeLaClase(db);
  });

  after(async () => db?.close());

  test('la clase no esta vacia — control de que el recorte sigue vivo', () => {
    assert.ok(
      columnas.length >= 20,
      `la consulta devolvio ${columnas.length} columnas; algo se rompio en el recorte`,
    );
  });

  test('toda tabla de la clase tiene actor y fila declarados', () => {
    const tablas = [...new Set(columnas.map((c) => c.columna.split('.')[0]))].sort();
    const sinActor = tablas.filter((t) => !ACTOR_POR_TABLA[t] || !FILA_POR_TABLA[t]);
    assert.deepEqual(
      sinActor,
      [],
      `tablas en la clase sin actor/fila declarados: ${sinActor.join(', ')}. ` +
        `Aparecio una tabla nueva y nadie la declaro — ese es el punto de este test.`,
    );
  });

  test('barrido · ninguna columna de la clase acepta el localizador real', async () => {
    const aceptaron = [];

    for (const { columna } of columnas) {
      if (EXENTAS_DE_COINCIDENCIA_EXACTA.includes(columna)) continue;
      const [tabla, col] = columna.split('.');
      const actor = ACTOR_POR_TABLA[tabla];
      const [where, params] = FILA_POR_TABLA[tabla]();

      for (const [, construir, valor] of PAYLOADS) {
        const texto = construir(valor);
        const esArray = COLUMNAS_ARRAY.includes(col);
        const sql = esArray
          ? `update public.${tabla} set ${col} = array[$${params.length + 1}::text] where ${where}`
          : `update public.${tabla} set ${col} = $${params.length + 1} where ${where}`;

        const r = await asUser(db, actor, () => attempt(db, sql, [...params, texto]));

        // `ok: true` con CERO filas afectadas NO prueba nada: el UPDATE no llego a ninguna fila.
        // Sin este chequeo, una columna sin blanco se reporta como cubierta -- que es el modo de
        // falla vacuo que este proyecto ya arrastro dos veces (1e96950, ba8f6cb).
        if (r.ok) {
          await db.exec(`reset role;`);
          const q = await db.query(
            `select count(*)::int as n from public.${tabla} where ${col}::text like $1`,
            [`%${valor}%`],
          );
          aceptaron.push(
            q.rows[0].n > 0
              ? `${columna} (${valor})`
              : `${columna} — ATAQUE VACUO: el UPDATE no alcanzo ninguna fila`,
          );
          // Deshacer para no contaminar las columnas siguientes. Puede fallar en columnas NOT
          // NULL y no importa: importa que se intente.
          await db
            .query(`update public.${tabla} set ${col} = null where ${col}::text like $1`, [`%${valor}%`])
            .catch(() => {});
        }
      }
    }

    assert.deepEqual(
      aceptaron.sort(),
      [],
      `columnas SIN cobertura de coincidencia exacta:\n  ${aceptaron.sort().join('\n  ')}`,
    );
  });
});

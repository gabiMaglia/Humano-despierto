# T-035 · El invariante de ADR-009 cubre sus dos mitades — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ninguna columna de texto legible por `anon` pueda contener el localizador real de un contenido pago, y que un test lo verifique enumerando desde el catálogo en vez de una lista escrita a mano.

**Architecture:** Un test nuevo (`locator-exact-invariant.test.mjs`) lee de `pg_attribute` toda columna de la clase, intenta escribir en cada una el localizador real del seed con el actor que realmente la escribe, y falla si alguna acepta. Las tablas que hoy fallan se cubren con un guard trigger en una migración nueva, siguiendo el patrón de `guard_courses_locator` (`0023`).

**Tech Stack:** Postgres 17 (Supabase) · PGlite 0.5 para tests · `node --test` (sin framework) · bash + curl para el harness B-1.

**Spec:** `docs/superpowers/specs/2026-09-10-adr-010-invariante-dos-mitades.md` · Autoridad: **ADR-010** en `engram/02_architecture.md`

---

## AVISO AL EJECUTOR — leer antes del Task 1

**Este ticket no es "escribir un test y ver qué pasa". La fuga ya está confirmada, viva y medida** el 2026-09-10 contra el stack local:

```
UPDATE public.lessons SET title = 'Mira: TLkA0RELQ1g'   → UPDATE 1   (aceptado)
GET /rest/v1/lessons?select=title  (apikey anon, SIN sesión)
  → [{"title":"Mira: TLkA0RELQ1g"}]
```

`TLkA0RELQ1g` es el `video_id` real de una lección paga del seed. **Seis columnas en tres tablas
están demostrablemente descubiertas**, y las otras dos tablas de la lista casi con seguridad
también (no se pudieron probar: el seed no tiene filas de `lesson_resources` ni de
`lesson_chapters` para ese curso).

Es peor que S-05, que fue el mismo bug en `courses`: **los títulos de lección se muestran en el
acordeón de currículum a cualquier visitante sin sesión**, así que no hace falta ni consultar la
API para verlos.

Así que el orden del plan es deliberado: **primero el test que expone todo (Task 1-2), después
las migraciones que cierran (Task 3-4)**. Un invariante que se escribe después de arreglar no
prueba que el arreglo hiciera algo.

## Global Constraints

- **La migración de este ticket:** `20260910110000_0025_locator_exact_all_tables.sql`. El **nombre
  entero** lo fija este plan, no sólo el número: Supabase indexa por el timestamp del prefijo y el
  timestamp tiene que ascender junto con el número. Última aplicada: `20260909130000` (0024).
- **R-1 · Grants como whitelist.** Este ticket no agrega columnas, así que no toca grants. Si
  llegara a hacer falta, se agregan a mano en la migración que crea la columna (patrón de `0011` y
  `0023`), **nunca** en `0003`, que corre antes.
- **Toda migración que crea funciones termina con `revoke execute on all functions in schema public
  from public;`** — regla de `0005:153` / `0006:233`. `rls-mutation.test.mjs` lo verifica y va a
  fallar si falta.
- **Toda función con `EXECUTE` para `anon`/`authenticated` se declara y justifica a mano** en
  `tests/rls-mutation.test.mjs` (`ESPERADO_ANON` / `ESPERADO_AUTH`). Este ticket **no debería**
  necesitarlo: `body_has_known_locator` ya tiene su `EXECUTE` desde `0016`.
- **Verificadores del gate:** `cd webApp/supabase && npm test` · `bash webApp/supabase/harness/b1-postgrest-attacks.sh` · `bash webApp/scripts/check-adr004.sh <url>` (con `COOKIE=`) · `bash webApp/scripts/check-seo.sh <url>`.
- **Sin comentarios salvo que el POR QUÉ no sea obvio.** El proyecto comenta el porqué, no el qué.
- Base de partida: **422 tests, 24 migraciones**. El total nuevo se documenta en cada commit.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `webApp/supabase/tests/locator-columns.mjs` | **Crear.** Un solo lugar donde se define "la clase". Hoy la consulta vive dentro de `locator-free-text.test.mjs`; dos tests la necesitan y duplicarla es cómo una dice que sí y la otra que no. |
| `webApp/supabase/tests/locator-free-text.test.mjs` | **Modificar.** Importa la consulta del módulo nuevo en vez de definirla. Sin cambio de comportamiento. |
| `webApp/supabase/tests/locator-exact-invariant.test.mjs` | **Crear.** El invariante de la mitad exacta. Archivo propio: `locator-free-text` ya tiene 600 líneas y dos listas de excepción con semánticas distintas. |
| `webApp/supabase/tests/seed.mjs` | **Modificar.** Sembrar `lesson_resources` y `lesson_chapters` del curso de `teacherA`, hoy ausentes — sin filas, el barrido corre contra cero y pasa trivialmente. |
| `webApp/supabase/migrations/20260910110000_0025_locator_exact_all_tables.sql` | **Crear.** Guards de coincidencia exacta en las tablas descubiertas. |
| `webApp/supabase/harness/b1-postgrest-attacks.sh` | **Modificar.** El ataque sobre PostgREST real (R-6). |

---

## Task 1: Extraer la definición de "la clase" a un módulo propio

**Files:**
- Create: `webApp/supabase/tests/locator-columns.mjs`
- Modify: `webApp/supabase/tests/locator-free-text.test.mjs` (la constante `columnasDeLaClase`)

**Interfaces:**
- Consumes: nada.
- Produces: `columnasDeLaClase(db) → Promise<Array<{columna: string, cubierta: boolean}>>` — `columna` con formato `"tabla.col"`, `cubierta` = tiene un `CHECK` cuyo nombre termina en `_no_locator` que la incluye. Lo consumen Task 2 y `locator-free-text.test.mjs`.

**Por qué esta tarea existe:** dos tests van a necesitar la misma definición de "columna de texto que
`anon` lee y el cliente escribe". Si cada uno tiene la suya, tarde o temprano una incluye una tabla
que la otra no, y el invariante deja de serlo sin que nadie lo note.

- [ ] **Step 1: Crear el módulo con la consulta EXACTA que ya existe**

Copiar la consulta **sin modificarla** desde `locator-free-text.test.mjs`. Cualquier cambio acá
altera qué cubre el invariante de la mitad 1, y eso no es parte de este ticket.

Crear `webApp/supabase/tests/locator-columns.mjs`:

```js
// ADR-009 · La definicion de "columna de texto libre del catalogo", en UN solo lugar.
//
// POR QUE ESTE ARCHIVO EXISTE. La mitad de FORMA (locator-free-text.test.mjs) y la mitad EXACTA
// (locator-exact-invariant.test.mjs) necesitan la MISMA lista de columnas. Con una copia en cada
// archivo, el dia que alguien ajuste el recorte en uno los dos invariantes dejan de hablar de lo
// mismo -- y un invariante que cubre distinto que el otro no es un invariante, es una opinion.
//
// El recorte: columnas de texto que `anon` puede LEER y un rol de cliente puede ESCRIBIR. Esa
// conjuncion es la clase de riesgo de ADR-009: si `anon` no la lee, no hay fuga; si el cliente no
// la escribe, no hay vector.

/**
 * @param {import('@electric-sql/pglite').PGlite} db
 * @returns {Promise<Array<{columna: string, cubierta: boolean}>>}
 *   `columna` con formato "tabla.col". `cubierta` indica si un CHECK `%_no_locator` la incluye
 *   -- es la mitad de FORMA. La mitad EXACTA no se puede leer del catalogo (vive en un trigger
 *   plpgsql), y por eso su invariante la PRUEBA en vez de consultarla.
 */
export const columnasDeLaClase = async (db) =>
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
                 and k.conname like '%\\\\_no\\\\_locator'
                 and cols.attnum = any (k.conkey)
             ) as cubierta
      from cols
      where has_column_privilege('anon', reloid, attnum, 'SELECT')
        and (has_column_privilege('authenticated', reloid, attnum, 'UPDATE')
          or has_column_privilege('authenticated', reloid, attnum, 'INSERT'))
      order by 1
    `)
  ).rows;
```

**Cuidado con el escape.** En el archivo original el patrón es `'%\\_no\\_locator'` dentro de un
template literal de JS. Al copiar, **verificar carácter por carácter** que el SQL que llega a
Postgres sea `like '%\_no\_locator'`. Si el escape se rompe, `_` pasa a ser comodín, el `like`
empieza a matchear de más y el invariante se vuelve permisivo **en silencio**. El Step 3 lo detecta.

- [ ] **Step 2: Apuntar `locator-free-text.test.mjs` al módulo**

Borrar la definición local de `columnasDeLaClase` (unas 27 líneas) y agregar el import junto a los
otros:

```js
import { columnasDeLaClase } from './locator-columns.mjs';
```

Las tres llamadas del archivo no cambian: misma firma, mismo resultado.

- [ ] **Step 3: Verificar que NADA cambió de comportamiento**

```bash
cd webApp/supabase && node --test tests/locator-free-text.test.mjs 2>&1 | tail -5
```
Esperado: **68 pass, 0 fail** — exactamente el mismo número que antes de esta tarea. Un número
distinto significa que el recorte cambió, y este Step es el único momento en que se puede detectar.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/tests/locator-columns.mjs webApp/supabase/tests/locator-free-text.test.mjs
git commit -m "refactor(test): la definicion de 'columna de la clase' pasa a modulo propio

Las dos mitades de ADR-009 necesitan la MISMA lista. Con una copia en cada
archivo, el dia que alguien ajuste el recorte los dos invariantes dejan de
hablar de lo mismo. Sin cambio de comportamiento: 68/68 igual que antes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Sembrar las filas que hoy faltan

**Files:**
- Modify: `webApp/supabase/tests/seed.mjs`

**Interfaces:**
- Consumes: `ID` y `SECRET` del propio `seed.mjs`.
- Produces: filas de `lesson_resources` y `lesson_chapters` bajo `ID.courseA`, alcanzables por el
  actor `teacherA`. Las consume Task 3.

**Por qué esta tarea existe y va ANTES del invariante:** el seed **ya tiene** `ID.resourceA` y
`ID.chapterA`, pero al intentar el ataque contra ellos desde el actor dueño del curso de prueba, el
`update ... where id = ...` puede afectar **cero filas y pasar trivialmente**. Es el modo de falla
vacuo que este proyecto ya arrastró dos veces (`1e96950`, `ba8f6cb`). Un invariante que corre contra
cero filas es peor que no tenerlo: da verde y tranquiliza.

- [ ] **Step 1: Verificar qué hay realmente sembrado**

**No asumir.** Correr:

```bash
cd webApp/supabase && node -e '
import("./harness/db.mjs").then(async (H) => {
  const s = await import("./tests/seed.mjs");
  const { db } = await H.bootDatabase();
  await s.seed(db);
  for (const t of ["lesson_resources", "lesson_chapters", "course_modules", "lessons"]) {
    const r = await db.query(`select count(*)::int as n from public.${t}`);
    console.log(t, "→", r.rows[0].n, "filas");
  }
  await db.close();
});'
```

Anotar los números. Si `lesson_resources` y `lesson_chapters` ya tienen filas **bajo `ID.courseA`**,
esta tarea se reduce a confirmarlo y el Step 2 no hace falta — dejarlo escrito en el commit.

- [ ] **Step 2: Sembrar lo que falte, bajo `ID.courseA`**

Sólo si el Step 1 mostró que faltan. Agregar en `seed.mjs`, **antes** del `insert` de
`course_reviews` que ya existe:

```sql
    -- T-035 · el invariante de coincidencia exacta ataca CADA columna de la clase, y un UPDATE
    -- contra cero filas pasa trivialmente. Estas filas existen para que el ataque tenga blanco.
    insert into public.lesson_chapters (id, lesson_id, position, start_seconds, label) values
      ('${ID.chapterA}', '${ID.lessonA}', 1, 0, 'Apertura del arcano')
    on conflict (id) do nothing;
```

**Ajustar los nombres de columna a los reales**: leer primero
`grep -A12 'create table public.lesson_chapters' migrations/*0001*.sql`. **No inventar la forma de
la tabla** — si `start_seconds` se llama distinto, el `insert` falla y el seed entero se cae.

Lo mismo para `lesson_resources` si falta, usando `ID.resourceA`, `ID.lessonA`, `ID.courseA` y
`SECRET.driveFileId`/`SECRET.url` — que es como el seed ya siembra ese recurso hoy.

- [ ] **Step 3: Verificar que el seed sigue en pie**

```bash
cd webApp/supabase && npm test 2>&1 | tail -5
```
Esperado: **422 pass, 0 fail**. Sembrar filas nuevas puede romper tests que cuentan cosas — si algo
falla acá, **es un test que dependía del número exacto de filas** y hay que mirarlo, no ajustarlo a
ciegas.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/tests/seed.mjs
git commit -m "test(seed): filas de capitulos y recursos bajo courseA

El invariante de T-035 ataca cada columna de la clase, y un UPDATE contra cero
filas pasa trivialmente — el modo de falla vacuo que este proyecto ya arrastro
dos veces (1e96950, ba8f6cb).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: El invariante — y ver la fuga en rojo

**Files:**
- Create: `webApp/supabase/tests/locator-exact-invariant.test.mjs`

**Interfaces:**
- Consumes: `columnasDeLaClase(db)` de Task 1 · `bootDatabase`, `asUser`, `attempt` de
  `../harness/db.mjs` · `seed`, `ID`, `SECRET` de `./seed.mjs`.
- Produces: nada que otra tarea consuma. Task 4 lo usa como criterio de éxito.

**Esta tarea DEBE terminar en rojo.** Es su producto. Si al final del Step 4 el test pasa, algo está
mal escrito — la fuga está confirmada y medida.

- [ ] **Step 1: Escribir el archivo**

```js
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
  courses:           { sub: ID.teacherA, userRole: 'teacher' },
  course_modules:    { sub: ID.teacherA, userRole: 'teacher' },
  lessons:           { sub: ID.teacherA, userRole: 'teacher' },
  lesson_resources:  { sub: ID.teacherA, userRole: 'teacher' },
  lesson_chapters:   { sub: ID.teacherA, userRole: 'teacher' },
  diario_posts:      { sub: ID.teacherA, userRole: 'teacher' },
  profiles:          { sub: ID.teacherA, userRole: 'teacher' },
  course_reviews:    { sub: ID.student,  userRole: 'student' },
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

// Los dos localizadores reales del seed. `videoId` son 11 caracteres sin forma de URL: es
// exactamente lo que `text_has_locator` deja pasar por construccion, y la razon de ser de la
// mitad exacta.
const PAYLOADS = [
  ['video_id de una leccion paga', (v) => `Mira esta clase: ${v}`, SECRET.videoId],
  ['drive_file_id de un recurso',  (v) => `El material esta en ${v}`, SECRET.driveFileId],
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

  // El barrido entra aca, en el Step 2.
});
```

**La trampa que resuelve el Step 2, y conviene saberla antes de escribir:** `columnas` se llena en
el `before`, pero `node:test` registra los `test(...)` cuando **evalúa el archivo**, o sea antes.
No se puede iterar `columnas` para generar un caso por columna.

La salida es un **único `test` que recorre todas las columnas y acumula las fallas** — que es
exactamente lo que hace el invariante de la mitad 1 (`el invariante, no la lista`), así que es el
patrón del proyecto y no una invención. La alternativa —levantar la base a nivel de módulo con
`await` de nivel superior— queda descartada: el resto de la suite no lo hace así y obliga a manejar
el cierre a mano.

- [ ] **Step 2: El barrido**

Agregar dentro del `describe` principal, donde el Step 1 dejó el comentario:

```js
  test('barrido · ninguna columna de la clase acepta el localizador real', async () => {
    const aceptaron = [];

    for (const { columna } of columnas) {
      if (EXENTAS_DE_COINCIDENCIA_EXACTA.includes(columna)) continue;
      const [tabla, col] = columna.split('.');
      const actor = ACTOR_POR_TABLA[tabla];
      const [where, params] = FILA_POR_TABLA[tabla]();

      for (const [, construir, valor] of PAYLOADS) {
        const texto = construir(valor);
        // El tipo real importa: `includes`, `learning_objectives` y `prerequisites` son text[] y
        // hay que atacarlos DENTRO del array, no en lugar de el, o se estaria probando otra cosa.
        const esArray = ['includes', 'learning_objectives', 'prerequisites'].includes(col);
        const sql = esArray
          ? `update public.${tabla} set ${col} = array[$${params.length + 1}::text] where ${where}`
          : `update public.${tabla} set ${col} = $${params.length + 1} where ${where}`;

        const r = await asUser(db, actor, () => attempt(db, sql, [...params, texto]));

        // `ok: true` con cero filas afectadas NO prueba nada: el UPDATE no llego a ninguna fila.
        if (r.ok) {
          const afectadas = await db.query(
            `select count(*)::int as n from public.${tabla} where ${col}::text like $1`,
            [`%${valor}%`],
          );
          if (afectadas.rows[0].n > 0) aceptaron.push(`${columna} (${valor})`);
          else aceptaron.push(`${columna} — ATAQUE VACUO: el UPDATE no alcanzo ninguna fila`);
          // Deshacer para no contaminar las columnas siguientes.
          await db.exec(`reset role;`);
          await db.query(`update public.${tabla} set ${col} = null where ${col}::text like $1`, [
            `%${valor}%`,
          ]).catch(() => {});
        }
      }
    }

    assert.deepEqual(
      aceptaron.sort(),
      [],
      `columnas SIN cobertura de coincidencia exacta:\n  ${aceptaron.sort().join('\n  ')}`,
    );
  });
```

**El chequeo de filas afectadas es la parte que impide el falso verde.** Sin él, una columna cuyo
`where` no alcanza ninguna fila se reporta como "cubierta" cuando en realidad no se probó nada —
y ése es el modo de falla que este proyecto ya tuvo dos veces.

**El `update ... set col = null` del deshacer va a fallar en columnas `not null`.** Está atrapado con
`.catch(() => {})` a propósito: no importa que el deshacer falle, importa que se intente. Si eso
resulta contaminar corridas siguientes, la salida es sembrar la base de nuevo entre payloads, no
quitar el chequeo.

- [ ] **Step 3: Correr y VER LA FUGA**

```bash
cd webApp/supabase && node --test tests/locator-exact-invariant.test.mjs 2>&1 | tail -25
```

**Esperado: FALLA**, con una lista que incluye al menos:

```
columnas SIN cobertura de coincidencia exacta:
  course_modules.description (TLkA0RELQ1g)
  course_modules.title (TLkA0RELQ1g)
  lesson_chapters.label (...)
  lesson_resources.name (...)
  lesson_resources.size_label (...)
  lessons.description (...)
  lessons.title (...)
  profiles.bio (...)
  profiles.full_name (...)
  ...
```

**Si el test PASA en este punto, está mal escrito.** La fuga fue reproducida el 2026-09-10 contra
el stack local con `UPDATE 1` y lectura por `anon`. Volver al Step 2 antes de seguir.

**Anotar la lista exacta**: es el alcance del Task 4.

- [ ] **Step 4: Contar las tablas y decidir si seguir**

```bash
# De la lista del Step 3, contar tablas distintas.
```

**Si son más de cinco tablas: PARAR y avisar al PO.** Con esa cantidad, repetir el mismo `plpgsql`
en cada una deja de ser la respuesta correcta y conviene una función de guard genérica —
`public.guard_locator_exacto()` que lea `TG_ARGV` con los nombres de columna. **Esa decisión no se
toma sola**, y la spec lo dice explícitamente.

Con cinco o menos, seguir al Task 4.

- [ ] **Step 5: Commit del test en rojo**

Commitear un test que falla es deliberado acá: **deja la fuga registrada en el historial** y hace
que el Task 4 tenga que demostrar que la cerró.

```bash
git add webApp/supabase/tests/locator-exact-invariant.test.mjs
git commit -m "test(db): invariante de la mitad EXACTA de ADR-009 — EN ROJO A PROPOSITO

Expone la fuga que ADR-010 predijo. Reproducida antes de escribirlo:
  UPDATE public.lessons SET title = 'Mira: <video_id real>'  → UPDATE 1
  GET /rest/v1/lessons?select=title  (anon, sin sesion)      → lo devuelve

Peor que S-05: los titulos de leccion se muestran en el acordeon de curriculum
a cualquier visitante, asi que no hace falta ni consultar la API.

Enumera desde el catalogo, no de una lista escrita a mano — esa es la parte que
impide que vuelva a pasar. El siguiente commit lo pone en verde.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Cerrar la fuga

**Files:**
- Create: `webApp/supabase/migrations/20260910110000_0025_locator_exact_all_tables.sql`

**Interfaces:**
- Consumes: `public.body_has_known_locator(text)` de `0016` — ya existe y ya tiene su `EXECUTE`.
- Produces: un guard trigger por cada tabla de la lista del Task 3 Step 3.

- [ ] **Step 1: Escribir la migración**

Un guard por tabla, siguiendo **exactamente** el patrón de `guard_courses_locator` (`0023`). Las
columnas de cada guard salen de la lista real del Task 3, **no de este plan** — si el Task 3 encontró
una columna que acá no figura, va igual.

```sql
-- T-035 · ADR-010 · la coincidencia exacta cubre TODA la clase, no las tablas que alguien recordo.
--
-- POR QUE ESTE ARCHIVO EXISTE. `body_has_known_locator` -- la mitad de ADR-009 que compara contra
-- los valores REALES de `lessons.video_id` y `lesson_resources` -- se aplico a `campus_posts`
-- (0016), `diario_posts` (0018/0020), `courses` (0023, por S-05) y `course_reviews` (0024). Nunca
-- se aplico al resto, y nadie lo noto porque el invariante que existia cubria la otra mitad.
--
-- Reproducido antes de escribir esto, contra el stack local:
--   update public.lessons set title = 'Mira: <video_id real>'  → UPDATE 1
--   GET /rest/v1/lessons?select=title  (anon, sin sesion)      → lo devuelve
-- Es peor que S-05: `lessons.title` se MUESTRA en el acordeon de curriculum a cualquier visitante.
--
-- SIN BYPASS DE service_role, en todos. ADR-011: invariante ⇒ sin bypass, permiso ⇒ con bypass.
-- Un localizador pago en texto publico no puede ser verdad NUNCA, lo escriba quien lo escriba.
-- Es el mismo criterio con el que `guard_diario_posts` no lo tiene.

create or replace function public.guard_lessons_locator()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare campo text;
begin
  foreach campo in array array[coalesce(new.title, ''), coalesce(new.description, '')] loop
    if public.body_has_known_locator(campo) then
      raise exception 'un campo publico de lessons contiene un localizador de contenido pago'
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

create trigger lessons_locator_guard
  before insert or update on public.lessons
  for each row execute function public.guard_lessons_locator();
```

Repetir la misma forma para:

| Tabla | Columnas del guard |
|---|---|
| `lessons` | `title`, `description` |
| `course_modules` | `title`, `description` |
| `lesson_chapters` | `label` |
| `lesson_resources` | `name`, `size_label` |
| `profiles` | `full_name`, `bio`, `slug`, `glyph`, `headline`, `location`, `quote` |

**Cuidado con `lessons`:** ya tiene un trigger llamado `lessons_guard` (de `0005`/`0012`). El nuevo
se llama `lessons_locator_guard` para no pisarlo. **Postgres dispara los triggers `BEFORE` por orden
alfabético de nombre**, así que `lessons_guard` corre antes que `lessons_locator_guard` — sin
consecuencia acá, porque ninguno depende de lo que hace el otro, pero conviene saberlo.

**Cuidado con `profiles`:** es la tabla más delicada del esquema. Su guard existente
(`profiles_guard`) protege el rol, y el hook `handle_new_user` inserta filas ahí en el alta de
cuenta. **Verificar en el Step 3 que registrarse sigue funcionando** — es exactamente el tipo de
operación legítima que ADR-011 dice que hay que probar.

Cerrar el archivo con la regla del proyecto:

```sql
-- Regla de 0005:153 / 0006:233 — toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
```

- [ ] **Step 2: Aplicar y ver el invariante en VERDE**

```bash
cd webApp && npx supabase db reset 2>&1 | tail -3
cd supabase && node --test tests/locator-exact-invariant.test.mjs 2>&1 | tail -6
```
Esperado: **0 fail**. Si queda alguna columna en la lista, falta su guard — volver al Step 1.

- [ ] **Step 3: Probar los caminos LEGÍTIMOS (ADR-011, pregunta 1)**

Los guards nuevos son `BEFORE INSERT OR UPDATE` sobre tablas centrales. **Un guard que sólo se
prueba con ataques da verde mientras rompe la función** — es el bug de `0017` y de `0024`.

```bash
cd webApp/supabase && npm test 2>&1 | tail -6
```
Esperado: **422 + los nuevos, 0 fail**.

Y a mano, los tres que ningún test cubre hoy:

```bash
# 1 · Registrarse sigue funcionando (handle_new_user inserta en profiles).
curl -s -X POST "http://127.0.0.1:54321/auth/v1/signup" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"t035-prueba@test.local","password":"Passw0rd!123"}' | head -c 200
# 2 · La docente renombra una leccion con prosa normal.
# 3 · service_role carga video_id y duracion y publica una leccion (T-005 c.4b).
```

Los tres tienen que pasar. **Si alguno falla, es un bug vivo introducido por esta migración** y se
arregla acá, no después.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/migrations
git commit -m "feat(db): la coincidencia exacta de ADR-009 cubre toda la clase (T-035)

Cierra la fuga que el commit anterior dejo en rojo. Guards nuevos en lessons,
course_modules, lesson_chapters, lesson_resources y profiles.

Sin bypass de service_role en ninguno (ADR-011): un localizador pago en texto
publico no puede ser verdad NUNCA, lo escriba quien lo escriba. Mismo criterio
que guard_diario_posts.

Caminos legitimos verificados a mano ademas de la suite: registrarse (el hook
inserta en profiles), renombrar una leccion, y la carga de video por
service_role. Es la leccion de 0017 y 0024 — un guard probado solo por el lado
del ataque da verde mientras rompe la funcion.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: El ataque sobre PostgREST real

**Files:**
- Modify: `webApp/supabase/harness/b1-postgrest-attacks.sh`

**Interfaces:**
- Consumes: la app servida y la instancia de Supabase local.
- Produces: cobertura de R-6 sobre la superficie que PGlite **no** ejercita (A-01 de la auditoría).

**Por qué:** PGlite no corre PostgREST. Los tests de Task 3 prueban el motor; esto prueba el camino
HTTP real, que es donde la fuga se materializó.

- [ ] **Step 1: Leer el patrón existente y copiarlo**

```bash
cd webApp/supabase && grep -n "s5)" -B4 -A6 harness/b1-postgrest-attacks.sh
```
El bloque `(s5*)` de T-027 es el modelo exacto. El harness siembra una lección con
`video_id = 'SECRETVIDEO'` y expone `$LEC`, `$MOD`, `$REC`, `$DOCENTE_JWT`.

- [ ] **Step 2: Sumar los ataques**

Después del bloque `(s5*)`, agregando **un control positivo** en la misma corrida:

```bash
echo ""
echo "── T-035 · el localizador EXACTO en el resto del catalogo (ADR-010)"
# Los (s5*) cubren `courses`. Estos cubren las tablas que quedaron afuera hasta 0025 y por las que
# `SECRETVIDEO` salia a `anon` sin sesion. `lessons.title` es el peor: se MUESTRA en el acordeon.
esperar "(t35a) video_id en el titulo de leccion"  403 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"title":"Clase SECRETVIDEO"}'
esperar "(t35b) video_id en la descripcion"        403 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"description":"Ver SECRETVIDEO"}'
esperar "(t35c) video_id en el titulo de modulo"   403 PATCH "course_modules?id=eq.$MOD"   "$DOCENTE_JWT" '{"title":"Modulo SECRETVIDEO"}'
esperar "(t35d) video_id en el nombre del recurso" 403 PATCH "lesson_resources?id=eq.$REC" "$DOCENTE_JWT" '{"name":"Manual SECRETVIDEO"}'
esperar "(t35e) video_id en la bio publica"        403 PATCH "profiles?id=eq.$DOCENTE"     "$DOCENTE_JWT" '{"bio":"Mi clase SECRETVIDEO"}'
# Control positivo: sin esto, un guard que rechace TODO tambien daria verde arriba.
esperar "(t35+) titulo legitimo de leccion"        204 PATCH "lessons?id=eq.$LEC"          "$DOCENTE_JWT" '{"title":"Clase 3 — los arcanos menores"}'
```

- [ ] **Step 3: Correr el harness**

```bash
bash webApp/supabase/harness/b1-postgrest-attacks.sh 2>&1 | grep -E "t35|B-1 "
```
Esperado: los cinco ataques rechazados, el control positivo en `204`, y `B-1 OK`.

**Si alguno da `400` en vez de `403`**, mirar el cuerpo antes de cambiar la expectativa: `400`
significa que la columna no está en ningún grant —una protección **más** fuerte— y entonces la
expectativa se ajusta **con el comentario que explica por qué**, como se hizo con `(r3)`/`(r4)` en
T-028.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/harness
git commit -m "test(b1): el localizador exacto en el resto del catalogo, sobre PostgREST real

Con control positivo en la misma corrida: un titulo legitimo tiene que dar 204,
o un guard goloso daria verde igual.

Esta es la superficie que PGlite NO ejercita (A-01 de la auditoria).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: El control negativo — que el invariante sepa fallar

**Files:**
- Modify: `webApp/supabase/tests/locator-exact-invariant.test.mjs`

**Por qué:** un verificador que nunca se vio en rojo no prueba nada. Es la disciplina que el resto de
la suite ya sigue — `locator-parity-meta.test.mjs` existe exactamente por esto.

- [ ] **Step 1: Agregar el caso de mutación**

Al final del `describe` principal:

```js
  // Sin esto, el verde de arriba no distingue "cubierto" de "el ataque estaba mal escrito".
  // Revierte UNA capa y exige que el ataque vuelva a pasar. En transaccion: no toca la base.
  test('mutacion · sin el guard de lessons, el localizador entra', async () => {
    await db.exec(`reset role; begin;`);
    try {
      await db.exec(`drop trigger lessons_locator_guard on public.lessons;`);
      const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
        attempt(db, `update public.lessons set title = $1 where id = $2`, [
          `Mira: ${SECRET.videoId}`,
          ID.lessonA,
        ]),
      );
      assert.equal(
        r.ok,
        true,
        'sin el trigger el ataque DEBERIA pasar; si no pasa, este test no esta probando el trigger',
      );
    } finally {
      await db.exec(`reset role; rollback;`);
    }
  });

  // Control positivo: un guard goloso que rechace todo tambien daria verde en el barrido.
  test('prosa legitima con la palabra "video" no se bloquea', async () => {
    const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `update public.lessons set description = $1 where id = $2`, [
        'Cada leccion es un video corto y hay material para bajar.',
        ID.lessonA,
      ]),
    );
    assert.equal(r.ok, true, `falso positivo: ${r.message}`);
  });
```

**El `rollback` es obligatorio.** Sin él, el `drop trigger` sobrevive y todos los casos que corran
después dan verde sobre una base desprotegida.

- [ ] **Step 2: Verificar que el caso de mutación sabe fallar**

Es el meta-control. Comentar el `drop trigger` momentáneamente y correr: el caso tiene que **fallar**
(el ataque no pasa porque el guard sigue puesto). Descomentarlo después.

```bash
cd webApp/supabase && node --test tests/locator-exact-invariant.test.mjs 2>&1 | tail -6
```

- [ ] **Step 3: Suite completa**

```bash
cd webApp/supabase && npm test 2>&1 | tail -6
```
Esperado: 0 fail. **Anotar el total** para el commit.

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/tests/locator-exact-invariant.test.mjs
git commit -m "test(db): control de mutacion y control positivo del invariante exacto

Revierte el guard de lessons en una transaccion y exige que el ataque vuelva a
pasar. Sin esto, el verde no distingue 'cubierto' de 'el ataque estaba mal
escrito'. Mas un control positivo: prosa con la palabra 'video' no se bloquea.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Gate final

```bash
cd webApp/supabase && npm test
bash webApp/supabase/harness/b1-postgrest-attacks.sh
COOKIE="<cookie>" bash webApp/scripts/check-adr004.sh http://localhost:3000
bash webApp/scripts/check-seo.sh http://localhost:3000
cd webApp && npx tsc --noEmit && npm run lint
```

Los cinco en verde, **más el recorrido a mano** que ningún verificador hace:

1. **Registrarse con una cuenta nueva.** `profiles` recibió un guard y el hook de alta escribe ahí.
2. **La docente crea una lección y la renombra** desde su panel.
3. **La docente pega el `video_id` de una lección del catálogo en el título de otra** → tiene que
   ver un error, y hay que mirar **cuál**: si es un `42501` crudo del motor en vez de un mensaje
   legible, falta traducirlo en el Server Action, igual que se hizo en T-027.

El punto 3 es el que cierra el círculo: el guard protege la base, pero si la docente ve un error
ininteligible, el arreglo está a medias.

## Cobertura de los criterios de la spec

| Criterio ADR-010 | Task |
|---|---|
| 1 · enumera desde el catálogo, sin lista de tablas a mano | 1, 3 |
| 2 · ataca con el localizador real y el actor correcto | 3 |
| 3 · exenciones justificadas por entrada | 3 |
| 4 · control negativo verificado en rojo | 3 (Step 3), 6 |
| 5 · control positivo, prosa legítima no se bloquea | 6 |
| 6 · lo descubierto se cubre en este mismo ticket | 4 |
| 7 · `npm test` en verde con el total documentado | 6 |
| R-6 · ataques sobre PostgREST real | 5 |

## Riesgos declarados

**`profiles` es la tabla más delicada del esquema.** Un guard ahí toca el alta de cuenta. El Task 4
Step 3 lo prueba explícitamente; si falla, **no** relajar el guard: mirar por qué el hook escribe un
valor que el guard rechaza.

**Puede aparecer un falso positivo.** `body_has_known_locator` exige 8+ caracteres, pero
`SECRET.driveFileId` del seed es `'DRIVEFILEIDSECRETO'` — una cadena que podría aparecer por
casualidad en otro texto del seed. Si el barrido reporta una columna que **no** debería estar
descubierta, revisar primero si es esto antes de escribirle un guard.

**El costo en tiempo.** El barrido hace hasta 2 escrituras por columna sobre ~33 columnas no exentas,
y cada una invoca una función `security definer` que consulta dos tablas. La suite tarda hoy 75
segundos. Si esto la lleva más allá de dos minutos, la salida **no** es reducir la cobertura sino
reordenar: un solo payload en el barrido y el segundo sólo en las tablas de mayor riesgo.

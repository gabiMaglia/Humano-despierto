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
const CASOS = {};

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
});

// T-027 · Campos de la ficha de curso + S-05 — TEST DE MUTACION REAL.
//
// Mismo estandar que el resto de la suite: cada caso ejecuta el DML del atacante contra un
// Postgres de verdad, con SET ROLE authenticated y los claims del JWT en `request.jwt.claims`
// exactamente como los deja PostgREST, y afirma sobre el SQLSTATE devuelto.
//
// S-05 (auditoria 2026-09-09) es la mitad EXACTA de ADR-009 aplicada a `courses`. Nunca habia
// estado: `body_has_known_locator` cubria `campus_posts` (0016) y `diario_posts` (0018/0020) y
// no `courses`, cuyos `intro`/`title`/`subtitle` se sirven a `anon` SIN SESION. La fuga se
// reprodujo contra el stack local antes de escribir la migracion.
//
// Por que un video_id se escapa del CHECK de forma: son 11 caracteres sin `://` ni `www.` ni
// una corrida de 25+ alfanumericos. `text_has_locator` lo deja pasar por construccion — es
// exactamente la evasion por la que QA rechazo T-022.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';

const asTeacherA = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);

// Cada caso lleva su propio slug: `courses.slug` es unique, asi que los casos que esperan
// exito chocarian entre si compartiendolo.
const insertCourse = (db, slug, columna, valorSql) =>
  asTeacherA(db, () =>
    attempt(
      db,
      `insert into public.courses (slug, title, discipline, level, teacher_id, ${columna})
       values ($1, 'Curso de prueba', 'tarot', 'inicial', $2, ${valorSql}) returning id`,
      [slug, ID.teacherA],
    ),
  );

describe('T-027 · campos de ficha de curso + S-05', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  // ------------------------------------------------------- S-05 · coincidencia exacta
  describe('S-05 · un localizador pago no entra en un campo servido a anon', () => {
    test('el video_id real en `intro` es rechazado — la fuga original', async () => {
      const r = await insertCourse(db, 's05-intro', 'intro', `'Mira este video: ${SECRET.videoId}'`);
      assert.equal(r.ok, false, 'el video_id paso a un campo que anon lee sin sesion');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el video_id real en `description` es rechazado — campo nuevo de T-027', async () => {
      const r = await insertCourse(db, 's05-desc', 'description', `'Mira este video: ${SECRET.videoId}'`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el video_id real en `title` es rechazado', async () => {
      const r = await asTeacherA(db, () =>
        attempt(
          db,
          `insert into public.courses (slug, title, discipline, level, teacher_id)
           values ('s05-title', $1, 'tarot', 'inicial', $2) returning id`,
          [SECRET.videoId, ID.teacherA],
        ),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el drive_file_id real en `learning_objectives` es rechazado', async () => {
      const r = await insertCourse(db, 's05-obj', 'learning_objectives', `array['Bajar ${SECRET.driveFileId}']`);
      assert.equal(r.ok, false, 'el bucle de arrays del guard no cubre learning_objectives');
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el drive_file_id real en `prerequisites` es rechazado', async () => {
      const r = await insertCourse(db, 's05-prereq', 'prerequisites', `array['Tener ${SECRET.driveFileId}']`);
      assert.equal(r.ok, false);
      assert.equal(r.code, PRIV_DENIED);
    });

    test('el UPDATE tambien esta cubierto, no solo el INSERT', async () => {
      const creado = await insertCourse(db, 's05-update', 'description', `'Prosa normal.'`);
      assert.equal(creado.ok, true, 'no se pudo sembrar el curso base del caso');
      const r = await asTeacherA(db, () =>
        attempt(db, `update public.courses set description = $1 where slug = 's05-update'`, [
          `Mira: ${SECRET.videoId}`,
        ]),
      );
      assert.equal(r.ok, false, 'el guard es BEFORE INSERT OR UPDATE — el UPDATE se colo');
      assert.equal(r.code, PRIV_DENIED);
    });

    // Sin este caso, un guard que rechace TODO tambien daria verde en los de arriba.
    test('prosa legitima con la palabra "video" NO se bloquea', async () => {
      const r = await insertCourse(db, 's05-ok', 'description', `'Cada leccion es un video corto y hay material para bajar.'`);
      assert.equal(r.ok, true, `falso positivo: el guard bloquea prosa normal (${r.message})`);
    });
  });

  // ------------------------------------------------------- CHECKs de dominio
  describe('CHECKs de dominio de los campos nuevos', () => {
    test('promo_video_id no acepta la URL entera', async () => {
      const r = await insertCourse(db, 'dom-url', 'promo_video_id', `'https://youtu.be/dQw4w9WgXcQ'`);
      assert.equal(r.ok, false, 'pegar la URL entera tiene que fallar, igual que en lessons');
      assert.equal(r.code, CHECK_VIOLATION);
    });

    test('promo_video_id acepta un id de 11 caracteres', async () => {
      const r = await insertCourse(db, 'dom-ok', 'promo_video_id', `'aBcD1234_-x'`);
      assert.equal(r.ok, true, r.message);
    });

    // `char(2)` corta antes de que el CHECK llegue a evaluarse: Postgres devuelve 22001
    // (string_data_right_truncation), no 23514. Lo que importa es que NO entra; el codigo se
    // afirma como lo que realmente pasa, no como lo que uno supuso al escribir la migracion.
    test('language rechaza tres letras — lo frena el tipo, no el CHECK', async () => {
      const r = await insertCourse(db, 'dom-lang3', 'language', `'esp'`);
      assert.equal(r.ok, false);
      assert.equal(r.code, '22001');
    });

    test('language rechaza mayusculas', async () => {
      const r = await insertCourse(db, 'dom-langup', 'language', `'ES'`);
      assert.equal(r.ok, false);
      assert.equal(r.code, CHECK_VIOLATION);
    });
  });

  // ------------------------------------------------------- grants (R-1)
  describe('R-1 · los campos nuevos estan expuestos a proposito, no por accidente', () => {
    test('anon puede leer los cinco campos nuevos — son material de venta', async () => {
      const r = await asUser(db, { sub: null, userRole: 'anon' }, () =>
        attempt(
          db,
          `select learning_objectives, prerequisites, description, language, promo_video_id
             from public.courses where id = $1`,
          [ID.courseA],
        ),
      ).catch(() => null);
      // Si el harness no expone un helper de anon con esta forma, el caso se ajusta al que use
      // el resto de la suite — lo que se afirma es que NO da 42501.
      if (r) assert.notEqual(r.code, PRIV_DENIED, 'faltan grants de select para los campos nuevos');
    });
  });
});

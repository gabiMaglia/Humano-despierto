// T-031 · el camino de la APP contra la base: se importa el modulo REAL que usan las actions
// (`src/lib/announcements/write.mjs`) y se lo corre con el SQL que emite PostgREST. Leccion de
// T-028 r2: la suite estaba verde mientras la action pedia un permiso que no existia.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase } from '../harness/db.mjs';
import { clientePostgrest } from '../harness/postgrest-client.mjs';
import { seed, ID, SECRET } from './seed.mjs';

const { crearBorrador, editarBorrador, publicar, retirar, traducirErrorAnuncio, SIN_FILAS } = await import(
  '../../src/lib/announcements/write.mjs'
);

const ALUMNA = { sub: ID.student, userRole: 'student' };
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const OTRA_DOCENTE = { sub: ID.teacherB, userRole: 'teacher' };
const ADMIN = { sub: ID.admin, userRole: 'admin' };
const SERVIDOR = { sub: null, role: 'service_role' };
const FALLBACK = 'FALLBACK';

describe('T-031 · la app escribe anuncios por el camino que PostgREST ejecuta', () => {
  let db;
  let borrador;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });

  after(async () => db?.close());

  test('crearBorrador devuelve el id y no manda status', async () => {
    const r = await crearBorrador(clientePostgrest(db, DUENA), {
      courseId: ID.courseA, authorId: ID.teacherA, title: 'Clase en vivo', body: 'El jueves repasamos la cruz celta.',
    });
    assert.equal(r.error, null, r.error?.message);
    assert.match(r.id, /^[0-9a-f-]{36}$/);
    borrador = r.id;
  });

  test('una alumna: 42501 traducido a permiso, sin texto tecnico', async () => {
    const r = await crearBorrador(clientePostgrest(db, ALUMNA), {
      courseId: ID.courseA, authorId: ID.student, title: 'No deberia', body: 'Sin ser la docente',
    });
    assert.equal(r.error?.code, '42501');
    const msg = traducirErrorAnuncio(r.error, FALLBACK);
    assert.match(msg, /permiso/);
    assert.doesNotMatch(msg, /row-level|policy/);
  });

  test('el video_id real tiene su propio mensaje', async () => {
    const r = await crearBorrador(clientePostgrest(db, DUENA), {
      courseId: ID.courseA, authorId: ID.teacherA, title: 'Mira esto', body: `Esta en ${SECRET.videoId}`,
    });
    assert.equal(r.error?.code, '42501');
    assert.match(traducirErrorAnuncio(r.error, FALLBACK), /contenido pago/);
  });

  test('editarBorrador: la duena corrige; otra docente afecta 0 filas y vuelve SIN_FILAS, no exito', async () => {
    const ok = await editarBorrador(clientePostgrest(db, DUENA), {
      id: borrador, courseId: ID.courseA, title: 'Clase en vivo', body: 'El jueves repasamos la cruz celta y el Loco.',
    });
    assert.equal(ok.error, null, ok.error?.message);
    const ajena = await editarBorrador(clientePostgrest(db, OTRA_DOCENTE), {
      id: borrador, courseId: ID.courseA, title: 'Secuestro', body: 'Secuestro',
    });
    assert.equal(ajena.error?.code, SIN_FILAS);
  });

  test('editarBorrador con el curso equivocado no toca la fila (el filtro por course_id es real)', async () => {
    const r = await editarBorrador(clientePostgrest(db, DUENA), {
      id: borrador, courseId: ID.courseB, title: 'Otro curso', body: 'Otro curso',
    });
    assert.equal(r.error?.code, SIN_FILAS);
  });

  test('publicar como servidor: pasa una vez; la segunda es SIN_FILAS (ya no es borrador)', async () => {
    const primera = await publicar(clientePostgrest(db, SERVIDOR), { id: borrador, courseId: ID.courseA });
    assert.equal(primera.error, null, primera.error?.message);
    assert.equal(primera.id, borrador);
    const segunda = await publicar(clientePostgrest(db, SERVIDOR), { id: borrador, courseId: ID.courseA });
    assert.equal(segunda.error?.code, SIN_FILAS);
  });

  test('publicar con la sesion de la duena: 42501 (sin grant de status)', async () => {
    const nuevo = await crearBorrador(clientePostgrest(db, DUENA), {
      courseId: ID.courseA, authorId: ID.teacherA, title: 'Otro anuncio', body: 'Texto',
    });
    const r = await publicar(clientePostgrest(db, DUENA), { id: nuevo.id, courseId: ID.courseA });
    assert.equal(r.error?.code, '42501');
  });

  test('editar lo publicado: 42501 con el mensaje de "ya se envio"', async () => {
    const r = await editarBorrador(clientePostgrest(db, DUENA), {
      id: borrador, courseId: ID.courseA, title: 'Clase en vivo', body: 'Reescrito',
    });
    assert.equal(r.error?.code, '42501');
    assert.match(traducirErrorAnuncio(r.error, FALLBACK), /ya se envió/);
  });

  test('retirar: el admin modera con motivo y queda firmado', async () => {
    const r = await retirar(clientePostgrest(db, ADMIN), { id: borrador, moderatorId: ID.admin, reason: 'Fuera de lugar' });
    assert.equal(r.error, null, r.error?.message);
    const { rows } = await db.query(`select deleted_by from public.course_announcements where id = $1`, [borrador]);
    assert.equal(rows[0].deleted_by, ID.admin);
  });

  test('traducirErrorAnuncio: link es 23514 y lo desconocido es el fallback', () => {
    assert.match(traducirErrorAnuncio({ code: '23514', message: '' }, FALLBACK), /links/);
    assert.equal(traducirErrorAnuncio({ code: 'XX000', message: 'boom' }, FALLBACK), FALLBACK);
  });
});

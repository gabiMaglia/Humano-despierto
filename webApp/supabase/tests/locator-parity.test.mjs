import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootDatabase } from '../harness/db.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const FUENTE_CLIENTE = join(aqui, '..', '..', 'src', 'lib', 'validation', 'teacher.ts');

/**
 * PARIDAD entre las dos definiciones del mismo invariante (ADR-009):
 * el CHECK de la DB (`public.text_has_locator`) y su espejo en el cliente
 * (`LOCATOR_PATTERNS` + la regla de id largo, en validation/teacher.ts).
 *
 * POR QUE EXISTE. Ya divergieron dos veces, las dos por el mismo malentendido:
 *
 *  1. La migración 0010 corrigió un falso positivo en SQL y el espejo quedó sin tocar:
 *     la DB aceptaba "termina.Me parece" y el cliente lo seguía rechazando.
 *  2. Al arreglar eso, sacar `/i` del regex JS **no** era la misma operación que pasar
 *     de `~*` a `~` en SQL: en Postgres las clases POSIX `[[:alnum:]]`/`[[:alpha:]]`
 *     siguen cubriendo ambos casos, y en JS `[a-z0-9]`/`[^a-z]` dejaron de hacerlo.
 *     Resultado: "PDF.com/malicious" quedaba bloqueado por la DB y aceptado por el
 *     cliente — la dirección peligrosa. Lo encontró QA, no la suite: los 182 tests
 *     seguían en verde mientras el bug existía.
 *
 * El test lee el regex del ARCHIVO FUENTE, no una copia: si alguien toca el espejo y
 * no la migración (o al revés), esto se pone rojo. Esa es la única forma de que dos
 * definiciones del mismo invariante no se separen en silencio.
 */

// Casos elegidos por lo que rompieron histórica­mente, no por cubrir el espacio.
const CORPUS = [
  // localizadores: ambos deben rechazar
  'Manual — drive.google.com/file/d/LEAKED123',
  'PDF.com/malicious',                    // el que divergió: mayúscula antes del punto
  'Ver https://ejemplo.com',
  'www.ejemplo.com',
  'material en bit.ly/abc',
  'docs.google.com/document/d/xyz',
  '1AbCdEfGhIjKlMnOpQrStUvWxYz9',         // id largo con mezcla de casos
  // prosa legítima: ambos deben aceptar
  'El curso termina.Me parece importante volver',
  'Ocho semanas.Co-creamos el material',
  'Detalle del temario.Info completa abajo',
  'Cerramos el ciclo.Be parte del circulo',
  'Una practica.Tv en vivo no hay',
  'Aprendemos a leer.Comenzamos por el arcano',
  'Manual v2.1 — Bibliografía (cap. IV)',
  'Sr. Gómez, notas de campo',
  'Diez semanas, cap. IV incluido. Ej. practico',
  'Meditación 20 min',
  'Ritual-de-Luna-Nueva-Enero2026',
];

/** Extrae el predicado del cliente leyendo su archivo fuente, no una copia. */
async function cargarEspejoDelCliente() {
  const src = await readFile(FUENTE_CLIENTE, 'utf8');
  const bloque = src.match(/const LOCATOR_PATTERNS: RegExp\[\] = \[([\s\S]*?)\n\];/);
  assert.ok(bloque, 'no encontré LOCATOR_PATTERNS en validation/teacher.ts — ¿lo renombraron?');
  const literales = bloque[1]
    .split('\n')
    .map((l) => l.trim())
    // `startsWith('/')` sola tambien agarra las lineas de comentario `//`.
    .filter((l) => l.startsWith('/') && !l.startsWith('//'))
    .map((l) => l.replace(/,\s*$/, ''));
  assert.ok(literales.length >= 3, `esperaba al menos 3 patrones, encontré ${literales.length}`);
  const patrones = literales.map((lit) => {
    const m = lit.match(/^\/(.*)\/([a-z]*)$/s);
    assert.ok(m, `no pude parsear el literal: ${lit}`);
    return new RegExp(m[1], m[2]);
  });
  return (v) =>
    patrones.some((re) => re.test(v)) ||
    (v.match(/[A-Za-z0-9_]{25,}/g) ?? []).some(
      (run) => /[0-9]/.test(run) && /[a-z]/.test(run) && /[A-Z]/.test(run),
    );
}

describe('ADR-009 · el CHECK de la DB y su espejo del cliente dan el mismo veredicto', () => {
  let db, cliente;

  before(async () => {
    ({ db } = await bootDatabase());
    cliente = await cargarEspejoDelCliente();
  });

  after(async () => { await db?.close?.(); });

  for (const texto of CORPUS) {
    test(`paridad: ${texto.slice(0, 46)}`, async () => {
      const r = await db.query('select public.text_has_locator($1) as bloquea', [texto]);
      const enDb = r.rows[0].bloquea === true;
      const enCliente = cliente(texto);
      assert.equal(
        enCliente,
        enDb,
        enDb
          ? `la DB BLOQUEA y el cliente ACEPTA — es la dirección peligrosa: el usuario ` +
            `escribe algo que el formulario aprueba y Postgres rechaza con un error crudo.`
          : `la DB ACEPTA y el cliente BLOQUEA — el formulario rechaza contenido legítimo.`,
      );
    });
  }
});

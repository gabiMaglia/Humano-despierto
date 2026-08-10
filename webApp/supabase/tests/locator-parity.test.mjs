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
export const CORPUS = [
  // localizadores: ambos deben rechazar
  'Manual — drive.google.com/file/d/LEAKED123',
  'PDF.com/malicious',                    // el que divergió: mayúscula antes del punto
  'Ver https://ejemplo.com',
  'www.ejemplo.com',
  'material en bit.ly/abc',
  'docs.google.com/document/d/xyz',
  '1AbCdEfGhIjKlMnOpQrStUvWxYz9',         // id largo con mezcla de casos
  // Estos dos los agregó el META-TEST, no una intuición: sin ellos, romper la regla 1
  // o la 2 no producía ninguna divergencia, porque todos los casos con `://` o `www.`
  // del corpus TAMBIEN los atrapaba la regla 3 (el TLD). Una regla tapada por otra no
  // está verificada, aunque el corpus parezca cubrirla. Estos no tienen TLD conocido,
  // así que cada uno solo lo puede atrapar su propia regla.
  'ver ftp://servidor-interno/material',  // solo regla 1: tiene `://`, sin TLD de la lista
  'entrá a www.espacio-interno',          // solo regla 2: tiene `www.`, sin TLD de la lista
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

const literalARegExp = (lit) => {
  const m = lit.match(/^\/(.*)\/([a-z]*)$/s);
  assert.ok(m, `no pude parsear el literal: ${lit}`);
  return new RegExp(m[1], m[2]);
};

/**
 * Extrae el predicado del cliente leyendo su archivo fuente, **las cuatro reglas**.
 *
 * La primera versión de este helper leía del fuente las 3 de `LOCATOR_PATTERNS` y
 * tenía la cuarta —la corrida larga de 25+— **copiada a mano acá adentro**. QA lo
 * demostró mutando el umbral real a `{40,}`: divergencia genuina en la dirección
 * peligrosa, y el test seguía 18/18 en verde. O sea que el mecanismo construido para
 * detectar divergencia silenciosa tenía divergencia silenciosa adentro. Si una regla
 * no se lee del fuente, no está verificada — da igual cuántas sí.
 */
export async function cargarEspejoDelCliente(fuente = FUENTE_CLIENTE) {
  const src = await readFile(fuente, 'utf8');

  // Reglas 1-3: el array de patrones.
  const bloque = src.match(/const LOCATOR_PATTERNS: RegExp\[\] = \[([\s\S]*?)\n\];/);
  assert.ok(bloque, 'no encontré LOCATOR_PATTERNS en validation/teacher.ts — ¿lo renombraron?');
  const patrones = bloque[1]
    .split('\n')
    .map((l) => l.trim())
    // `startsWith('/')` sola tambien agarra las lineas de comentario `//`.
    .filter((l) => l.startsWith('/') && !l.startsWith('//'))
    .map((l) => l.replace(/,\s*$/, ''))
    .map(literalARegExp);
  assert.ok(patrones.length >= 3, `esperaba al menos 3 patrones, encontré ${patrones.length}`);

  // Regla 4: la corrida larga. También del fuente — su umbral y sus tres condiciones.
  const cuerpo = src.match(/function hasLocator\(v: string\): boolean \{([\s\S]*?)\n\}/);
  assert.ok(cuerpo, 'no encontré hasLocator() en validation/teacher.ts');
  const corrida = cuerpo[1].match(/v\.match\((\/[^/]+\/[a-z]*)\)/);
  assert.ok(corrida, 'no encontré el regex de la corrida larga dentro de hasLocator()');
  const reCorrida = literalARegExp(corrida[1]);
  const condiciones = [...cuerpo[1].matchAll(/\/\[([^\]]+)\]\/\.test\(run\)/g)].map((m) =>
    literalARegExp(`/[${m[1]}]/`),
  );
  assert.equal(condiciones.length, 3, `esperaba 3 condiciones sobre la corrida, encontré ${condiciones.length}`);

  return (v) =>
    patrones.some((re) => re.test(v)) ||
    (v.match(reCorrida) ?? []).some((run) => condiciones.every((re) => re.test(run)));
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

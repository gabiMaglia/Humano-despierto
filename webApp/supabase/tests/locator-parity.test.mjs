import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase } from '../harness/db.mjs';

/**
 * PARIDAD entre las dos definiciones del mismo invariante (ADR-009):
 * el CHECK de la DB (`public.text_has_locator`) y su espejo en el cliente
 * (`hasLocator`, en validation/locator.mjs).
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
 * El test IMPORTA la función real del cliente (`validation/locator.mjs`) — no la
 * reconstruye. Reconstruirla falló dos veces: reconstruir una definición es tener dos
 * definiciones, y ahí es donde se separan sin que nadie lo note. Importándola, una regla
 * nueva queda ejercitada automáticamente porque es literalmente el mismo código.
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
  // Acentos pegados al límite de las reglas 2 y 3. Los agregó QA, y no eran un caso
  // borde: el SQL usaba clases POSIX, que dependen del locale, y en `en_US.UTF-8` una
  // `ó` cuenta como alfanumérica — el JS es ASCII. Divergían en LAS DOS direcciones a
  // la vez, y este es un producto en castellano. Corregido en la migración 0012.
  'resumen del cursoó.com/x',             // SQL bloqueaba, JS aceptaba — la peligrosa
  'info.comÓptico avanzado',              // SQL aceptaba, JS bloqueaba
  // prosa legítima: ambos deben aceptar
  // 0016 · los dos lados de la regla de la barra. El de arriba es prosa castellana en
  // minuscula, que el predicado viejo bloqueaba: `me` es pronombre ademas de TLD, y en un foro
  // sin corregir la variante sin mayuscula es al menos tan frecuente como la capitalizada.
  // El de abajo es un localizador de verdad que el predicado viejo dejaba pasar porque la
  // alternancia de TLD iba en minuscula. Los dos casos ejercitan la misma regla en direcciones
  // opuestas, y sin ellos en el corpus el meta-test no puede ver si la regla esta cubierta.
  'Gracias por la devolucion.me sirvio muchisimo para el modulo II',
  'quede encantada.me cambio la forma de leer las cartas',
  'posta el video del otro curso: YOUTU.BE/OTHERCOURSEVID',
  'Manual: DRIVE.GOOGLE.COM/file/d/LEAKED123',
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

/**
 * El espejo del cliente ya NO se reconstruye parseando el fuente: se importa la función
 * real. Las dos versiones anteriores fallaron por lo mismo — reconstruir una definición
 * es tener dos definiciones, y ahí es donde se separan en silencio. Primero por una regla
 * copiada a mano; después porque el parser solo entendía las reglas del array y una regla
 * nueva con otra forma quedaba invisible sin error.
 */
const { hasLocator } = await import('../../src/lib/validation/locator.mjs');
export const cliente = hasLocator;

describe('ADR-009 · el CHECK de la DB y su espejo del cliente dan el mismo veredicto', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
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

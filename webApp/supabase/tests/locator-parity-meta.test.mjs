import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { bootDatabase } from '../harness/db.mjs';
import { cargarEspejoDelCliente, CORPUS } from './locator-parity.test.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const FUENTE = join(aqui, '..', '..', 'src', 'lib', 'validation', 'teacher.ts');

/**
 * META-TEST: verifica que el verificador de paridad NO pase por construcción.
 *
 * POR QUE EXISTE — y es la lección de fondo de todo el sprint, no de este archivo.
 * Cuatro veces se construyó acá un verificador que daba verde sobre algo que no había
 * mirado, y las cuatro las encontró QA, no la suite:
 *
 *   1. `check-adr004.sh` filtraba excepciones con `grep -v`, que borra la LÍNEA — y el
 *      HTML de Next viene en una sola, así que las rutas con excepción se barrían enteras.
 *   2. El mismo guard seguía redirects, así que escaneaba el login en vez de las rutas
 *      protegidas.
 *   3. Y aceptaba un error boundary con HTTP 200 como si fuera una página.
 *   4. El test de paridad leía del fuente 3 de las 4 reglas y tenía la cuarta copiada
 *      a mano adentro.
 *
 * El patrón es siempre el mismo, y no es descuido: **se mutaba una rama que ya
 * funcionaba**. Una mutación hecha a mano una vez prueba el caso que se te ocurrió, no
 * la clase. Por eso la mutación acá es AUTOMÁTICA y por REGLA: si mañana alguien agrega
 * una quinta regla al invariante y no la lee del fuente, este archivo se pone rojo solo.
 *
 * Cada caso rompe UNA regla del espejo del cliente sobre una copia temporal del fuente,
 * y exige que la paridad falle en al menos una entrada del corpus. Si no falla, esa regla
 * no está siendo verificada por nadie.
 */

// Cada mutación desalinea el cliente respecto de la DB, en la dirección que indica.
const MUTACIONES = [
  {
    regla: 'regla 1 · el esquema `://`',
    aplicar: (s) => s.replace('/:\\/\\//', '/:NUNCA-MATCHEA:\\/\\//'),
    porque: 'sin ella el cliente deja pasar cualquier URL con esquema explícito',
  },
  {
    regla: 'regla 2 · el prefijo `www.`',
    aplicar: (s) => s.replace(/\/\(\^\|\[\^a-z0-9\]\)www\\\.\/i/, '/(^|[^a-z0-9])NUNCAwww\\./i'),
    porque: 'sin ella el cliente deja pasar www.ejemplo.com',
  },
  {
    regla: 'regla 3 · las clases alrededor del TLD',
    aplicar: (s) => s.replace('/[A-Za-z0-9]\\.(com|', '/[a-z0-9]\\.(com|'),
    porque:
      'es la divergencia real que encontró QA: con [a-z0-9] el cliente acepta ' +
      '"PDF.com/x" y la DB lo bloquea — la dirección peligrosa',
  },
  {
    regla: 'regla 4 · el umbral de la corrida larga',
    aplicar: (s) => s.replace('{25,}', '{40,}'),
    porque:
      'es la mutación con la que QA probó que la cuarta regla estaba copiada a mano ' +
      'dentro del test en vez de leída del fuente',
  },
];

describe('META · el test de paridad detecta divergencia en las CUATRO reglas', () => {
  let db, fuenteOriginal, dir;

  before(async () => {
    ({ db } = await bootDatabase());
    fuenteOriginal = await readFile(FUENTE, 'utf8');
    dir = await mkdtemp(join(tmpdir(), 'paridad-meta-'));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
    await db?.close?.();
  });

  for (const { regla, aplicar, porque } of MUTACIONES) {
    test(`romper ${regla} hace fallar la paridad`, async () => {
      const mutado = aplicar(fuenteOriginal);
      assert.notEqual(
        mutado,
        fuenteOriginal,
        `la mutación de "${regla}" no cambió nada — el patrón que busca ya no existe en ` +
          `el fuente. Actualizá esta mutación: si no muta, no prueba nada.`,
      );

      const copia = join(dir, 'teacher.ts');
      await writeFile(copia, mutado, 'utf8');
      const clienteRoto = await cargarEspejoDelCliente(copia);

      let divergencias = 0;
      for (const texto of CORPUS) {
        const r = await db.query('select public.text_has_locator($1) as bloquea', [texto]);
        if (clienteRoto(texto) !== (r.rows[0].bloquea === true)) divergencias++;
      }

      assert.ok(
        divergencias > 0,
        `Rompí ${regla} y el corpus NO detectó ninguna divergencia. ${porque}. ` +
          `Eso significa que esa regla no está verificada: o el corpus no tiene un caso ` +
          `que la ejercite, o el espejo no la lee del fuente. Las dos cosas dejan pasar ` +
          `exactamente el bug que este mecanismo existe para atrapar.`,
      );
    });
  }
});

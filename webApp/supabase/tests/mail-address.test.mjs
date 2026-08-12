// T-020 · regresión del formateo de direcciones de mail (rechazo 1 de QA).
//
// EL BUG QUE ESTO CUBRE. "Doe, Jane" (apellido, nombre — sin ninguna intención maliciosa, es
// de lo más común que hay en un alta real) salía como `To: Doe, Jane <x@y>` sin comillas. Se ve
// bien como STRING. El problema aparece recién del lado de quien lo PARSEA: una address-list
// separa por comas, así que "Doe, Jane <x@y>" son DOS direcciones para cualquier cliente que
// respete la gramática (Mailpit, con `net/mail` de Go, reclasificó a la segunda como `Bcc` sin
// nombre). QA lo encontró probando contra Mailpit — no comparando el string contra sí mismo.
//
// POR ESO ESTE TEST NO COMPARA STRINGS. `formatAddress` importa DE VERDAD desde
// `src/lib/mail/address.mjs` (mismo patrón que `locator-parity.test.mjs` con `hasLocator`: un
// test que reconstruye la función, aunque la reconstruya fiel, es una segunda definición que
// puede separarse en silencio de la primera). Y el control no es "el string contiene comillas",
// que es exactamente el tipo de aserción decorativa que pasa aunque el bug siga ahí — es un
// parser de address-list, escrito ACÁ, independiente de `formatAddress`, que reproduce lo que
// hace un cliente real: separa por comas de nivel superior (respetando quoted-strings), decodifica
// quoted-string y RFC 2047, y devuelve la lista de direcciones que un destinatario vería. La
// aserción real es sobre esa lista, no sobre el string de entrada.
//
// LÍMITE DECLARADO: el decoder de RFC 2047 acá abajo solo entiende encoding `B` (base64) —
// `formatDisplayName` nunca emite `Q`, así que no hace falta más. Si algún día emite `Q`, este
// parser tira un error explícito en vez de decodificar mal en silencio.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { formatAddress } = await import('../../src/lib/mail/address.mjs');

// ================================================================ parser independiente
//
// Grammar subset de RFC 5322 §3.4 que hace falta para UNA `mailbox-list` de un header
// `To`/`From`: separador de nivel superior es la coma (protegida dentro de quoted-string);
// cada mailbox es opcionalmente un display-name (quoted-string, encoded-word RFC 2047, o
// texto suelto) seguido de `<addr-spec>`, o un addr-spec pelado sin display-name.

function splitTopLevelCommas(header) {
  const segments = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < header.length; i++) {
    const ch = header[i];
    if (inQuotes) {
      current += ch;
      if (ch === '\\' && i + 1 < header.length) {
        current += header[++i];
        continue;
      }
      if (ch === '"') inQuotes = false;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      current += ch;
      continue;
    }
    if (ch === ',') {
      segments.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) segments.push(current.trim());
  return segments;
}

function decodeQuotedString(raw) {
  // `raw` trae las comillas de apertura/cierre incluidas.
  let out = '';
  for (let i = 1; i < raw.length - 1; i++) {
    if (raw[i] === '\\') {
      out += raw[++i];
      continue;
    }
    out += raw[i];
  }
  return out;
}

function decodeRfc2047(word) {
  const m = /^=\?([^?]+)\?([bBqQ])\?([^?]*)\?=$/.exec(word);
  if (!m) return null;
  const [, charset, enc] = m;
  const text = m[3];
  if (enc.toUpperCase() !== 'B') {
    throw new Error(`decodeRfc2047: encoding "${enc}" no soportado por este parser de test`);
  }
  const encoding = charset.toLowerCase() === 'utf-8' ? 'utf-8' : 'latin1';
  return Buffer.from(text, 'base64').toString(encoding);
}

function parseMailbox(segment) {
  const trimmed = segment.trim();
  const angleMatch = /<([^>]*)>\s*$/.exec(trimmed);
  if (!angleMatch) {
    // Sin "<...>": el segmento entero es un addr-spec pelado, sin display-name.
    return { name: '', address: trimmed };
  }
  const address = angleMatch[1];
  const namePart = trimmed.slice(0, angleMatch.index).trim();
  if (!namePart) return { name: '', address };
  if (namePart.startsWith('"') && namePart.endsWith('"')) {
    return { name: decodeQuotedString(namePart), address };
  }
  if (namePart.startsWith('=?') && namePart.endsWith('?=')) {
    return { name: decodeRfc2047(namePart), address };
  }
  return { name: namePart, address };
}

/** @returns {{name: string, address: string}[]} */
function parseMailboxList(header) {
  return splitTopLevelCommas(header).map(parseMailbox);
}

// ================================================================ meta-test del parser
//
// Antes de confiar en `parseMailboxList` para el resto del archivo: ¿de verdad detecta la
// CLASE de bug que QA encontró? Se lo alimenta a mano con el string roto que `formatAddress`
// producía ANTES de este fix (sin comillas) — si el parser no lo separa en dos, no sirve de
// control y el resto del archivo solo estaría decorando.
describe('parseMailboxList (meta) — detecta el bug de QA si reaparece', () => {
  test('un display-name con coma SIN comillas parsea como DOS direcciones', () => {
    const rota = 'Doe, Jane <t020-alumna@test.local>';
    const parsed = parseMailboxList(rota);
    assert.equal(parsed.length, 2, 'el string roto (pre-fix) tiene que partirse en 2 — si no, el parser no sirve de control');
    // No hace falta reproducir el detalle exacto de cómo Go's net/mail reclasifica la mitad
    // sobrante (QA la vio caer en Bcc sin nombre) — el invariante que importa, y que CUALQUIER
    // parser de address-list conforme comparte, es que la identidad se partió: ninguna de las
    // dos entradas conserva el nombre completo pegado a la dirección real.
    const conLaDireccion = parsed.find((p) => p.address === 't020-alumna@test.local');
    assert.notEqual(conLaDireccion?.name, 'Doe, Jane', 'si algo todavía junta el nombre completo con la dirección, esto no es el bug que QA vio');
  });

  test('con comillas, la misma coma NO parte nada', () => {
    const arreglada = '"Doe, Jane" <t020-alumna@test.local>';
    const parsed = parseMailboxList(arreglada);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, 'Doe, Jane');
    assert.equal(parsed[0].address, 't020-alumna@test.local');
  });
});

// ================================================================ formatAddress real

describe('formatAddress — parseado como lo vería un destinatario, no comparado como string', () => {
  const EMAIL = 'persona@test.local';

  const CASOS = [
    ['coma (el caso de QA)', 'Doe, Jane'],
    ['comillas dentro del nombre, ASCII puro', 'Ana "La Maga" Lopez'],
    ['acentos -> toma la rama RFC 2047, no la de comillas', 'Milagros Ñañez'],
    ['sin specials -> atom crudo', 'Juana Sin Miedo'],
    ['punto de abreviatura -> es un special de RFC 5322', 'Sr. Gomez'],
    ['punto y coma', 'Ana; Maria'],
  ];

  for (const [label, name] of CASOS) {
    test(`${label}: "${name}"`, () => {
      const header = formatAddress({ email: EMAIL, name });
      const parsed = parseMailboxList(header);
      assert.equal(parsed.length, 1, `"${header}" tiene que parsear como UNA sola dirección`);
      assert.equal(parsed[0].address, EMAIL);
      assert.equal(parsed[0].name, name, 'el nombre decodificado tiene que ser EXACTAMENTE el original');
    });
  }

  test('nombre vacío -> sin display-name, solo <email>', () => {
    const header = formatAddress({ email: EMAIL, name: '' });
    assert.equal(header, `<${EMAIL}>`);
    const parsed = parseMailboxList(header);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].address, EMAIL);
    assert.equal(parsed[0].name, '');
  });

  test('nombre que queda vacío después de sacarle el CRLF -> igual que sin nombre', () => {
    const header = formatAddress({ email: EMAIL, name: '\r\n  \r\n' });
    assert.equal(header, `<${EMAIL}>`);
    const parsed = parseMailboxList(header);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].address, EMAIL);
    assert.equal(parsed[0].name, '');
  });

  test('sin `name` en absoluto (undefined) -> igual que vacío', () => {
    const header = formatAddress({ email: EMAIL });
    assert.equal(header, `<${EMAIL}>`);
  });

  test('CRLF en medio de un nombre real no sobrevive (header injection)', () => {
    const header = formatAddress({ email: EMAIL, name: 'Ana\r\nBcc: victima@evil.test' });
    assert.equal(header.includes('\r') || header.includes('\n'), false);
    const parsed = parseMailboxList(header);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].address, EMAIL);
  });
});

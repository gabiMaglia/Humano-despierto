/**
 * Formateo de direcciones de mail (RFC 5322 §3.2.3/§3.4), en UN solo lugar.
 *
 * Vive en un módulo plano —no en `transport.ts`— por el mismo motivo que
 * `validation/locator.mjs` (leer ese archivo primero): mientras el test de esto
 * reconstruyera la función parseando o copiando el código, "reconstruir una definición
 * es tener dos definiciones" — la que corre en la app y la que el test cree que corre.
 * `transport.ts` importa `formatAddress` de acá (vía `@/lib/mail/address.mjs`, que
 * `allowJs` resuelve); `supabase/tests/mail-address.test.mjs` importa las mismas
 * funciones por ruta relativa. Es literalmente el mismo código en los dos lados.
 *
 * ORIGEN DEL BUG QUE ESTO ARREGLA (T-020, rechazo de QA — nombre real "Doe, Jane").
 * Un display-name con una coma sin comillas rompe la gramática de address-list: el
 * parser de destino (Mailpit, `net/mail` de Go) lee "Doe, Jane <x@y>" como DOS
 * direcciones, y la segunda —sin "<...>"— cae en Bcc sin nombre. La app nunca vio el
 * error: el string que arma `formatAddress` "se ve bien" a simple vista. El bug solo
 * aparece del lado del que lo PARSEA, no del que lo escribe.
 */

/** Saca CR/LF de cualquier valor que vaya a un header — sin esto, un `full_name` con un
 * salto de línea inyecta headers SMTP arbitrarios (p.ej. un `Bcc:` propio). Ningún dato
 * de usuario entra a un header sin pasar por acá. */
export function stripHeaderInjection(value) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

// RFC 5322 §3.2.3: un display-name es una `phrase` hecha de `atom`s — y `atext` excluye
// estos "specials" (más la comilla doble y la barra, que necesitan su propio escape
// dentro de un quoted-string). Un nombre con CUALQUIERA de estos NO puede salir como
// atom crudo: "Doe, Jane" sin comillas es una address-list de DOS elementos para
// cualquier parser que respete la gramática — la coma cierra el primer address-spec y
// arranca uno nuevo, que como no trae "<...>" cae en el balde de "sin nombre".
const RFC5322_SPECIALS = /[()<>[\]:;@\\,."]/;

/** Escapa `\` y `"` con `\` — RFC 5322 §3.2.4, `quoted-pair` dentro de un `quoted-string`. */
export function escapeQuotedString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Display-name de una dirección (`To`/`From`). Dos caminos EXCLUYENTES, nunca combinados:
 *   · no-ASCII (tildes, ñ) -> RFC 2047 encoded-word, SIN comillas — un quoted-string no
 *     decodifica lo que tiene adentro, así que envolver un encoded-word en comillas lo
 *     deja literal (`"=?UTF-8?B?...?="` en la bandeja del destinatario, no el nombre).
 *   · ASCII con "specials" (coma, punto, dos puntos, comillas, paréntesis, `<>`, `@`, `\`)
 *     -> quoted-string, escapando `\`/`"` por dentro.
 *   · ASCII sin specials -> atom crudo, como antes de este fix.
 */
export function formatDisplayName(name) {
  const clean = stripHeaderInjection(name);
  if (!/^[\x20-\x7e]*$/.test(clean)) {
    return `=?UTF-8?B?${Buffer.from(clean, 'utf-8').toString('base64')}?=`;
  }
  if (RFC5322_SPECIALS.test(clean)) {
    return `"${escapeQuotedString(clean)}"`;
  }
  return clean;
}

/**
 * `{ email, name? }` -> el valor completo de un header de dirección (`To: ...`/`From: ...`).
 * Sin `name` (o vacío tras sacarle CR/LF), es solo `<email>` — RFC 5322 no exige display-name.
 * @param {{ email: string, name?: string }} address
 * @returns {string}
 */
export function formatAddress({ email, name }) {
  const safeEmail = stripHeaderInjection(email);
  const cleanName = name ? stripHeaderInjection(name) : '';
  if (!cleanName) return `<${safeEmail}>`;
  return `${formatDisplayName(cleanName)} <${safeEmail}>`;
}

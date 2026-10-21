import { DEFAULT_NEXT } from "./paths";

// Deniega por defecto: solo caracteres de path/query/fragmento de RFC 3986 tras una "/" única.
// Los navegadores descartan tab y salto de línea dentro de una URL y leen "\" como "/", así que
// "/\t/evil.tld" o "/\evil.tld" terminan siendo "//evil.tld", otro host. Dejar esos caracteres
// fuera del conjunto permitido cierra la clase entera en vez de perseguir variantes.
const INTERNAL_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%\/?#]*$/;
const MAX_LENGTH = 512;
const PROBE_ORIGIN = "http://internal.invalid";

// `null` cuando falta o no es interna: el login lo trata como ausente y elige por rol (c.9).
export function internalNext(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) return null;
  if (!INTERNAL_PATH.test(raw)) return null;
  // Segunda opinión con el parser real: si algún día el regex se afloja, esto sigue cortando.
  try {
    if (new URL(raw, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return null;
  } catch {
    return null;
  }
  return raw;
}

export function safeNext(raw: string | null | undefined): string {
  return internalNext(raw) ?? DEFAULT_NEXT;
}

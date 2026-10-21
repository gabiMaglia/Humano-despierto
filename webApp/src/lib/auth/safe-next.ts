import { DEFAULT_NEXT } from "./paths";

// Deniega por defecto: solo caracteres de path/query/fragmento de RFC 3986 tras una "/" única.
// Los navegadores descartan tab y salto de línea dentro de una URL y leen "\" como "/", así que
// "/\t/evil.tld" o "/\evil.tld" terminan siendo "//evil.tld", otro host. Dejar esos caracteres
// fuera del conjunto permitido cierra la clase entera en vez de perseguir variantes.
const INTERNAL_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%\/?#]*$/;
const MAX_LENGTH = 512;
const PROBE_ORIGIN = "http://internal.invalid";

export function safeNext(raw: string | null | undefined): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) return DEFAULT_NEXT;
  if (!INTERNAL_PATH.test(raw)) return DEFAULT_NEXT;
  // Segunda opinión con el parser real: si algún día el regex se afloja, esto sigue cortando.
  try {
    if (new URL(raw, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return DEFAULT_NEXT;
  } catch {
    return DEFAULT_NEXT;
  }
  return raw;
}

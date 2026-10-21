export interface Cursor {
  at: string;
  id: string;
}

// El timestamp viaja como lo devolvió Postgres, con microsegundos: pasarlo por Date lo trunca a
// milisegundos y el keyset saltea filas (supabase/tests/admin-lists.test.mjs lo demuestra).
const TIMESTAMP =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,6})?(Z|[+-](0\d|1[0-4])(:?[0-5]\d)?)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64URL = /^[A-Za-z0-9_-]{1,160}$/;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.at}|${cursor.id}`, "utf8").toString("base64url");
}

/** Deniega por defecto: lo que no tiene exactamente la forma esperada es "sin cursor" (c.9). */
export function decodeCursor(raw: unknown): Cursor | null {
  if (typeof raw !== "string" || !BASE64URL.test(raw)) return null;
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  const sep = decoded.indexOf("|");
  if (sep < 0) return null;
  const at = decoded.slice(0, sep);
  const id = decoded.slice(sep + 1);
  if (!TIMESTAMP.test(at) || !UUID.test(id)) return null;
  return { at, id: id.toLowerCase() };
}

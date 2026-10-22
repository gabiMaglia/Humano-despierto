import { decodeCursor, encodeCursor, type Cursor } from "./cursor";

export const PAGE_SIZE = 25;
export const Q_MAX = 100;

export interface ListParams {
  q: string | null;
  after: Cursor | null;
}

type SearchParams = Record<string, string | string[] | undefined>;

export function parseListParams(sp: SearchParams): ListParams {
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, Q_MAX) : "";
  return { q: q.length > 0 ? q : null, after: decodeCursor(sp.after) };
}

/** Las funciones SQL devuelven PAGE_SIZE + 1 filas: la sobrante solo dice que hay siguiente. */
export function splitPage<T>(rows: T[], cursorOf: (row: T) => Cursor): { items: T[]; next: string | null } {
  const items = rows.slice(0, PAGE_SIZE);
  const last = items.at(-1);
  return { items, next: rows.length > PAGE_SIZE && last ? encodeCursor(cursorOf(last)) : null };
}

export function pageHref(path: string, q: string | null, after: string | null): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (after) params.set("after", after);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

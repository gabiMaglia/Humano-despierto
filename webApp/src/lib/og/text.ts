// Satori sale a fonts.googleapis.com en el request por cada caracter que la fuente cargada no
// cubre (D4) o dibuja tofu. Whitelist: ASCII imprimible y Latin-1, que la Plus Jakarta Sans vendoreada cubre
// (lo prueba render.test.ts caracter por caracter).
// U+00AD (guion blando) es la única ausencia de Latin-1 en Plus Jakarta Sans; es invisible y se borra.
const NOT_SAFE = /[^\x20-\x7E\xA1-\xAC\xAE-\xFF]+/g;
const SOFT_HYPHEN = /\u00AD/g;

export function ogSafeText(raw: string, max: number): string {
  const clean = raw.replace(SOFT_HYPHEN, "").replace(NOT_SAFE, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const room = clean.slice(0, max - 3);
  const cut = room.lastIndexOf(" ");
  return `${(cut > 0 ? room.slice(0, cut) : room).trimEnd()}...`;
}

// Mismo criterio que el <title> de la ficha: la base guarda "Tarot" y "iniciático" sin espacio.
export function ogCourseTitle(title: string, titleEm: string | null): string {
  return ogSafeText([title, titleEm].filter(Boolean).join(" "), 70) || "Curso";
}

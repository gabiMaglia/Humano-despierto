// Satori sale a fonts.googleapis.com en el request por cada caracter que la fuente cargada no
// cubre (D4) o dibuja tofu. Whitelist: ASCII imprimible y Latin-1, que la Cinzel vendoreada cubre
// (lo prueba render.test.ts caracter por caracter).
const NOT_SAFE = /[^\x20-\x7E\xA1-\xFF]+/g;

export function ogSafeText(raw: string, max: number): string {
  const clean = raw.replace(NOT_SAFE, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const room = clean.slice(0, max - 3);
  const cut = room.lastIndexOf(" ");
  return `${(cut > 0 ? room.slice(0, cut) : room).trimEnd()}...`;
}

// Mismo criterio que el <title> de la ficha: la base guarda "Tarot" y "iniciático" sin espacio.
export function ogCourseTitle(title: string, titleEm: string | null): string {
  return ogSafeText([title, titleEm].filter(Boolean).join(" "), 70) || "Curso";
}

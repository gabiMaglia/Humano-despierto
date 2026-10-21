// Funciones puras del player: sin server-only para poder correrlas en Vitest y en el cliente.

export interface NavLesson {
  id: string;
  position: number;
  title: string;
  state: "done" | "current" | "pending" | "preview" | "locked";
}

export interface NavModule {
  position: number;
  lessons: NavLesson[];
}

export interface NextLesson {
  id: string;
  title: string;
}

/** Primera lección después de la actual, en orden (módulo, posición), que no esté bloqueada. */
export function nextLesson(modules: NavModule[], currentId: string): NextLesson | null {
  const flat = [...modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((m) => [...m.lessons].sort((a, b) => a.position - b.position));
  const i = flat.findIndex((l) => l.id === currentId);
  if (i === -1) return null;
  const next = flat.slice(i + 1).find((l) => l.state !== "locked");
  return next ? { id: next.id, title: next.title } : null;
}

/** Destino del cierre cuando no hay siguiente: el certificado si ya existe, si no el panel. */
export function closingHref(certificateCode: string | null): string {
  return certificateCode ? `/certificado/${certificateCode}` : "/panel";
}

/** Cierre de una anónima (lección preview): no tiene panel, vuelve a la ficha del curso. */
export function anonymousClosingHref(courseSlug: string): string {
  return `/cursos/${courseSlug}`;
}

/**
 * `?t=` de la URL: entero >= 0 o nada. Todo lo demás (negativo, decimal, texto, repetido) se
 * ignora en vez de adivinar. Se recorta a la duración cuando se conoce (> 0).
 */
export function parseStartSeconds(raw: string | string[] | undefined, durationSeconds: number): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const seconds = Number(raw);
  if (!Number.isSafeInteger(seconds)) return null;
  return durationSeconds > 0 ? Math.min(seconds, durationSeconds) : seconds;
}

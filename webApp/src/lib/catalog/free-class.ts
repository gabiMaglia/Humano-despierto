// Spec Brote, reglas de contenido: «la primera clase es gratis» sólo se afirma de un curso que
// tiene una lección `is_preview`, y de la escuela entera sólo si TODOS la tienen. Sin el dato no
// se afirma nada más fuerte que el texto prudente.

export type FreeClassClaim = "todos" | "algunos" | "ninguno" | "desconocido";

export function freeClassClaim({ total, withPreview }: { total: number; withPreview: number | null }): FreeClassClaim {
  if (withPreview === null || withPreview > total) return "desconocido";
  if (total === 0 || withPreview === 0) return "ninguno";
  return withPreview === total ? "todos" : "algunos";
}

export function firstPreviewLesson<T extends { isPreview: boolean }>(modules: { lessons: T[] }[]): T | null {
  for (const m of modules) {
    const hit = m.lessons.find((l) => l.isPreview);
    if (hit) return hit;
  }
  return null;
}

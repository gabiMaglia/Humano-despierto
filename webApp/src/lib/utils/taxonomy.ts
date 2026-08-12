// `courses.discipline` y `courses.level` son texto libre sin CHECK (Q-05, engram/01_requirements.md
// §6). T-001 los dejó así a propósito antes que inventar una taxonomía sin el PO (P-3). Consecuencia
// medida en la base real (2026-08-11): entre cursos PUBLICADOS los valores hoy son consistentes
// ("Astrología", "Herbal", "Reiki", "Tarot" / "Inicial", "Intermedio", "Maestría"), pero hay filas en
// `draft` con variantes de casing ("tarot", "inicial") y hasta un nombre de nivel distinto
// ("Iniciacion") — residuo de fixtures de QA (T-005). Nada impide que ese residuo se publique mañana.
//
// Decisión de este ticket (T-019): normalizar por casing/espacios al filtrar y contar (agrupar por
// `lower(trim())`), NO cerrar la taxonomía con un CHECK ni una tabla de catálogo — eso exige que el
// PO fije la lista final (Q-05 sigue ABIERTA) y es una migración, y T-019 no tiene número asignado.
// Esta normalización solo evita que "Tarot" y "tarot" partan un filtro en dos; NO unifica sinónimos
// distintos como "Iniciacion" vs "Inicial" — eso sería inventar la taxonomía, no tolerar su formato.
export function normalizeTaxonomyKey(value: string): string {
  return value.trim().toLowerCase();
}

// Label determinística a partir de la key normalizada (no de "la primera fila que llegó"), para que
// dos requests no puedan mostrar dos mayúsculas distintas para el mismo filtro.
export function taxonomyLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export type DurationBucketKey = "corto" | "medio" | "largo";

export const DURATION_BUCKETS: { key: DurationBucketKey; label: string }[] = [
  { key: "corto", label: "Hasta 2 h" },
  { key: "medio", label: "2 a 5 h" },
  { key: "largo", label: "Más de 5 h" },
];

// Buckets fijos de contenido total (reemplazo de `duration_weeks`, eliminada por ADR-004/T-001:
// el agregado de `lessons.duration_seconds` es el único dato real). Los límites son producto, no
// dato — lo que sale de la base es el CONTEO en cada bucket, no el bucket en sí.
export function bucketForDurationSeconds(totalSeconds: number): DurationBucketKey {
  if (totalSeconds < 2 * 3600) return "corto";
  if (totalSeconds < 5 * 3600) return "medio";
  return "largo";
}

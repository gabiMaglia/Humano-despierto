/** Una sola fórmula para el panel de la alumna y el de la docente; sin lecciones es 0, no NaN. */
export function progressPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

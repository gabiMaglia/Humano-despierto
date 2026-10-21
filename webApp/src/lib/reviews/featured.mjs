/**
 * Reseña destacada (T-028 c.4), criterio literal de la spec: la MÁS RECIENTE con 4 o 5 estrellas
 * y cuerpo no vacío. Sin votos (YAGNI). Módulo plano para que el test ejecute esta misma función.
 *
 * "Reciente" se mide por `updatedAt`: una reseña editada es la opinión vigente de su autora.
 * El empate se rompe por `id` para que el resultado no dependa del orden en que llegan las filas.
 *
 * @template {{ id: string; rating: number; body: string | null; updatedAt: string }} R
 * @param {R[]} reviews
 * @returns {R | null}
 */
export function elegirDestacada(reviews) {
  /** @type {R | null} */
  let mejor = null;
  for (const r of reviews) {
    if (r.rating < 4 || !r.body || r.body.trim() === '') continue;
    if (
      !mejor ||
      r.updatedAt > mejor.updatedAt ||
      (r.updatedAt === mejor.updatedAt && r.id < mejor.id)
    ) {
      mejor = r;
    }
  }
  return mejor;
}

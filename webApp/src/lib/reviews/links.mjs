/** Ancla de la sección de reseñas en la ficha. Un solo lugar: el mail de curso completado (c.7)
 *  y el `id` de `ReviewsSection` la leen de acá, así el link no apunta a un ancla que no existe. */
export const REVIEWS_ANCHOR = 'resenas';

/** @param {string} slug */
export function reviewAnchorPath(slug) {
  return `/cursos/${slug}#${REVIEWS_ANCHOR}`;
}

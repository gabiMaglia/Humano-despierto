/** `courses.title_em` es la segunda mitad del nombre (antes iba en cursiva); fuera de la tarjeta
 *  del catálogo el curso se nombra entero. */
export function courseFullTitle(title: string, titleEm: string | null | undefined): string {
  const em = titleEm?.trim();
  return em ? `${title} ${em}` : title;
}

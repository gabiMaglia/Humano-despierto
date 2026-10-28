/** Sobre un hero fotográfico el header es transparente (texto blanco sobre la foto) y pasa a
 *  sólido antes de que termine la foto, para no quedar blanco sobre fondo claro. */
export function isHeaderSolid({
  scrollY,
  viewportHeight,
  overHero,
}: {
  scrollY: number;
  viewportHeight: number;
  overHero: boolean;
}): boolean {
  return !overHero || scrollY > viewportHeight * 0.85;
}

export function isBackToTopVisible(scrollY: number): boolean {
  return scrollY > 600;
}

/** Un reveal nunca esconde lo que la persona ya está viendo: sólo se difiere lo que arranca por
 *  debajo del pliegue, y con movimiento reducido no se difiere nada. Así una carga lenta del JS
 *  o un scroll restaurado no dejan contenido invisible. */
export function shouldDeferReveal({
  top,
  viewportHeight,
  reducedMotion,
}: {
  top: number;
  viewportHeight: number;
  reducedMotion: boolean;
}): boolean {
  return !reducedMotion && top > viewportHeight;
}

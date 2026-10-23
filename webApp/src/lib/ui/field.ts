/** Atributos que atan un campo a su error (patrón de T-062): el lector anuncia el campo como
 *  inválido y lee el motivo, en vez de dejarlo sólo en el color del borde. */
export function fieldA11y(id: string, error?: string | null, describedBy?: string) {
  const errorId = `${id}-error`;
  const ids = [error ? errorId : null, describedBy ?? null].filter(Boolean).join(" ");
  return {
    errorId,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": ids || undefined,
  };
}

/** D-21: cursos migrados traen `description` copia de `intro`; repetirla en la ficha es ruido. */
export function visibleDescription(intro: string | null, description: string | null): string | null {
  const d = description?.trim();
  if (!d) return null;
  return d === intro?.trim() ? null : description;
}

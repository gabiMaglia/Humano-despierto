export const MAX_QUESTION = 140;

export function sanitizeQuestion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = raw
    .replace(/[\u200B\u200C\u200D\uFEFF\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUESTION)
    .trimEnd();
  return q.length ? q : null;
}

export const MAX_QUESTION = 140;

export function sanitizeQuestion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, MAX_QUESTION);
  return q.length ? q : null;
}

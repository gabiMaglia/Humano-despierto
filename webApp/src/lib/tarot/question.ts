export const MAX_QUESTION = 140;

export function sanitizeQuestion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u200B\u200C\u200D\uFEFF\u2028\u2029\u202A-\u202E\u2066-\u2069]/gu, " ")
    .replace(/\p{Cc}/gu, " ")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const q = Array.from(cleaned).slice(0, MAX_QUESTION).join("").trimEnd();
  return q.length ? q : null;
}

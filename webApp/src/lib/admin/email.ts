import { z } from "@/lib/validation/zod";

const EMAIL = z.email();

/** Mail como lo guarda teacher_invitations (CHECK de normalización): minúsculas y sin espacios. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 320) return null;
  return EMAIL.safeParse(email).success ? email : null;
}

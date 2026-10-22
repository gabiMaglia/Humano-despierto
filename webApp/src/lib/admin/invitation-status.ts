export type InvitationStatus = "pendiente" | "vencida" | "aceptada" | "revocada";

/** Aceptada y revocada son definitivas; vencida es una pendiente a la que se le pasó la fecha. */
export function invitationStatus(
  row: { expiresAt: string; acceptedAt: string | null; revokedAt: string | null },
  now: Date,
): InvitationStatus {
  if (row.acceptedAt) return "aceptada";
  if (row.revokedAt) return "revocada";
  return new Date(row.expiresAt).getTime() <= now.getTime() ? "vencida" : "pendiente";
}

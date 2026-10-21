/** Spec T-031: hasta 5 envíos en vuelo. Con el tope duro de 15 s de `sendMail`, 200 inscriptas
 * contra un SMTP mudo terminan en ~10 min, fuera del request (corre en `after`). */
export const ANNOUNCEMENT_MAIL_CONCURRENCY = 5;

/**
 * Una entrada por inscripta activa, sin la autora y sin repetidas. El orden es el de la consulta:
 * dos corridas del mismo evento recorren igual, y el dedupe real lo hace `mail_log` igual.
 */
export function buildAnnouncementRecipients(rows: { user_id: string | null }[], authorId: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { user_id } of rows) {
    if (!user_id || user_id === authorId || seen.has(user_id)) continue;
    seen.add(user_id);
    out.push(user_id);
  }
  return out;
}

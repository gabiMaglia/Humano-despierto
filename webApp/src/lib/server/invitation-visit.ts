import "server-only";
import { hashInvitationToken, invitationPath } from "@/lib/server/invitation-token";
import { homeForRole } from "@/lib/auth/paths";
import { log } from "@/lib/server/log";

export const INVALID_INVITATION_PATH = "/invitacion/invalida";

export interface VisitDeps {
  userId(): Promise<string | null>;
  accept(token: string, userId: string): Promise<boolean>;
  refreshSession(): Promise<void>;
  roleOf(userId: string): Promise<string | null>;
}

/** Orquesta la visita al link del mail. El token nunca se acepta sin una sesión validada
 *  (getUser) y la decisión entera la toma accept_teacher_invitation en la base. */
export async function resolveInvitationVisit(token: string, deps: VisitDeps): Promise<string> {
  if (!hashInvitationToken(token)) return INVALID_INVITATION_PATH;

  const userId = await deps.userId();
  if (!userId) return `/entrar?next=${encodeURIComponent(invitationPath(token))}`;

  if (!(await deps.accept(token, userId))) return INVALID_INVITATION_PATH;

  // El proxy rutea por el claim user_role, que sigue diciendo student hasta que el token se
  // reemite; sin esto /panel/docente rebota a /panel hasta una hora. El permiso real lo sigue
  // decidiendo profiles.role (R-2), así que un refresh fallido degrada el ruteo, no la seguridad.
  try {
    await deps.refreshSession();
  } catch (err) {
    log.error("invitation_session_refresh_failed", { err });
  }
  return homeForRole(await deps.roleOf(userId));
}

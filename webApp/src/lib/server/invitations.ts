import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { getSiteUrl } from "@/lib/server/site-url";
import { notifyTeacherInvitation } from "@/lib/server/mail/notify";
import { hashInvitationToken, invitationPath, newInvitationToken } from "@/lib/server/invitation-token";

// Todo acá corre con service_role DESPUÉS de requireAdmin (invitar, revocar) o de getUser
// (aceptar). La tabla no tiene acceso de cliente: no hay otro camino.

export type InviteOutcome =
  | { kind: "created"; id: string; expiresAt: string; mailSent: boolean }
  | { kind: "pending_exists" }
  | { kind: "already_teacher" };

interface InviteInput {
  email: string;
  adminId: string;
  adminName: string;
}

const PENDING_CONSTRAINT = "teacher_invitations_pending_email";

export async function inviteTeacher(input: InviteInput): Promise<InviteOutcome> {
  const db = getAdminSupabaseClient();

  const { data: accounts, error: lookupError } = await db.rpc("admin_user_by_email", { p_email: input.email });
  if (lookupError) throw new Error(`No se pudo verificar la cuenta: ${lookupError.message}`);
  const account = Array.isArray(accounts) ? (accounts[0] as { id: string; role: string } | undefined) : undefined;
  if (account && account.role !== "student") return { kind: "already_teacher" };

  const { token, tokenHash } = newInvitationToken();
  const { data, error } = await db
    .from("teacher_invitations")
    .insert({ email: input.email, token_hash: tokenHash, invited_by: input.adminId })
    .select("id, expires_at")
    .single();

  // 23505 también lo da un choque de token_hash; solo el índice parcial significa "ya hay una".
  if (error?.code === "23505" && error.message.includes(PENDING_CONSTRAINT)) return { kind: "pending_exists" };
  if (error || !data) throw new Error(`No se pudo crear la invitación: ${error?.message ?? "sin fila"}`);

  const mailSent = await notifyTeacherInvitation({
    email: input.email,
    inviterName: input.adminName || "El equipo de Humano Despierto",
    acceptUrl: `${getSiteUrl()}${invitationPath(token)}`,
    expiresAt: data.expires_at,
  });
  return { kind: "created", id: data.id, expiresAt: data.expires_at, mailSent };
}

/** Reenviar = revocar la pendiente de ese mail y crear otra. No es atómico: si dos admins
 *  reenvían a la vez, el segundo recibe pending_exists, que es lo correcto. */
export async function reissueInvitation(input: InviteInput): Promise<InviteOutcome> {
  const db = getAdminSupabaseClient();
  const { error } = await db
    .from("teacher_invitations")
    .update({ revoked_at: new Date().toISOString(), revoked_by: input.adminId })
    .eq("email", input.email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (error) throw new Error(`No se pudo revocar la invitación anterior: ${error.message}`);
  return inviteTeacher(input);
}

export async function revokeInvitation(input: { id: string; adminId: string }): Promise<boolean> {
  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("teacher_invitations")
    .update({ revoked_at: new Date().toISOString(), revoked_by: input.adminId })
    .eq("id", input.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (error) throw new Error(`No se pudo revocar: ${error.message}`);
  return Array.isArray(data) && data.length === 1;
}

/** `false` para todo lo que no sea el caso legítimo, sin decir por qué (SP-4 c.3, c.4). */
export async function acceptInvitation(input: { token: string; userId: string }): Promise<boolean> {
  const tokenHash = hashInvitationToken(input.token);
  if (!tokenHash) return false;
  const db = getAdminSupabaseClient();
  const { data, error } = await db.rpc("accept_teacher_invitation", { p_token_hash: tokenHash, p_user_id: input.userId });
  if (error) {
    console.error(`[invitacion] la aceptación falló en la base: ${error.message}`);
    return false;
  }
  return data === true;
}

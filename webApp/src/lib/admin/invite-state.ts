import type { AdminActionState } from "./action-state";

// Sin `server-only`: los formularios cliente importan el estado inicial (mismo motivo que action-state.ts).
export interface InviteActionState extends AdminActionState {
  resendEmail: string | null;
}

export const INVITE_ACTION_INITIAL_STATE: InviteActionState = { error: null, success: null, resendEmail: null };

export const INVITE_COPY = {
  invalidEmail: "Escribí un mail válido.",
  pendingExists: "Ya hay una invitación pendiente para ese mail. Podés reenviarla: la anterior deja de valer.",
  alreadyTeacher: "Esa cuenta ya es docente o admin.",
  revoked: "Invitación revocada.",
  notPending: "Esa invitación ya no estaba pendiente.",
} as const;

export function inviteSuccess(kind: "enviada" | "reenviada", email: string, expiresOn: string, mailSent: boolean): string {
  const base = `Invitación ${kind} a ${email}, vence el ${expiresOn}.`;
  return mailSent ? base : `${base} El mail no salió: usá Reenviar.`;
}

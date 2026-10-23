"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/admin";
import { inviteTeacher, reissueInvitation, revokeInvitation, type InviteOutcome } from "@/lib/server/invitations";
import { normalizeEmail } from "@/lib/admin/email";
import { INVITE_COPY, inviteSuccess, type InviteActionState } from "@/lib/admin/invite-state";
import type { AdminActionState } from "@/lib/admin/action-state";
import { formatCertificateDate } from "@/lib/utils/format";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

const INVITATIONS_PATH = "/panel/admin/invitaciones";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toState(outcome: InviteOutcome, email: string, kind: "enviada" | "reenviada"): InviteActionState {
  switch (outcome.kind) {
    case "created":
      return {
        error: null,
        success: inviteSuccess(kind, email, formatCertificateDate(outcome.expiresAt), outcome.mailSent),
        resendEmail: null,
      };
    case "pending_exists":
      return { error: INVITE_COPY.pendingExists, success: null, resendEmail: email };
    case "already_teacher":
      return { error: INVITE_COPY.alreadyTeacher, success: null, resendEmail: null };
  }
}

export const inviteTeacherAction = withRateLimit(
  "inviteTeacherAction",
  async function inviteTeacherAction(_prev: InviteActionState, formData: FormData): Promise<InviteActionState> {
    const admin = await requireAdmin();
    const email = normalizeEmail(formData.get("email"));
    if (!email) return { error: INVITE_COPY.invalidEmail, success: null, resendEmail: null };
    const outcome = await inviteTeacher({ email, adminId: admin.id, adminName: admin.fullName ?? "" });
    revalidatePath(INVITATIONS_PATH);
    return toState(outcome, email, "enviada");
  },
  (denied) => ({ ...limitedState(denied), resendEmail: null }),
);

export const resendInvitationAction = withRateLimit(
  "resendInvitationAction",
  async function resendInvitationAction(_prev: InviteActionState, formData: FormData): Promise<InviteActionState> {
    const admin = await requireAdmin();
    const email = normalizeEmail(formData.get("email"));
    if (!email) return { error: INVITE_COPY.invalidEmail, success: null, resendEmail: null };
    const outcome = await reissueInvitation({ email, adminId: admin.id, adminName: admin.fullName ?? "" });
    revalidatePath(INVITATIONS_PATH);
    return toState(outcome, email, "reenviada");
  },
  (denied) => ({ ...limitedState(denied), resendEmail: null }),
);

export const revokeInvitationAction = withRateLimit(
  "revokeInvitationAction",
  async function revokeInvitationAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
    const admin = await requireAdmin();
    const id = String(formData.get("invitationId") ?? "");
    if (!UUID.test(id)) return { error: "Datos inválidos.", success: null };
    const revoked = await revokeInvitation({ id, adminId: admin.id });
    revalidatePath(INVITATIONS_PATH);
    return revoked ? { error: null, success: INVITE_COPY.revoked } : { error: INVITE_COPY.notPending, success: null };
  },
  limitedState,
);

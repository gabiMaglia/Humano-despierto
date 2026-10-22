"use client";

import { useActionState } from "react";
import { revokeInvitationAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import type { AdminInvitationRow } from "@/lib/server/admin-lists";
import { formatCertificateDate } from "@/lib/utils/format";
import ResendInvitationButton from "./ResendInvitationButton";

function detail(i: AdminInvitationRow): string {
  switch (i.status) {
    case "pendiente":
      return `Pendiente · vence el ${formatCertificateDate(i.expiresAt)}`;
    case "vencida":
      return `Vencida el ${formatCertificateDate(i.expiresAt)}`;
    case "aceptada":
      return `Aceptada el ${formatCertificateDate(i.acceptedAt ?? i.expiresAt)}`;
    case "revocada":
      return `Revocada el ${formatCertificateDate(i.revokedAt ?? i.expiresAt)}`;
  }
}

export default function InvitationRow({ invitation }: { invitation: AdminInvitationRow }) {
  const [state, revoke, isPending] = useActionState(revokeInvitationAction, ADMIN_ACTION_INITIAL_STATE);
  const pending = invitation.status === "pendiente";
  return (
    <li className="cosmos-card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm tracking-wide text-ink">{invitation.email}</p>
        <p className="font-body text-xs text-ink-faint">{detail(invitation)}</p>
      </div>
      {pending && (
        <form action={revoke}>
          <input type="hidden" name="invitationId" value={invitation.id} />
          <button
            type="submit"
            disabled={isPending}
            className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "…" : "Revocar"}
          </button>
        </form>
      )}
      {(pending || invitation.status === "vencida") && <ResendInvitationButton email={invitation.email} label="Reenviar" />}
      <div className="w-full">
        <ActionFeedback state={state} />
      </div>
    </li>
  );
}

"use client";

import { useActionState } from "react";
import { revokeInvitationAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import Button from "@/components/atoms/Button";
import { PanelRow, RowMain } from "@/components/panel/PanelRow";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import { INVITATION_STATUS } from "@/lib/panel/status";
import type { AdminInvitationRow } from "@/lib/server/admin-lists";
import { formatCertificateDate } from "@/lib/utils/format";
import ResendInvitationButton from "./ResendInvitationButton";

function detail(i: AdminInvitationRow): string {
  switch (i.status) {
    case "pendiente":
      return `Vence el ${formatCertificateDate(i.expiresAt)}`;
    case "vencida":
      return `Venció el ${formatCertificateDate(i.expiresAt)}`;
    case "aceptada":
      return `Aceptada el ${formatCertificateDate(i.acceptedAt ?? i.expiresAt)}`;
    case "revocada":
      return `Revocada el ${formatCertificateDate(i.revokedAt ?? i.expiresAt)}`;
  }
}

export default function InvitationRow({ invitation }: { invitation: AdminInvitationRow }) {
  const [state, revoke, isPending] = useActionState(revokeInvitationAction, ADMIN_ACTION_INITIAL_STATE);
  const pending = invitation.status === "pendiente";
  const look = INVITATION_STATUS[invitation.status];
  return (
    <PanelRow>
      <RowMain title={invitation.email} meta={detail(invitation)} />
      <StatusChip tone={look.tone}>{look.label}</StatusChip>
      {pending && (
        <form action={revoke}>
          <input type="hidden" name="invitationId" value={invitation.id} />
          <Button type="submit" variant="danger" size="sm" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Revocando…" : "Revocar"}
          </Button>
        </form>
      )}
      {(pending || invitation.status === "vencida") && <ResendInvitationButton email={invitation.email} label="Reenviar" size="sm" />}
      <StatusMessage error={state.error} success={state.success} className="w-full" />
    </PanelRow>
  );
}

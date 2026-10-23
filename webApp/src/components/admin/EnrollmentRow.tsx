"use client";

import { useActionState } from "react";
import { approveEnrollmentRequestAction, setEnrollmentAction } from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import { PanelRow, RowMain } from "@/components/panel/PanelRow";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import { ENROLLMENT_STATUS, statusOf } from "@/lib/panel/status";
import type { AdminEnrollmentRow } from "@/lib/server/admin";

export default function EnrollmentRow({ enrollment }: { enrollment: AdminEnrollmentRow }) {
  const [toggleState, toggleAction, toggling] = useActionState(setEnrollmentAction, ADMIN_ACTION_INITIAL_STATE);
  // Una `rejected` se reconsidera con la misma acción que una pendiente (c.9): reescribe
  // `enrolled_at`, firma con la admin y manda los mails de alta.
  const [approveState, approveAction, approving] = useActionState(approveEnrollmentRequestAction, ADMIN_ACTION_INITIAL_STATE);

  const state = enrollment.status === "rejected" ? approveState : toggleState;
  const nextStatus = enrollment.status === "active" ? "revoked" : "active";
  const look = statusOf(ENROLLMENT_STATUS, enrollment.status);

  return (
    <PanelRow>
      <RowMain
        title={
          <>
            {enrollment.userName} <span aria-hidden="true" className="text-suave">→</span> {enrollment.courseTitle}
          </>
        }
        meta={enrollment.grantedByName ? `Otorgada por ${enrollment.grantedByName}` : undefined}
      >
        {enrollment.decidedReason && <p className="text-sm text-suave">Motivo: {enrollment.decidedReason}</p>}
      </RowMain>

      <StatusChip tone={look.tone}>{look.label}</StatusChip>

      {enrollment.status === "rejected" ? (
        <form action={approveAction} className="flex-none">
          <input type="hidden" name="enrollmentId" value={enrollment.id} />
          <Button type="submit" variant="outline" size="sm" disabled={approving} aria-busy={approving}>
            {approving ? "Aprobando…" : "Aprobar"}
          </Button>
        </form>
      ) : (
        <form action={toggleAction} className="flex-none">
          <input type="hidden" name="userId" value={enrollment.userId} />
          <input type="hidden" name="courseId" value={enrollment.courseId} />
          <input type="hidden" name="status" value={nextStatus} />
          <Button type="submit" variant={enrollment.status === "active" ? "danger" : "outline"} size="sm" disabled={toggling} aria-busy={toggling}>
            {toggling ? "Un momento…" : enrollment.status === "active" ? "Dar de baja" : "Reactivar"}
          </Button>
        </form>
      )}

      <StatusMessage error={state.error} success={state.success} className="w-full" />
    </PanelRow>
  );
}

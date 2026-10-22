"use client";

import { useActionState } from "react";
import { approveEnrollmentRequestAction, setEnrollmentAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { AdminEnrollmentRow, EnrollmentStatus } from "@/lib/server/admin";

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  requested: "Solicitada",
  active: "Activa",
  revoked: "Dada de baja",
  rejected: "No aprobada",
};

const BUTTON =
  "btn btn-outline text-[10px] disabled:cursor-not-allowed disabled:opacity-60";

export default function EnrollmentRow({ enrollment }: { enrollment: AdminEnrollmentRow }) {
  const [toggleState, toggleAction, toggling] = useActionState(setEnrollmentAction, ADMIN_ACTION_INITIAL_STATE);
  // Una `rejected` se reconsidera con la misma acción que una pendiente (c.9): reescribe
  // `enrolled_at`, firma con la admin y manda los mails de alta.
  const [approveState, approveAction, approving] = useActionState(
    approveEnrollmentRequestAction,
    ADMIN_ACTION_INITIAL_STATE
  );

  const state = enrollment.status === "rejected" ? approveState : toggleState;
  const nextStatus = enrollment.status === "active" ? "revoked" : "active";

  return (
    <li className="tarjeta flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm tracking-wide text-tinta">
          {enrollment.userName} <span className="text-suave">→</span> {enrollment.courseTitle}
        </p>
        <p className="font-body text-xs text-suave">
          {STATUS_LABEL[enrollment.status]}
          {enrollment.grantedByName ? ` · otorgada por ${enrollment.grantedByName}` : ""}
        </p>
        {enrollment.decidedReason && (
          <p className="font-quote italic text-xs text-suave">Motivo: {enrollment.decidedReason}</p>
        )}
      </div>

      {enrollment.status === "rejected" ? (
        <form action={approveAction} className="flex-none">
          <input type="hidden" name="enrollmentId" value={enrollment.id} />
          <button type="submit" disabled={approving} className={BUTTON}>
            {approving ? "…" : "Aprobar"}
          </button>
        </form>
      ) : (
        <form action={toggleAction} className="flex-none">
          <input type="hidden" name="userId" value={enrollment.userId} />
          <input type="hidden" name="courseId" value={enrollment.courseId} />
          <input type="hidden" name="status" value={nextStatus} />
          <button type="submit" disabled={toggling} className={BUTTON}>
            {toggling ? "…" : enrollment.status === "active" ? "Dar de baja" : "Reactivar"}
          </button>
        </form>
      )}

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && <p className="w-full font-body text-xs text-miel-800">{state.success}</p>}
    </li>
  );
}

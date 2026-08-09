"use client";

import { useActionState } from "react";
import { setEnrollmentAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { AdminEnrollmentRow } from "@/lib/server/admin";

export default function EnrollmentRow({ enrollment }: { enrollment: AdminEnrollmentRow }) {
  const [state, formAction, isPending] = useActionState(
    setEnrollmentAction,
    ADMIN_ACTION_INITIAL_STATE
  );

  const nextStatus = enrollment.status === "active" ? "revoked" : "active";

  return (
    <li className="cosmos-card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm tracking-wide text-ink">
          {enrollment.userName} <span className="text-ink-faint">→</span> {enrollment.courseTitle}
        </p>
        <p className="font-body text-xs text-ink-faint">
          {enrollment.status === "active" ? "Activa" : "Dada de baja"}
          {enrollment.grantedByName ? ` · otorgada por ${enrollment.grantedByName}` : ""}
        </p>
      </div>

      <form action={formAction} className="flex-none">
        <input type="hidden" name="userId" value={enrollment.userId} />
        <input type="hidden" name="courseId" value={enrollment.courseId} />
        <input type="hidden" name="status" value={nextStatus} />
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : enrollment.status === "active" ? "Dar de baja" : "Reactivar"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="w-full font-body text-xs text-lila-300">{state.success}</p>
      )}
    </li>
  );
}

"use client";

import { useActionState } from "react";
import {
  approveEnrollmentRequestAction,
  rejectEnrollmentRequestAction,
} from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import { REASON_MAX } from "@/lib/enrollment/messages";
import type { AdminEnrollmentRequestRow } from "@/lib/server/admin";
import { formatCertificateDate } from "@/lib/utils/format";

const BUTTON =
  "btn btn-outline text-[10px] disabled:cursor-not-allowed disabled:opacity-60";

export default function EnrollmentRequestRow({ request }: { request: AdminEnrollmentRequestRow }) {
  const [approveState, approveAction, approving] = useActionState(
    approveEnrollmentRequestAction,
    ADMIN_ACTION_INITIAL_STATE
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectEnrollmentRequestAction,
    ADMIN_ACTION_INITIAL_STATE
  );
  const busy = approving || rejecting;
  const reasonId = `motivo-${request.id}`;
  const error = approveState.error ?? rejectState.error;
  const success = approveState.success ?? rejectState.success;

  return (
    <li className="tarjeta space-y-3 p-4">
      <div>
        <p className="font-display text-sm tracking-wide text-tinta">
          {request.userName} <span className="text-suave">→</span> {request.courseTitle}
        </p>
        <p className="font-body text-xs text-suave">Pedida el {formatCertificateDate(request.requestedAt)}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form action={approveAction} className="flex-none">
          <input type="hidden" name="enrollmentId" value={request.id} />
          <button type="submit" disabled={busy} className={BUTTON}>
            {approving ? "…" : "Aprobar"}
          </button>
        </form>

        <form action={rejectAction} className="flex min-w-[220px] flex-1 flex-wrap items-end gap-3">
          <input type="hidden" name="enrollmentId" value={request.id} />
          <div className="min-w-[200px] flex-1">
            <label htmlFor={reasonId} className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
              Motivo (opcional, lo lee la alumna)
            </label>
            <textarea
              id={reasonId}
              name="reason"
              rows={2}
              maxLength={REASON_MAX}
              className="w-full rounded-md border border-linea bg-papel px-3 py-2 font-body text-xs text-tinta outline-none transition-colors focus:border-linea focus:bg-fondo"
            />
          </div>
          <button type="submit" disabled={busy} className={BUTTON}>
            {rejecting ? "…" : "Rechazar"}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="font-body text-xs text-error">
          {error}
        </p>
      )}
      {success && <p className="font-body text-xs text-miel-800">{success}</p>}
    </li>
  );
}

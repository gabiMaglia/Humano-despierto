"use client";

import { useActionState } from "react";
import {
  approveEnrollmentRequestAction,
  rejectEnrollmentRequestAction,
} from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import { PanelTextarea } from "@/components/panel/PanelField";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import { REASON_MAX } from "@/lib/enrollment/messages";
import type { AdminEnrollmentRequestRow } from "@/lib/server/admin";
import { formatCertificateDate } from "@/lib/utils/format";

export default function EnrollmentRequestRow({ request }: { request: AdminEnrollmentRequestRow }) {
  const [approveState, approveAction, approving] = useActionState(approveEnrollmentRequestAction, ADMIN_ACTION_INITIAL_STATE);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectEnrollmentRequestAction, ADMIN_ACTION_INITIAL_STATE);
  const busy = approving || rejecting;
  const error = approveState.error ?? rejectState.error;
  const success = approveState.success ?? rejectState.success;

  return (
    <li className="tarjeta space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-semibold text-tinta [overflow-wrap:anywhere]">
            {request.userName} <span aria-hidden="true" className="text-suave">→</span>
            <span className="sr-only"> pidió </span> {request.courseTitle}
          </p>
          <p className="text-sm tabular-nums text-suave">Pedida el {formatCertificateDate(request.requestedAt)}</p>
        </div>
        <StatusChip tone="accent">Solicitada</StatusChip>
      </div>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <form action={approveAction} className="flex-none">
          <input type="hidden" name="enrollmentId" value={request.id} />
          <Button type="submit" size="sm" disabled={busy} aria-busy={approving}>
            {approving ? "Aprobando…" : "Aprobar"}
          </Button>
        </form>

        <form action={rejectAction} className="flex min-w-56 flex-1 flex-wrap items-start gap-3">
          <input type="hidden" name="enrollmentId" value={request.id} />
          <PanelTextarea className="min-w-48 flex-1" label="Motivo (opcional, lo lee la alumna)" name="reason" rows={2} maxLength={REASON_MAX} />
          <Button type="submit" variant="danger" size="sm" disabled={busy} aria-busy={rejecting} className="sm:mt-[1.625rem]">
            {rejecting ? "Rechazando…" : "Rechazar"}
          </Button>
        </form>
      </div>

      <StatusMessage error={error} success={success} />
    </li>
  );
}

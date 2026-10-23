"use client";

import { useActionState } from "react";
import { dismissReportAction, hideReviewAction, unhideReviewAction } from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import { PanelTextarea } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";

// La misma reseña puede aparecer en la cola y en recientes: el id del campo sale de useId (en PanelField).
export function HideReviewForm({ reviewId }: { reviewId: string }) {
  const [state, formAction, isPending] = useActionState(hideReviewAction.bind(null, reviewId), ADMIN_ACTION_INITIAL_STATE);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <PanelTextarea label="Motivo para ocultar" name="reason" rows={2} maxLength={1000} required error={state.error} />
      <Button type="submit" variant="danger" size="sm" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Ocultando…" : "Ocultar reseña"}
      </Button>
    </form>
  );
}

export function DismissReportButton({ reportId }: { reportId: string }) {
  const [state, formAction, isPending] = useActionState(dismissReportAction.bind(null, reportId), ADMIN_ACTION_INITIAL_STATE);
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <StatusMessage error={state.error} success={state.success} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Desestimando…" : "Desestimar reporte"}
      </Button>
    </form>
  );
}

export function UnhideReviewButton({ reviewId }: { reviewId: string }) {
  const [state, formAction, isPending] = useActionState(unhideReviewAction.bind(null, reviewId), ADMIN_ACTION_INITIAL_STATE);
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <StatusMessage error={state.error} success={state.success} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Mostrando…" : "Volver a mostrar"}
      </Button>
    </form>
  );
}

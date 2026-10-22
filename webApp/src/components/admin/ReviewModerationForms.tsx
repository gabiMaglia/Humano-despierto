"use client";

import { useActionState, useId } from "react";
import { dismissReportAction, hideReviewAction, unhideReviewAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import ActionFeedback from "@/components/reviews/ActionFeedback";

// La misma reseña puede aparecer en la cola y en recientes: el id del campo sale de useId.
export function HideReviewForm({ reviewId }: { reviewId: string }) {
  const [state, formAction, isPending] = useActionState(
    hideReviewAction.bind(null, reviewId),
    ADMIN_ACTION_INITIAL_STATE,
  );
  const fieldId = useId();
  return (
    <form action={formAction} className="mt-4">
      <label htmlFor={fieldId} className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
        Motivo para ocultar
      </label>
      <textarea
        id={fieldId}
        name="reason"
        rows={2}
        maxLength={1000}
        required
        className="w-full rounded-md border border-linea bg-fondo px-3 py-2 font-body text-sm text-tinta outline-none focus:border-linea"
      />
      <ActionFeedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Ocultando…" : "Ocultar reseña"}
      </button>
    </form>
  );
}

export function DismissReportButton({ reportId }: { reportId: string }) {
  const [state, formAction, isPending] = useActionState(
    dismissReportAction.bind(null, reportId),
    ADMIN_ACTION_INITIAL_STATE,
  );
  return (
    <form action={formAction} className="mt-3">
      <ActionFeedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Desestimando…" : "Desestimar reporte"}
      </button>
    </form>
  );
}

export function UnhideReviewButton({ reviewId }: { reviewId: string }) {
  const [state, formAction, isPending] = useActionState(
    unhideReviewAction.bind(null, reviewId),
    ADMIN_ACTION_INITIAL_STATE,
  );
  return (
    <form action={formAction} className="mt-3">
      <ActionFeedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Mostrando…" : "Volver a mostrar"}
      </button>
    </form>
  );
}

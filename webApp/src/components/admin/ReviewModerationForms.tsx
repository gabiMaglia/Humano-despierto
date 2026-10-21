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
      <label htmlFor={fieldId} className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-faint">
        Motivo para ocultar
      </label>
      <textarea
        id={fieldId}
        name="reason"
        rows={2}
        maxLength={1000}
        required
        className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink outline-none focus:border-lila-300/40"
      />
      <ActionFeedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="btn-ritual btn-ritual-primary mt-3 rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
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
        className="btn-ritual btn-ritual-ghost rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
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
        className="btn-ritual btn-ritual-ghost rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Mostrando…" : "Volver a mostrar"}
      </button>
    </form>
  );
}

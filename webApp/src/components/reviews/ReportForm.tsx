"use client";

import { useActionState } from "react";
import { reportReviewAction, type ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";
import ActionFeedback from "@/components/reviews/ActionFeedback";

const INICIAL: ReviewActionState = { error: null, success: null };

/** La guía dueña (o el admin) reporta una reseña (ADR-012). Plegado por defecto: es un recurso
 *  excepcional y no tiene que competir con "Responder en público". */
export default function ReportForm({ reviewId, slug }: { reviewId: string; slug: string }) {
  const [state, formAction, isPending] = useActionState(
    reportReviewAction.bind(null, reviewId, slug),
    INICIAL,
  );
  const fieldId = `report-${reviewId}`;
  const helpId = `${fieldId}-ayuda`;

  return (
    <details className="mt-3">
      <summary className="cursor-pointer font-display text-eyebrow tracking-cosmic text-ink-faint hover:text-ink-soft">
        Reportar al admin
      </summary>
      <form action={formAction} className="mt-3 border-l-2 border-lila-300/30 pl-4">
        <label htmlFor={fieldId} className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-faint">
          Motivo del reporte
        </label>
        <p id={helpId} className="mb-2 font-body text-xs text-ink-faint">
          Lo lee solo el equipo de administración. La reseña sigue visible mientras se revisa.
        </p>
        <textarea
          id={fieldId}
          name="reason"
          rows={3}
          maxLength={1000}
          required
          aria-describedby={helpId}
          className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink outline-none focus:border-lila-300/40"
        />
        <ActionFeedback state={state} />
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-ghost mt-3 rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Enviando…" : "Enviar reporte"}
        </button>
      </form>
    </details>
  );
}

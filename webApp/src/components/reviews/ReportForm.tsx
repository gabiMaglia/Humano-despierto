"use client";

import { useActionState } from "react";
import { reportReviewAction, type ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import Button from "@/components/atoms/Button";

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
      <summary className="cursor-pointer font-display text-eyebrow tracking-wide text-suave hover:text-suave">
        Reportar al admin
      </summary>
      <form action={formAction} className="mt-3 border-l-2 border-linea pl-4">
        <label htmlFor={fieldId} className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
          Motivo del reporte
        </label>
        <p id={helpId} className="mb-2 font-body text-xs text-suave">
          Lo lee solo el equipo de administración. La reseña sigue visible mientras se revisa.
        </p>
        <textarea
          id={fieldId}
          name="reason"
          rows={3}
          maxLength={1000}
          required
          aria-describedby={helpId}
          className="w-full rounded-md border border-linea bg-fondo px-3 py-2 font-body text-sm text-tinta"
        />
        <ActionFeedback state={state} />
        <Button type="submit" variant="outline" disabled={isPending} className="mt-3">
          {isPending ? "Enviando…" : "Enviar reporte"}
        </Button>
      </form>
    </details>
  );
}

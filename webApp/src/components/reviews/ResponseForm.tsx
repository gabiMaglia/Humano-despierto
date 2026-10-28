"use client";

import { useActionState } from "react";
import { respondReviewAction, type ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import Button from "@/components/atoms/Button";

const INICIAL: ReviewActionState = { error: null, success: null };

/** La guía dueña responde en público (c.5). Se muestra solo a ella, pero quien decide es la base:
 *  RLS filtra la fila y el guard firma la respuesta con su sesión. */
export default function ResponseForm({ reviewId, slug }: { reviewId: string; slug: string }) {
  const [state, formAction, isPending] = useActionState(
    respondReviewAction.bind(null, reviewId, slug),
    INICIAL,
  );
  const fieldId = `response-${reviewId}`;

  return (
    <form action={formAction} className="mt-4 border-l-2 border-linea pl-4">
      <label htmlFor={fieldId} className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
        Responder en público
      </label>
      <textarea
        id={fieldId}
        name="response"
        rows={3}
        maxLength={2000}
        required
        className="w-full rounded-md border border-linea bg-fondo px-3 py-2 font-body text-sm text-tinta"
      />
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending} className="mt-3">
        {isPending ? "Publicando…" : "Publicar respuesta"}
      </Button>
    </form>
  );
}

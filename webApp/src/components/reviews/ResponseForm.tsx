"use client";

import { useActionState } from "react";
import { respondReviewAction, type ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";
import ActionFeedback from "@/components/reviews/ActionFeedback";

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
    <form action={formAction} className="mt-4 border-l-2 border-lila-300/30 pl-4">
      <label htmlFor={fieldId} className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-faint">
        Responder en público
      </label>
      <textarea
        id={fieldId}
        name="response"
        rows={3}
        maxLength={2000}
        required
        className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink outline-none focus:border-lila-300/40"
      />
      <ActionFeedback state={state} />
      <button
        type="submit"
        disabled={isPending}
        className="btn-ritual btn-ritual-primary mt-3 rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Publicando…" : "Publicar respuesta"}
      </button>
    </form>
  );
}

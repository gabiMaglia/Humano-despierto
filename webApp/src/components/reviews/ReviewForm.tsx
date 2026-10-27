"use client";

import { useActionState, useState } from "react";
import Icon from "@/components/atoms/Icon";
import { saveReviewAction, type ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import { cn } from "@/lib/utils/cn";
import type { CourseReview } from "@/lib/server/reviews";
import Button from "@/components/atoms/Button";

const INICIAL: ReviewActionState = { error: null, success: null };

/** El rating se elige con botones y no con un `<select>` para que las estrellas sean §4 puras.
 *  Cada botón lleva su texto en `.sr-only`: una fila de `★` sin nombre accesible es una fila de
 *  botones sin etiqueta (X-01). */
export default function ReviewForm({
  courseId,
  slug,
  own,
}: {
  courseId: string;
  slug: string;
  own: CourseReview | null;
}) {
  const [rating, setRating] = useState(own?.rating ?? 0);
  const [state, formAction, isPending] = useActionState(
    saveReviewAction.bind(null, courseId, slug),
    INICIAL,
  );

  return (
    <form action={formAction} className="rounded-md border border-linea bg-papel p-6">
      <p className="mb-4 font-display text-eyebrow tracking-wide text-suave">
        {own ? "— Editá tu testimonio —" : "— Dejá tu testimonio —"}
      </p>

      <input type="hidden" name="rating" value={rating} />
      <div className="mb-4 flex items-center gap-1" role="group" aria-label="Puntuación">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-pressed={rating === n}
            className={cn(
              "rounded-md p-1 transition-colors",
              n <= rating ? "text-miel" : "text-suave hover:text-miel-800",
            )}
          >
            <Icon name="star" filled={n <= rating} className="h-7 w-7" />
            <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
          </button>
        ))}
      </div>

      <label htmlFor="review-body" className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
        Tu experiencia (opcional)
      </label>
      <textarea
        id="review-body"
        name="body"
        rows={4}
        defaultValue={own?.body ?? ""}
        className="w-full rounded-md border border-linea bg-fondo px-3 py-2 font-body text-sm text-tinta"
      />

      <ActionFeedback state={state} />

      <Button type="submit" disabled={isPending || rating === 0} className="mt-4">
        {isPending ? "Guardando…" : own ? "Guardar cambios" : "Publicar testimonio"}
      </Button>
    </form>
  );
}

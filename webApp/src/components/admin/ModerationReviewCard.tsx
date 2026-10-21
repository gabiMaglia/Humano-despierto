import Stars from "@/components/reviews/Stars";
import { formatCertificateDate } from "@/lib/utils/format";
import type { ModerationReview } from "@/lib/server/reviews-admin";

/** La reseña completa, como la ve el admin al decidir. */
export default function ModerationReviewCard({ review: r }: { review: ModerationReview }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Stars value={r.rating} />
        <span className="font-display text-sm tracking-wide text-lila-300">{r.authorName}</span>
        <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
          {r.courseTitle} · {formatCertificateDate(r.updatedAt)}
        </span>
      </div>
      {r.body ? (
        <p className="whitespace-pre-line font-body text-sm text-ink-soft leading-relaxed">{r.body}</p>
      ) : (
        <p className="font-body text-sm italic text-ink-faint">Solo puntuación, sin texto.</p>
      )}
      {r.response && (
        <div className="mt-3 border-l-2 border-lila-300/30 pl-4">
          <p className="mb-1 font-display text-eyebrow tracking-cosmic text-lila-300">Respuesta de la guía</p>
          <p className="font-body text-sm text-ink-soft leading-relaxed">{r.response}</p>
        </div>
      )}
    </div>
  );
}

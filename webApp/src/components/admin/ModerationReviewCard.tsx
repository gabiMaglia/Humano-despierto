import Stars from "@/components/reviews/Stars";
import { formatCertificateDate } from "@/lib/utils/format";
import type { ModerationReview } from "@/lib/server/reviews-admin";

/** La reseña completa, como la ve el admin al decidir. */
export default function ModerationReviewCard({ review: r }: { review: ModerationReview }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} />
        <span className="font-semibold text-bosque">{r.authorName}</span>
        <span className="text-sm tabular-nums text-suave">
          {r.courseTitle} · {formatCertificateDate(r.updatedAt)}
        </span>
      </div>
      {r.body ? (
        <p className="whitespace-pre-line text-base leading-relaxed text-tinta">{r.body}</p>
      ) : (
        <p className="text-base text-suave">Solo puntuación, sin texto.</p>
      )}
      {r.response && (
        <div className="mt-3 border-l-2 border-salvia pl-4">
          <p className="mb-1 text-sm font-semibold text-bosque">Respuesta de la guía</p>
          <p className="text-base leading-relaxed text-suave">{r.response}</p>
        </div>
      )}
    </div>
  );
}

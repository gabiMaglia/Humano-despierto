import SectionDivider from "@/components/atoms/SectionDivider";
import Stars from "@/components/reviews/Stars";
import ReviewForm from "@/components/reviews/ReviewForm";
import ResponseForm from "@/components/reviews/ResponseForm";
import ReportForm from "@/components/reviews/ReportForm";
import { REVIEWS_ANCHOR } from "@/lib/reviews/links.mjs";
import { formatCertificateDate } from "@/lib/utils/format";
import { REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/reviews/report-status";
import type { CourseReview, CourseReviewsData } from "@/lib/server/reviews";

/** Un curso NUEVO sin reseñas y un curso MALO no se pueden ver igual (criterio 3). Por eso el
 *  vacío dice lo que pasa en vez de mostrar "0.0 ★", que se lee como una calificación pésima. */
function SinResenas({ puedeResenar }: { puedeResenar: boolean }) {
  return (
    <p className="text-center font-quote italic text-base text-ink-soft">
      {puedeResenar
        ? "Todavía nadie dejó su testimonio. Podés ser la primera."
        : "Este curso todavía no recibió testimonios."}
    </p>
  );
}

export default function ReviewsSection({
  data,
  courseId,
  slug,
}: {
  data: CourseReviewsData;
  courseId: string;
  slug: string;
}) {
  const { summary, reviews, own, canReview, featured, viewerIsOwner, viewerCanReport, viewerReports } = data;
  // La destacada va arriba y no se repite en la lista.
  const resto = featured ? reviews.filter((r) => r.id !== featured.id) : reviews;

  return (
    // El id es el ancla del mail de curso completado (c.7): `scroll-mt` deja aire bajo el header.
    <section id={REVIEWS_ANCHOR} className="scroll-mt-24 border-t border-lila-300/18 px-6 py-16 md:px-12">
      <div className="mx-auto max-w-3xl">
        <SectionDivider label="Lo que dicen quienes lo hicieron" className="mb-10" />

        {summary.total === 0 ? (
          <SinResenas puedeResenar={canReview} />
        ) : (
          <div className="mb-12 flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-12">
            <div className="flex-none text-center">
              <Stars value={summary.average} size="lg" showValue />
              <p className="mt-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
                {summary.total} {summary.total === 1 ? "testimonio" : "testimonios"}
              </p>
            </div>

            {/* Distribución por estrella — derivada de las filas, no guardada. */}
            <div className="w-full max-w-sm space-y-1.5">
              {[5, 4, 3, 2, 1].map((estrella) => {
                const n = summary.distribution[estrella - 1];
                const pct = summary.total > 0 ? (n / summary.total) * 100 : 0;
                return (
                  <div key={estrella} className="flex items-center gap-3">
                    <span className="w-12 flex-none font-display text-xs text-ink-faint">
                      <span aria-hidden="true">★</span> {estrella}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-lila-300/12">
                      <span className="block h-full bg-gold-400/60" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 flex-none text-right font-display text-xs text-ink-faint">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {canReview && <ReviewForm courseId={courseId} slug={slug} own={own} />}

        {featured && (
          <article
            aria-label="Testimonio destacado"
            className="mt-12 rounded-ritual border border-gold-400/30 bg-cosmos-surface p-6"
          >
            <p className="mb-3 font-display text-eyebrow tracking-cosmic text-gold-400">
              <span aria-hidden="true">✦ </span>Destacado
            </p>
            <ReviewItem
              review={featured}
              slug={slug}
              viewerIsOwner={viewerIsOwner}
              canReport={viewerCanReport}
              reportStatus={viewerReports[featured.id]}
            />
          </article>
        )}

        {resto.length > 0 && (
          <ul className="mt-12 space-y-8">
            {resto.map((r) => (
              <li key={r.id} className="border-t border-lila-300/12 pt-6 first:border-0 first:pt-0">
                <ReviewItem
                  review={r}
                  slug={slug}
                  viewerIsOwner={viewerIsOwner}
                  canReport={viewerCanReport}
                  reportStatus={viewerReports[r.id]}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReviewItem({
  review: r,
  slug,
  viewerIsOwner,
  canReport,
  reportStatus,
}: {
  review: CourseReview;
  slug: string;
  viewerIsOwner: boolean;
  canReport: boolean;
  reportStatus: ReportStatus | undefined;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Stars value={r.rating} />
        <span className="font-display text-sm tracking-wide text-lila-300">{r.authorName}</span>
        <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
          {formatCertificateDate(r.updatedAt)}
        </span>
      </div>
      {r.body && <p className="font-body text-sm text-ink-soft leading-relaxed">{r.body}</p>}
      {r.response ? (
        <div className="mt-4 border-l-2 border-lila-300/30 pl-4">
          <p className="mb-1 font-display text-eyebrow tracking-cosmic text-lila-300">
            Respuesta de la guía
          </p>
          <p className="font-body text-sm text-ink-soft leading-relaxed">{r.response}</p>
        </div>
      ) : (
        viewerIsOwner && <ResponseForm reviewId={r.id} slug={slug} />
      )}
      {reportStatus ? (
        <p className="mt-3 font-display text-eyebrow tracking-cosmic text-ink-faint">
          {REPORT_STATUS_LABEL[reportStatus]}
        </p>
      ) : (
        canReport && <ReportForm reviewId={r.id} slug={slug} />
      )}
    </>
  );
}

import SectionHeading from "@/components/atoms/SectionHeading";
import Icon from "@/components/atoms/Icon";
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
    <p className="text-suave">
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
    <section id={REVIEWS_ANCHOR} aria-labelledby="resenas-titulo" className="scroll-mt-24">
      <div>
        <SectionHeading id="resenas-titulo" size="md" title="Lo que dicen quienes lo hicieron" className="mb-8" />

        {summary.total === 0 ? (
          <SinResenas puedeResenar={canReview} />
        ) : (
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-12">
            <div className="flex-none">
              <Stars value={summary.average} size="lg" showValue />
              <p className="mt-2 text-sm text-suave">
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
                    <span className="flex w-12 flex-none items-center gap-1 text-sm text-suave">
                      <Icon name="star" className="h-3 w-3 text-miel" /> {estrella}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-salvia-100">
                      <span className="block h-full bg-miel" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 flex-none text-right text-sm text-suave">{n}</span>
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
            className="mt-10 rounded-lg border-[1.5px] border-miel bg-papel p-6"
          >
            <p className="mb-3 text-sm font-semibold text-miel-800">Destacado</p>
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
          <ul className="mt-10 space-y-8">
            {resto.map((r) => (
              <li key={r.id} className="border-t border-linea pt-6 first:border-0 first:pt-0">
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
        <span className="text-[15px] font-semibold text-bosque">{r.authorName}</span>
        <span className="text-sm text-suave">
          {formatCertificateDate(r.updatedAt)}
        </span>
      </div>
      {r.body && <p className="text-[15px] leading-relaxed text-tinta">{r.body}</p>}
      {r.response ? (
        <div className="mt-4 border-l-2 border-linea pl-4">
          <p className="mb-1 text-sm font-semibold text-bosque">
            Respuesta de la guía
          </p>
          <p className="text-[15px] leading-relaxed text-suave">{r.response}</p>
        </div>
      ) : (
        viewerIsOwner && <ResponseForm reviewId={r.id} slug={slug} />
      )}
      {reportStatus ? (
        <p className="mt-3 text-sm text-suave">
          {REPORT_STATUS_LABEL[reportStatus]}
        </p>
      ) : (
        canReport && <ReportForm reviewId={r.id} slug={slug} />
      )}
    </>
  );
}

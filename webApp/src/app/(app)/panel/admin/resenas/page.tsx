import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ModerationReviewCard from "@/components/admin/ModerationReviewCard";
import StatusChip from "@/components/panel/StatusChip";
import { DismissReportButton, HideReviewForm, UnhideReviewButton } from "@/components/admin/ReviewModerationForms";
import { requireAdmin } from "@/lib/server/admin";
import { listPendingReports, listRecentReviews } from "@/lib/server/reviews-admin";
import { formatCertificateDate } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Moderación de reseñas",
  robots: { index: false, follow: false },
};

export default async function AdminReviewsPage() {
  // El layout ya redirige a quien no es admin, pero layout y página renderizan en paralelo:
  // la lectura con service_role no puede depender de eso.
  await requireAdmin();
  const [pending, recent] = await Promise.all([listPendingReports(), listRecentReviews(50)]);

  return (
    <AdminShell
      active="resenas"
      heading="Moderación de reseñas"
    >
      <section aria-labelledby="cola-titulo">
        <h2 id="cola-titulo" className="mb-4 text-xl font-semibold text-bosque">
          Reportes pendientes
        </h2>
        {pending.length === 0 ? (
          // ADR-012 c.9: la cola vacía es el estado normal y tiene que verse deliberada.
          <p className="tarjeta p-6 text-suave">
            No hay reportes pendientes. Cuando una guía reporte una reseña,
            aparece acá con el texto completo.
          </p>
        ) : (
          <ul className="space-y-4">
            {pending.map((p) => (
              <li key={p.id}>
                <article aria-label={`Reporte de ${p.reporterName}`} className="tarjeta p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusChip tone="accent">Reporte pendiente</StatusChip>
                    <p className="text-sm tabular-nums text-suave">
                      Reportó {p.reporterName} · {formatCertificateDate(p.createdAt)}
                    </p>
                  </div>
                  <p className="mb-2 text-sm font-semibold text-suave">Motivo del reporte</p>
                  <p className="mb-5 text-base text-tinta">{p.reason}</p>
                  {p.review ? (
                    <>
                      <ModerationReviewCard review={p.review} />
                      {p.review.hiddenAt ? null : <HideReviewForm reviewId={p.review.id} />}
                    </>
                  ) : (
                    <p className="text-suave">La reseña ya no existe.</p>
                  )}
                  <DismissReportButton reportId={p.id} />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recientes-titulo">
        <h2 id="recientes-titulo" className="mb-4 text-xl font-semibold text-bosque">
          Reseñas recientes
        </h2>
        {recent.length === 0 ? (
          <p className="tarjeta p-5 text-suave">Todavía no hay reseñas.</p>
        ) : (
          <ul className="space-y-4">
            {recent.map((r) => (
              <li key={r.id} className="tarjeta p-6">
                {r.hiddenAt && (
                  <p className="mb-3 text-sm text-suave">
                    <StatusChip tone="error">Oculta</StatusChip> · {r.hiddenReason}
                  </p>
                )}
                <ModerationReviewCard review={r} />
                {r.hiddenAt ? <UnhideReviewButton reviewId={r.id} /> : <HideReviewForm reviewId={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

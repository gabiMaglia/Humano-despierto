import type { Metadata } from "next";
import Nav from "@/components/layout/Nav";
import AdminTabs from "@/components/admin/AdminTabs";
import ModerationReviewCard from "@/components/admin/ModerationReviewCard";
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
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <AdminTabs active="resenas" />
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Panel de administración —</p>
          <h1 className="font-display text-display-md text-ink">
            Moderación de <em className="font-quote italic text-lila-300">reseñas</em>
          </h1>
        </header>

        <div className="mx-auto max-w-4xl space-y-12 px-6 py-10 md:px-12">
          <section aria-labelledby="cola-titulo">
            <h2 id="cola-titulo" className="mb-5 font-display text-lg tracking-wide text-ink">
              Reportes pendientes
            </h2>
            {pending.length === 0 ? (
              // ADR-012 c.9: la cola vacía es el estado normal y tiene que verse deliberada.
              <p className="cosmos-card p-6 font-body text-sm text-ink-faint">
                <span aria-hidden="true">✧ </span>No hay reportes pendientes. Cuando una guía reporte una reseña,
                aparece acá con el texto completo.
              </p>
            ) : (
              <ul className="space-y-4">
                {pending.map((p) => (
                  <li key={p.id}>
                    <article aria-label={`Reporte de ${p.reporterName}`} className="cosmos-card p-6">
                      <p className="mb-1 font-display text-eyebrow tracking-cosmic text-gold-400">
                        Reportó {p.reporterName} · {formatCertificateDate(p.createdAt)}
                      </p>
                      <p className="mb-4 font-body text-sm text-ink">{p.reason}</p>
                      {p.review ? (
                        <>
                          <ModerationReviewCard review={p.review} />
                          {p.review.hiddenAt ? null : <HideReviewForm reviewId={p.review.id} />}
                        </>
                      ) : (
                        <p className="font-body text-sm italic text-ink-faint">La reseña ya no existe.</p>
                      )}
                      <DismissReportButton reportId={p.id} />
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="recientes-titulo">
            <h2 id="recientes-titulo" className="mb-5 font-display text-lg tracking-wide text-ink">
              Reseñas recientes
            </h2>
            {recent.length === 0 ? (
              <p className="font-body text-sm text-ink-faint">Todavía no hay reseñas.</p>
            ) : (
              <ul className="space-y-4">
                {recent.map((r) => (
                  <li key={r.id} className="cosmos-card p-6">
                    {r.hiddenAt && (
                      <p className="mb-2 font-display text-eyebrow tracking-cosmic text-gold-400">
                        Oculta · {r.hiddenReason}
                      </p>
                    )}
                    <ModerationReviewCard review={r} />
                    {r.hiddenAt ? <UnhideReviewButton reviewId={r.id} /> : <HideReviewForm reviewId={r.id} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

import { REPORT_STATUS_LABEL } from "@/lib/reviews/report-status";
import { formatCertificateDate } from "@/lib/utils/format";
import type { OwnReport } from "@/lib/server/reviews-admin";

/** La guía ve cómo terminaron sus reportes, sin quién resolvió ni el motivo interno (ADR-012). */
export default function TeacherReportList({ reports }: { reports: OwnReport[] }) {
  return (
    <section aria-labelledby="reportes-titulo" className="mx-auto max-w-4xl px-6 pb-10 md:px-12">
      <h2 id="reportes-titulo" className="mb-4 font-display text-lg tracking-wide text-ink">
        Reseñas que reportaste
      </h2>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="cosmos-card flex flex-wrap items-center gap-3 p-4">
            <span className="min-w-0 flex-1 font-body text-sm text-ink">{r.courseTitle ?? "Curso"}</span>
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
              {formatCertificateDate(r.createdAt)}
            </span>
            <span className="font-display text-eyebrow tracking-cosmic text-lila-300">
              {REPORT_STATUS_LABEL[r.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

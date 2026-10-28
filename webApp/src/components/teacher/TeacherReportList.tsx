import { REPORT_STATUS_LABEL } from "@/lib/reviews/report-status";
import { formatCertificateDate } from "@/lib/utils/format";
import type { OwnReport } from "@/lib/server/reviews-admin";
import PanelSection from "@/components/panel/PanelSection";
import StatusChip from "@/components/panel/StatusChip";

/** La guía ve cómo terminaron sus reportes, sin quién resolvió ni el motivo interno (ADR-012). */
export default function TeacherReportList({ reports }: { reports: OwnReport[] }) {
  return (
    <PanelSection id="reportes-titulo" title="Reseñas que reportaste">
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-2 p-4 tabular-nums">
            <span className="min-w-0 flex-1 basis-48 font-semibold text-tinta">{r.courseTitle ?? "Curso"}</span>
            <span className="text-sm text-suave">{formatCertificateDate(r.createdAt)}</span>
            <StatusChip tone="accent">{REPORT_STATUS_LABEL[r.status]}</StatusChip>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

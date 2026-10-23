import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
import { PanelRow, RowMain } from "@/components/panel/PanelRow";
import { requireTeacher } from "@/lib/server/teacher";
import { getCourseRoster } from "@/lib/server/teacher-metrics";
import { formatCertificateDate } from "@/lib/utils/format";
import { formatRating } from "@/lib/reviews/rating";

export const metadata: Metadata = {
  title: "Alumnas del curso",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ courseId: string }>;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tarjeta p-4 tabular-nums">
      <p className="text-sm font-semibold text-suave">{label}</p>
      <div className="mt-1 text-lg font-semibold text-bosque">{children}</div>
    </div>
  );
}

// Curso ajeno o inexistente: `getCourseRoster` devuelve null en ambos casos, misma respuesta.
export default async function CourseRosterPage({ params }: Props) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const roster = await getCourseRoster(courseId, teacher.id);
  if (!roster) notFound();

  const { summary, rows } = roster;
  const rating = formatRating(summary.ratingAverage, summary.ratingTotal);

  return (
    <PanelFrame
      title="Alumnas del curso"
      back={{ href: `/panel/docente/cursos/${courseId}`, label: roster.courseTitle }}
    >
      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Activas">{summary.active}</Stat>
        <Stat label="Completadas">{summary.completed}</Stat>
        <Stat label="Solicitudes">
          {summary.requested > 0
            ? `${summary.requested} pendiente${summary.requested === 1 ? "" : "s"}`
            : "Ninguna pendiente"}
          {summary.rejected > 0 && (
            <span className="block text-sm font-normal text-suave">
              {summary.rejected} no aprobada{summary.rejected === 1 ? "" : "s"}
            </span>
          )}
        </Stat>
        <Stat label="Reseñas">{rating ?? "Sin reseñas"}</Stat>
        <Stat label="Preguntas">
          {summary.openQuestions > 0 ? `${summary.openQuestions} sin responder` : "Ninguna sin responder"}
        </Stat>
      </section>

      <PanelSection id="inscriptas-titulo" title="Inscriptas">
        {rows.length === 0 ? (
          <p className="tarjeta p-6 text-suave">
            Todavía no hay alumnas inscriptas en este curso. Cuando se apruebe la primera
            solicitud, la vas a ver acá con su avance.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <PanelRow key={r.userId}>
                <RowMain title={r.name} meta={`Inscripta el ${formatCertificateDate(r.enrolledAt)}`} />
                <div className="w-44 flex-none">
                  <p className="text-sm font-semibold text-tinta">
                    {r.progressPercent} % <span className="font-normal text-suave">· {r.completedLessons} de {r.totalLessons}</span>
                  </p>
                  <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-pill bg-salvia-100">
                    <div className="h-full rounded-pill bg-bosque" style={{ width: `${Math.min(100, Math.max(0, r.progressPercent))}%` }} />
                  </div>
                </div>
                {r.certificateCode ? (
                  <Link href={`/certificado/${r.certificateCode}`} className="inline-flex min-h-10 items-center font-semibold text-miel-800 hover:underline">
                    Certificado
                  </Link>
                ) : (
                  <span className="text-suave">Sin certificado</span>
                )}
              </PanelRow>
            ))}
          </ul>
        )}
      </PanelSection>

      <p className="text-sm text-suave">
        Tus datos básicos (nombre, bio, foto) se editan en{" "}
        <Link href="/panel/perfil" className="font-semibold text-miel-800 hover:underline">
          tu perfil
        </Link>
        .
      </p>
    </PanelFrame>
  );
}

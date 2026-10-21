import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
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
    <div className="cosmos-card p-4">
      <p className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">{label}</p>
      <div className="mt-1 font-body text-ink">{children}</div>
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
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <Link
            href={`/panel/docente/cursos/${courseId}`}
            className="mb-2 inline-block font-display text-eyebrow tracking-[0.25em] text-ink-faint hover:text-lila-300"
          >
            ← {roster.courseTitle}
          </Link>
          <h1 className="font-display text-display-md text-ink">
            <em className="font-quote italic text-lila-300">Alumnas</em> del curso
          </h1>
        </header>

        <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 md:px-12">
          <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Activas">{summary.active}</Stat>
            <Stat label="Completadas">{summary.completed}</Stat>
            <Stat label="Solicitudes">
              {summary.requested > 0
                ? `${summary.requested} pendiente${summary.requested === 1 ? "" : "s"}`
                : "Ninguna pendiente"}
              {summary.rejected > 0 && (
                <span className="block text-xs text-ink-faint">
                  {summary.rejected} no aprobada{summary.rejected === 1 ? "" : "s"}
                </span>
              )}
            </Stat>
            <Stat label="Reseñas">{rating ?? "Sin reseñas"}</Stat>
          </section>

          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-ink">Inscriptas</h2>
            {rows.length === 0 ? (
              <p className="cosmos-card p-6 font-body text-sm text-ink-faint">
                Todavía no hay alumnas inscriptas en este curso. Cuando se apruebe la primera
                solicitud, la vas a ver acá con su avance.
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.userId} className="cosmos-card flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm tracking-wide text-ink">{r.name}</p>
                      <p className="font-body text-xs text-ink-faint">
                        Inscripta el {formatCertificateDate(r.enrolledAt)}
                      </p>
                    </div>
                    <p className="font-body text-sm text-ink-soft">
                      {r.progressPercent} % · {r.completedLessons} de {r.totalLessons}
                    </p>
                    {r.certificateCode ? (
                      <Link href={`/certificado/${r.certificateCode}`} className="font-body text-sm text-lila-300 hover:underline">
                        Certificado
                      </Link>
                    ) : (
                      <span className="font-body text-sm text-ink-faint">Sin certificado</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="font-body text-xs text-ink-faint">
            Tus datos básicos (nombre, bio, foto) se editan en{" "}
            <Link href="/panel/perfil" className="text-lila-300 hover:underline">
              tu perfil
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

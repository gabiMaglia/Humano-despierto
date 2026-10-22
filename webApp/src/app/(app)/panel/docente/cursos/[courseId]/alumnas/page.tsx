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
    <div className="tarjeta p-4">
      <p className="font-display text-eyebrow tracking-wide text-suave uppercase">{label}</p>
      <div className="mt-1 font-body text-tinta">{children}</div>
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
    <div className="min-h-screen bg-fondo text-tinta">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <Link
            href={`/panel/docente/cursos/${courseId}`}
            className="mb-2 inline-block font-display text-eyebrow tracking-[0.25em] text-suave hover:text-bosque"
          >
            ← {roster.courseTitle}
          </Link>
          <h1 className="font-display text-display-md text-tinta">
            <em className="font-quote italic text-miel-800">Alumnas</em> del curso
          </h1>
        </header>

        <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 md:px-12">
          <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Activas">{summary.active}</Stat>
            <Stat label="Completadas">{summary.completed}</Stat>
            <Stat label="Solicitudes">
              {summary.requested > 0
                ? `${summary.requested} pendiente${summary.requested === 1 ? "" : "s"}`
                : "Ninguna pendiente"}
              {summary.rejected > 0 && (
                <span className="block text-xs text-suave">
                  {summary.rejected} no aprobada{summary.rejected === 1 ? "" : "s"}
                </span>
              )}
            </Stat>
            <Stat label="Reseñas">{rating ?? "Sin reseñas"}</Stat>
            <Stat label="Preguntas">
              {summary.openQuestions > 0 ? `${summary.openQuestions} sin responder` : "Ninguna sin responder"}
            </Stat>
          </section>

          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-tinta">Inscriptas</h2>
            {rows.length === 0 ? (
              <p className="tarjeta p-6 font-body text-sm text-suave">
                Todavía no hay alumnas inscriptas en este curso. Cuando se apruebe la primera
                solicitud, la vas a ver acá con su avance.
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.userId} className="tarjeta flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm tracking-wide text-tinta">{r.name}</p>
                      <p className="font-body text-xs text-suave">
                        Inscripta el {formatCertificateDate(r.enrolledAt)}
                      </p>
                    </div>
                    <p className="font-body text-sm text-suave">
                      {r.progressPercent} % · {r.completedLessons} de {r.totalLessons}
                    </p>
                    {r.certificateCode ? (
                      <Link href={`/certificado/${r.certificateCode}`} className="font-body text-sm text-miel-800 hover:underline">
                        Certificado
                      </Link>
                    ) : (
                      <span className="font-body text-sm text-suave">Sin certificado</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="font-body text-xs text-suave">
            Tus datos básicos (nombre, bio, foto) se editan en{" "}
            <Link href="/panel/perfil" className="text-miel-800 hover:underline">
              tu perfil
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

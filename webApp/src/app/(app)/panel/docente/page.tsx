import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import PanelTabs from "@/components/teacher/PanelTabs";
import TeacherReportList from "@/components/teacher/TeacherReportList";
import { requireTeacher, listTeacherCourses } from "@/lib/server/teacher";
import { listOwnReviewReports } from "@/lib/server/reviews-admin";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

// Criterio 1: solo los cursos DEL docente autenticado — `listTeacherCourses` ya filtra por
// `teacher_id` con el cliente de sesión (RLS scoped, no hace falta repetirlo acá).
export default async function TeacherPanelPage() {
  const teacher = await requireTeacher();
  const [courses, reports] = await Promise.all([listTeacherCourses(teacher.id), listOwnReviewReports(teacher.id)]);

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <PanelTabs active="cursos" />
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-linea bg-papel px-6 py-8 md:px-12">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">
              — El taller de {teacher.fullName || "la docente"} —
            </p>
            <h1 className="font-display text-display-md text-tinta">
              Tus <em className="font-quote italic text-miel-800">cursos</em>
            </h1>
          </div>
          <Link href="/panel/docente/nuevo" className="btn btn-primary">
            + Nuevo curso
          </Link>
        </header>

        <div className="mx-auto max-w-4xl space-y-3 px-6 py-10 md:px-12">
          {courses.length === 0 && (
            <p className="tarjeta p-6 font-body text-sm text-suave">
              Todavía no creaste ningún curso. Empezá por el botón de arriba.
            </p>
          )}

          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/panel/docente/cursos/${c.id}`}
              className="tarjeta flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-linea"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm tracking-wide text-tinta">{c.title}</p>
                <p className="font-body text-xs text-suave">
                  /cursos/{c.slug} · {c.moduleCount} módulo{c.moduleCount === 1 ? "" : "s"} ·{" "}
                  {c.lessonCount} lección{c.lessonCount === 1 ? "" : "es"}
                </p>
              </div>
              <span className="rounded-pill border border-linea px-3 py-1 font-display text-[10px] tracking-wide text-suave uppercase">
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </Link>
          ))}
        </div>

        {/* Sin reportes no se dibuja nada: una sección vacía es ruido para quien nunca reportó. */}
        {reports.length > 0 && <TeacherReportList reports={reports} />}
      </div>
    </div>
  );
}

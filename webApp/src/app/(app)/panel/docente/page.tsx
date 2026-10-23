import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
import { RowMain } from "@/components/panel/PanelRow";
import StatusChip from "@/components/panel/StatusChip";
import PanelTabs from "@/components/teacher/PanelTabs";
import TeacherReportList from "@/components/teacher/TeacherReportList";
import { COURSE_STATUS, statusOf } from "@/lib/panel/status";
import { requireTeacher, listTeacherCourses } from "@/lib/server/teacher";
import { listOwnReviewReports } from "@/lib/server/reviews-admin";

// Criterio 1: solo los cursos DEL docente autenticado — `listTeacherCourses` ya filtra por
// `teacher_id` con el cliente de sesión (RLS scoped, no hace falta repetirlo acá).
export default async function TeacherPanelPage() {
  const teacher = await requireTeacher();
  const [courses, reports] = await Promise.all([listTeacherCourses(teacher.id), listOwnReviewReports(teacher.id)]);

  return (
    <PanelFrame
      title="Tus cursos"
      context={`Panel de ${teacher.fullName || "la docente"}`}
      tabs={<PanelTabs active="cursos" />}
      actions={<ButtonLink href="/panel/docente/nuevo">+ Nuevo curso</ButtonLink>}
    >
      <PanelSection id="cursos-titulo" title="Cursos">
        {courses.length === 0 && (
          <p className="tarjeta p-6 text-suave">Todavía no creaste ningún curso. Empezá por el botón de arriba.</p>
        )}
        <ul className="space-y-3">
          {courses.map((c) => {
            const status = statusOf(COURSE_STATUS, c.status);
            return (
              <li key={c.id}>
                <Link
                  href={`/panel/docente/cursos/${c.id}`}
                  className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-2 p-4 tabular-nums transition-colors hover:border-salvia hover:bg-salvia-100"
                >
                  <RowMain
                    title={c.title}
                    meta={`/cursos/${c.slug} · ${c.moduleCount} módulo${c.moduleCount === 1 ? "" : "s"} · ${c.lessonCount} lección${c.lessonCount === 1 ? "" : "es"}`}
                  />
                  <StatusChip tone={status.tone}>{status.label}</StatusChip>
                </Link>
              </li>
            );
          })}
        </ul>
      </PanelSection>

      {/* Sin reportes no se dibuja nada: una sección vacía es ruido para quien nunca reportó. */}
      {reports.length > 0 && <TeacherReportList reports={reports} />}
    </PanelFrame>
  );
}

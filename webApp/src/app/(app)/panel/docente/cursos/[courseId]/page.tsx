import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseRoster } from "@/lib/server/teacher-metrics";
import { ButtonLink } from "@/components/atoms/Button";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
import StatusChip from "@/components/panel/StatusChip";
import { COURSE_STATUS, statusOf } from "@/lib/panel/status";
import { requireTeacher, getTeacherCourseDetail } from "@/lib/server/teacher";
import CourseForm from "@/components/teacher/CourseForm";
import ModuleBlock from "@/components/teacher/ModuleBlock";
import NewModuleForm from "@/components/teacher/NewModuleForm";
import PublishCourseControl from "@/components/teacher/PublishCourseControl";
import DangerZone from "@/components/teacher/DangerZone";
import CoverForm from "@/components/teacher/CoverForm";
import { createClient } from "@/lib/supabase/server";
import { signUploadUrl } from "@/lib/server/uploads";

interface Props {
  params: Promise<{ courseId: string }>;
}

// Criterio 6: `getTeacherCourseDetail` devuelve `null` tanto si el curso no existe como si
// no es del docente que pide — misma respuesta (`notFound()`) para las dos cosas, así una
// docente no puede usar la diferencia de status code para enumerar cursos ajenos.
export default async function TeacherCourseEditorPage({ params }: Props) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseDetail(courseId, teacher.id);

  if (!course) notFound();
  const roster = await getCourseRoster(course.id, teacher.id);

  // Firma con la SESION de la duena (policy uploads_covers_select_own): el editor ve la portada
  // aunque el curso sea borrador, y nunca pasa por service_role (c.6).
  const coverUrl = await signUploadUrl(await createClient(), course.coverPath);

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const status = statusOf(COURSE_STATUS, course.status);

  return (
    <PanelFrame
      title={course.title}
      context={
        <>
          /cursos/{course.slug} <span aria-hidden="true">·</span> <StatusChip tone={status.tone} className="align-middle">{status.label}</StatusChip>
        </>
      }
      back={{ href: "/panel/docente", label: "Tus cursos" }}
      actions={
        <>
          <ButtonLink href={`/panel/docente/anuncios?curso=${course.id}`} variant="ghost">
            Anuncios del curso
          </ButtonLink>
          <PublishCourseControl courseId={course.id} status={course.status} />
        </>
      }
    >
      <PanelSection id="alumnas-titulo" title="Alumnas">
        <Link
          href={`/panel/docente/cursos/${course.id}/alumnas`}
          className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-2 p-4 tabular-nums transition-colors hover:border-salvia hover:bg-salvia-100"
        >
          <span className="text-suave">
            {roster
              ? `${roster.summary.active} activa${roster.summary.active === 1 ? "" : "s"} · ${roster.summary.completed} completada${roster.summary.completed === 1 ? "" : "s"}`
              : "Ver alumnas y avance"}
          </span>
          <span className="ml-auto font-semibold text-miel-800">Ver todas →</span>
        </Link>
      </PanelSection>

      <PanelSection id="datos-titulo" title="Datos del curso">
        <CourseForm course={course} />
      </PanelSection>

      <CoverForm courseId={course.id} coverUrl={coverUrl} courseTitle={course.title} />

      <PanelSection id="modulos-titulo" title="Módulos y lecciones">
        <div className="space-y-4">
          {course.modules.map((mod, i) => (
            <ModuleBlock key={mod.id} courseId={course.id} module={mod} isFirst={i === 0} isLast={i === course.modules.length - 1} />
          ))}
          {course.modules.length === 0 && <p className="tarjeta p-5 text-suave">Sin módulos todavía — creá el primero abajo.</p>}
          <NewModuleForm courseId={course.id} />
        </div>
      </PanelSection>

      {/* Al pie y separada de todo lo demás: una accion irreversible no comparte
          vecindario con las que se usan a diario. */}
      <DangerZone courseId={course.id} courseTitle={course.title} moduleCount={course.modules.length} lessonCount={lessonCount} />
    </PanelFrame>
  );
}

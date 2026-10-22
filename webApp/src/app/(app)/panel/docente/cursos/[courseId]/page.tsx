import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseRoster } from "@/lib/server/teacher-metrics";
import SiteHeader from "@/components/layout/SiteHeader";
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

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-linea bg-papel px-6 py-8 md:px-12">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">
              — /cursos/{course.slug} —
            </p>
            <h1 className="font-display text-display-md text-tinta">{course.title}</h1>
          </div>
          <div className="flex flex-col items-end gap-3">
            <PublishCourseControl courseId={course.id} status={course.status} />
            <Link
              href={`/panel/docente/anuncios?curso=${course.id}`}
              className="font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors"
            >
              Anuncios del curso ↦
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-tinta">Alumnas</h2>
            <Link
              href={`/panel/docente/cursos/${course.id}/alumnas`}
              className="tarjeta flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-linea"
            >
              <span className="font-body text-sm text-suave">
                {roster
                  ? `${roster.summary.active} activa${roster.summary.active === 1 ? "" : "s"} · ${roster.summary.completed} completada${roster.summary.completed === 1 ? "" : "s"}`
                  : "Ver alumnas y avance"}
              </span>
              <span className="ml-auto font-display text-eyebrow tracking-wide text-bosque">Ver todas →</span>
            </Link>
          </section>

          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-tinta">Datos del curso</h2>
            <CourseForm course={course} />
          </section>

          <CoverForm courseId={course.id} coverUrl={coverUrl} courseTitle={course.title} />

          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-tinta">Módulos y lecciones</h2>
            <div className="space-y-4">
              {course.modules.map((mod, i) => (
                <ModuleBlock
                  key={mod.id}
                  courseId={course.id}
                  module={mod}
                  isFirst={i === 0}
                  isLast={i === course.modules.length - 1}
                />
              ))}
              {course.modules.length === 0 && (
                <p className="tarjeta p-5 font-body text-sm text-suave">
                  Sin módulos todavía — creá el primero abajo.
                </p>
              )}
              <NewModuleForm courseId={course.id} />
            </div>
          </section>

          {/* Al pie y separada de todo lo demás: una accion irreversible no comparte
              vecindario con las que se usan a diario. */}
          <DangerZone
            courseId={course.id}
            courseTitle={course.title}
            moduleCount={course.modules.length}
            lessonCount={course.modules.reduce((n, m) => n + m.lessons.length, 0)}
          />
        </div>
      </div>
    </div>
  );
}

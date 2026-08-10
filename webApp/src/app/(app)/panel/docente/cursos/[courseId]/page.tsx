import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import { requireTeacher, getTeacherCourseDetail } from "@/lib/server/teacher";
import CourseForm from "@/components/teacher/CourseForm";
import ModuleBlock from "@/components/teacher/ModuleBlock";
import NewModuleForm from "@/components/teacher/NewModuleForm";
import PublishCourseControl from "@/components/teacher/PublishCourseControl";
import DangerZone from "@/components/teacher/DangerZone";

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

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">
              — /cursos/{course.slug} —
            </p>
            <h1 className="font-display text-display-md text-ink">{course.title}</h1>
          </div>
          <div className="flex flex-col items-end gap-3">
            <PublishCourseControl courseId={course.id} status={course.status} />
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-ink">Datos del curso</h2>
            <CourseForm course={course} />
          </section>

          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-ink">Módulos y lecciones</h2>
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
                <p className="cosmos-card p-5 font-body text-sm text-ink-faint">
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

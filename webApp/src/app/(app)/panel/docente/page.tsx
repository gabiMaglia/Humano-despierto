import Link from "next/link";
import Nav from "@/components/layout/Nav";
import { requireTeacher, listTeacherCourses } from "@/lib/server/teacher";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

// Criterio 1: solo los cursos DEL docente autenticado — `listTeacherCourses` ya filtra por
// `teacher_id` con el cliente de sesión (RLS scoped, no hace falta repetirlo acá).
export default async function TeacherPanelPage() {
  const teacher = await requireTeacher();
  const courses = await listTeacherCourses(teacher.id);

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">
              — El taller de {teacher.fullName || "la docente"} —
            </p>
            <h1 className="font-display text-display-md text-ink">
              Tus <em className="font-quote italic text-lila-300">cursos</em>
            </h1>
          </div>
          <Link href="/panel/docente/nuevo" className="btn-ritual btn-ritual-primary rounded-ritual">
            + Nuevo curso
          </Link>
        </header>

        <div className="mx-auto max-w-4xl space-y-3 px-6 py-10 md:px-12">
          {courses.length === 0 && (
            <p className="cosmos-card p-6 font-body text-sm text-ink-faint">
              Todavía no creaste ningún curso. Empezá por el botón de arriba.
            </p>
          )}

          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/panel/docente/cursos/${c.id}`}
              className="cosmos-card flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-lila-300/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm tracking-wide text-ink">{c.title}</p>
                <p className="font-body text-xs text-ink-faint">
                  /cursos/{c.slug} · {c.moduleCount} módulo{c.moduleCount === 1 ? "" : "s"} ·{" "}
                  {c.lessonCount} lección{c.lessonCount === 1 ? "" : "es"}
                </p>
              </div>
              <span className="rounded-pill border border-lila-300/25 px-3 py-1 font-display text-[10px] tracking-cosmic text-ink-soft uppercase">
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

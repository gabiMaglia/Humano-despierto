import Nav from "@/components/layout/Nav";
import UserRoleRow from "@/components/admin/UserRoleRow";
import CourseStatusRow from "@/components/admin/CourseStatusRow";
import EnrollmentGrantForm from "@/components/admin/EnrollmentGrantForm";
import EnrollmentRow from "@/components/admin/EnrollmentRow";
import { listAllUsers, listAllCourses, listAllEnrollments } from "@/lib/server/admin";

export default async function AdminPanelPage() {
  const [users, courses, enrollments] = await Promise.all([
    listAllUsers(),
    listAllCourses(),
    listAllEnrollments(),
  ]);

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">
            — Panel de administración —
          </p>
          <h1 className="font-display text-display-md text-ink">
            El <em className="font-quote italic text-lila-300">umbral</em> del sistema
          </h1>
        </header>

        <div className="mx-auto max-w-5xl space-y-12 px-6 py-10 md:px-12">
          <section>
            <h2 className="mb-5 font-display text-lg tracking-wide text-ink">
              Usuarios y roles
            </h2>
            <ul className="space-y-3">
              {users.map((u) => (
                <UserRoleRow key={u.id} user={u} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-5 font-display text-lg tracking-wide text-ink">
              Inscripciones
            </h2>
            <div className="mb-5">
              <EnrollmentGrantForm users={users} courses={courses} />
            </div>
            <ul className="space-y-3">
              {enrollments.length === 0 && (
                <li className="font-body text-sm text-ink-faint">
                  Todavía no hay inscripciones registradas.
                </li>
              )}
              {enrollments.map((e) => (
                <EnrollmentRow key={e.id} enrollment={e} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-5 font-display text-lg tracking-wide text-ink">
              Cursos
            </h2>
            <ul className="space-y-3">
              {courses.map((c) => (
                <CourseStatusRow key={c.id} course={c} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

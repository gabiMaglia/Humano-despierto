import Nav from "@/components/layout/Nav";
import AdminTabs from "@/components/admin/AdminTabs";
import UserRoleRow from "@/components/admin/UserRoleRow";
import CourseStatusRow from "@/components/admin/CourseStatusRow";
import EnrollmentGrantForm from "@/components/admin/EnrollmentGrantForm";
import EnrollmentRow from "@/components/admin/EnrollmentRow";
import EnrollmentRequestRow from "@/components/admin/EnrollmentRequestRow";
import WithdrawAnnouncementForm from "@/components/announcements/WithdrawAnnouncementForm";
import { listAnnouncementsForModeration } from "@/lib/server/announcements";
import { moderateAnnouncement } from "./actions";
import { formatCertificateDate } from "@/lib/utils/format";
import {
  listAllUsers,
  listAllCourses,
  listAllEnrollments,
  listPendingEnrollmentRequests,
} from "@/lib/server/admin";

export default async function AdminPanelPage() {
  const [users, courses, enrollments, requests, announcements] = await Promise.all([
    listAllUsers(),
    listAllCourses(),
    listAllEnrollments(),
    listPendingEnrollmentRequests(),
    listAnnouncementsForModeration(),
  ]);

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <AdminTabs active="general" />
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

          <section aria-labelledby="solicitudes-pendientes">
            <h2 id="solicitudes-pendientes" className="mb-5 font-display text-lg tracking-wide text-ink">
              Solicitudes pendientes <span className="text-ink-faint">({requests.length})</span>
            </h2>
            <ul className="space-y-3">
              {requests.length === 0 && (
                <li className="font-body text-sm text-ink-faint">No hay solicitudes pendientes.</li>
              )}
              {requests.map((r) => (
                <EnrollmentRequestRow key={r.id} request={r} />
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

          <section>
            <h2 className="mb-5 font-display text-lg tracking-wide text-ink">Anuncios publicados</h2>
            {announcements.length === 0 && (
              <p className="font-body text-sm text-ink-faint">Todavía no hay anuncios publicados.</p>
            )}
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="cosmos-card p-4">
                  <p className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">
                    {a.courseTitle} <span className="text-lila-300/30">·</span>{" "}
                    <time dateTime={a.publishedAt}>{formatCertificateDate(a.publishedAt)}</time>
                  </p>
                  <p className="font-display text-sm tracking-wide text-ink">{a.title}</p>
                  <p className="mb-2 line-clamp-3 whitespace-pre-line font-body text-xs text-ink-soft">{a.body}</p>
                  {a.deletedAt ? (
                    <p className="font-body text-xs text-ink-faint">Retirado · motivo: “{a.deletedReason}”</p>
                  ) : (
                    <WithdrawAnnouncementForm action={moderateAnnouncement} announcementId={a.id} label="Retirar" />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

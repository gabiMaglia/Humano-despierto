import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import PanelTabs from "@/components/teacher/PanelTabs";
import AnnouncementComposer from "@/components/teacher/AnnouncementComposer";
import PublishAnnouncementControl from "@/components/teacher/PublishAnnouncementControl";
import WithdrawAnnouncementForm from "@/components/announcements/WithdrawAnnouncementForm";
import { requireTeacher, listTeacherCourses } from "@/lib/server/teacher";
import { getTeacherAnnouncements } from "@/lib/server/announcements";
import { withdrawAnnouncement } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { formatCertificateDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Anuncios", robots: { index: false, follow: false } };

interface Props {
  searchParams: Promise<{ curso?: string }>;
}

// `?curso=` hace enlazable la elección (doctrina T-019). Un id ajeno no matchea ninguno de sus
// cursos y cae en el primero: la lista ya viene filtrada por titularidad.
export default async function TeacherAnnouncementsPage({ searchParams }: Props) {
  const { curso } = await searchParams;
  const teacher = await requireTeacher();
  const courses = await listTeacherCourses(teacher.id);
  const selected = courses.find((c) => c.id === curso) ?? courses[0] ?? null;
  const announcements = selected ? await getTeacherAnnouncements(selected.id) : [];
  const drafts = announcements.filter((a) => a.status === "draft" && !a.deletedAt);
  const published = announcements.filter((a) => a.status === "published" && !a.deletedAt);
  const withdrawn = announcements.filter((a) => a.deletedAt);

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <PanelTabs active="anuncios" />
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">— Lo que le contás a tu curso —</p>
          <h1 className="font-display text-display-md text-tinta">
            Tus <em className="font-quote italic text-miel-800">anuncios</em>
          </h1>
        </header>

        <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
          {!selected && (
            <p className="tarjeta p-6 font-body text-sm text-suave">
              Para anunciar necesitás un curso. Crealo desde la pestaña Cursos.
            </p>
          )}

          {selected && (
            <>
              <nav aria-label="Curso" className="flex flex-wrap gap-2">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/panel/docente/anuncios?curso=${c.id}`}
                    aria-current={c.id === selected.id ? "page" : undefined}
                    className={`rounded-pill border px-3 py-1 font-display text-eyebrow tracking-wide transition-colors ${
                      c.id === selected.id ? "border-linea text-miel-800" : "border-linea text-suave hover:text-suave"
                    }`}
                  >
                    {c.title} <span className="text-suave">/cursos/{c.slug}</span>
                  </Link>
                ))}
              </nav>

              <section aria-labelledby="anuncio-nuevo-titulo" className="tarjeta p-5">
                <h2 id="anuncio-nuevo-titulo" className="mb-4 font-display text-lg tracking-wide text-tinta">
                  Nuevo anuncio
                </h2>
                <AnnouncementComposer courseId={selected.id} />
              </section>

              {drafts.length > 0 && (
                <section aria-labelledby="borradores-titulo" className="space-y-4">
                  <h2 id="borradores-titulo" className="font-display text-lg tracking-wide text-tinta">Borradores</h2>
                  {drafts.map((a) => (
                    <article key={a.id} aria-label={a.title} className="tarjeta space-y-4 p-5">
                      <AnnouncementComposer courseId={selected.id} draft={a} />
                      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-linea pt-4">
                        <PublishAnnouncementControl courseId={selected.id} announcementId={a.id} />
                        <WithdrawAnnouncementForm action={withdrawAnnouncement} announcementId={a.id} courseId={selected.id} label="Descartar" />
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {published.length > 0 && (
                <section aria-labelledby="publicados-titulo" className="space-y-4">
                  <h2 id="publicados-titulo" className="font-display text-lg tracking-wide text-tinta">Publicados</h2>
                  {published.map((a) => (
                    <article key={a.id} aria-label={a.title} className="tarjeta p-5">
                      <p className="mb-1 font-display text-eyebrow tracking-wide text-suave uppercase">
                        {a.publishedAt && <time dateTime={a.publishedAt}>{formatCertificateDate(a.publishedAt)}</time>}
                      </p>
                      <h3 className="mb-2 font-display text-base tracking-wide text-tinta">{a.title}</h3>
                      <p className="mb-3 whitespace-pre-line font-body text-sm text-suave">{a.body}</p>
                      <WithdrawAnnouncementForm action={withdrawAnnouncement} announcementId={a.id} courseId={selected.id} label="Retirar" />
                    </article>
                  ))}
                </section>
              )}

              {withdrawn.length > 0 && (
                <section aria-labelledby="retirados-titulo" className="space-y-3">
                  <h2 id="retirados-titulo" className="font-display text-lg tracking-wide text-tinta">Retirados</h2>
                  {withdrawn.map((a) => (
                    <p key={a.id} className="tarjeta p-4 font-body text-sm text-suave">
                      {a.title} <span className="text-miel-800">·</span> motivo: “{a.deletedReason}”
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

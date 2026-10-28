import type { Metadata } from "next";
import Link from "next/link";
import PanelFrame from "@/components/panel/PanelFrame";
import StatusChip from "@/components/panel/StatusChip";
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
    <PanelFrame title="Tus anuncios" context="Lo que le contás a tu curso." tabs={<PanelTabs active="anuncios" />}>
      {!selected && <p className="tarjeta p-6 text-suave">Para anunciar necesitás un curso. Crealo desde la pestaña Cursos.</p>}

      {selected && (
        <>
          <nav aria-label="Curso" className="flex flex-wrap gap-2">
            {courses.map((c) => {
              const current = c.id === selected.id;
              return (
                <Link
                  key={c.id}
                  href={`/panel/docente/anuncios?curso=${c.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-pill border px-4 text-sm font-semibold transition-colors ${
                    current ? "border-bosque bg-bosque text-white" : "border-linea bg-papel text-bosque hover:bg-salvia-100"
                  }`}
                >
                  {c.title}
                  <span className={`ml-2 font-normal ${current ? "text-white" : "text-suave"}`}>/cursos/{c.slug}</span>
                </Link>
              );
            })}
          </nav>

          <section aria-labelledby="anuncio-nuevo-titulo" className="tarjeta p-6">
            <h2 id="anuncio-nuevo-titulo" className="mb-4 text-xl font-semibold text-bosque">
              Nuevo anuncio
            </h2>
            <AnnouncementComposer courseId={selected.id} />
          </section>

          {drafts.length > 0 && (
            <section aria-labelledby="borradores-titulo" className="space-y-4">
              <h2 id="borradores-titulo" className="text-xl font-semibold text-bosque">Borradores</h2>
              {drafts.map((a) => (
                <article key={a.id} aria-label={a.title} className="tarjeta space-y-4 p-6">
                  <StatusChip tone="muted">Borrador</StatusChip>
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
              <h2 id="publicados-titulo" className="text-xl font-semibold text-bosque">Publicados</h2>
              {published.map((a) => (
                <article key={a.id} aria-label={a.title} className="tarjeta p-6">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <StatusChip tone="ok">Publicado</StatusChip>
                    {a.publishedAt && (
                      <time dateTime={a.publishedAt} className="text-sm tabular-nums text-suave">
                        {formatCertificateDate(a.publishedAt)}
                      </time>
                    )}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-bosque">{a.title}</h3>
                  <p className="mb-4 whitespace-pre-line text-base text-tinta">{a.body}</p>
                  <WithdrawAnnouncementForm action={withdrawAnnouncement} announcementId={a.id} courseId={selected.id} label="Retirar" />
                </article>
              ))}
            </section>
          )}

          {withdrawn.length > 0 && (
            <section aria-labelledby="retirados-titulo" className="space-y-3">
              <h2 id="retirados-titulo" className="text-xl font-semibold text-bosque">Retirados</h2>
              {withdrawn.map((a) => (
                <p key={a.id} className="tarjeta p-4 text-suave">
                  <StatusChip tone="muted" className="mr-2">Retirado</StatusChip>
                  <span className="font-semibold text-tinta">{a.title}</span> · motivo: “{a.deletedReason}”
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </PanelFrame>
  );
}

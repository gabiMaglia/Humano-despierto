import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import StatusChip from "@/components/panel/StatusChip";
import WithdrawAnnouncementForm from "@/components/announcements/WithdrawAnnouncementForm";
import { requireAdmin } from "@/lib/server/admin";
import { listAnnouncementsForModeration } from "@/lib/server/announcements";
import { formatCertificateDate } from "@/lib/utils/format";
import { moderateAnnouncement } from "../actions";

export const metadata: Metadata = { title: "Anuncios · Admin", robots: { index: false, follow: false } };

// T-031 era una sección de la página única; T-049 la partió en pestañas y esta es la suya.
export default async function AdminAnnouncementsPage() {
  // Layout y página renderizan en paralelo: la lectura no puede depender del guard del layout.
  await requireAdmin();
  const announcements = await listAnnouncementsForModeration();

  return (
    <AdminShell active="anuncios">
      <section aria-labelledby="anuncios-titulo">
        <h2 id="anuncios-titulo" className="mb-4 text-xl font-semibold text-bosque">
          Anuncios publicados
        </h2>
        {announcements.length === 0 && (
          <p className="tarjeta p-5 text-suave">Todavía no hay anuncios publicados.</p>
        )}
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="tarjeta p-5">
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusChip tone={a.deletedAt ? "muted" : "ok"}>{a.deletedAt ? "Retirado" : "Publicado"}</StatusChip>
                <p className="text-sm tabular-nums text-suave">
                  {a.courseTitle} · <time dateTime={a.publishedAt}>{formatCertificateDate(a.publishedAt)}</time>
                </p>
              </div>
              <p className="font-semibold text-tinta">{a.title}</p>
              <p className="mb-3 line-clamp-3 whitespace-pre-line text-tinta">{a.body}</p>
              {a.deletedAt ? (
                <p className="text-sm text-suave">Motivo: “{a.deletedReason}”</p>
              ) : (
                <WithdrawAnnouncementForm action={moderateAnnouncement} announcementId={a.id} label="Retirar" />
              )}
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}

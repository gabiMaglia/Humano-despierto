import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
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
        <h2 id="anuncios-titulo" className="mb-5 font-display text-lg tracking-wide text-tinta">
          Anuncios publicados
        </h2>
        {announcements.length === 0 && (
          <p className="font-body text-sm text-suave">Todavía no hay anuncios publicados.</p>
        )}
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="tarjeta p-4">
              <p className="font-display text-eyebrow tracking-wide text-suave uppercase">
                {a.courseTitle} <span className="text-miel-800">·</span>{" "}
                <time dateTime={a.publishedAt}>{formatCertificateDate(a.publishedAt)}</time>
              </p>
              <p className="font-display text-sm tracking-wide text-tinta">{a.title}</p>
              <p className="mb-2 line-clamp-3 whitespace-pre-line font-body text-xs text-suave">{a.body}</p>
              {a.deletedAt ? (
                <p className="font-body text-xs text-suave">Retirado · motivo: “{a.deletedReason}”</p>
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

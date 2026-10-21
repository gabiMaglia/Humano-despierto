import Link from "next/link";
import type { AnnouncementView } from "@/lib/announcements/types";
import { formatCertificateDate } from "@/lib/utils/format";

/** Lista de anuncios publicados. Sin estado vacío a propósito: quien la usa no la dibuja si no hay
 * nada (c.8, "sin 'aún no hay anuncios'"). Orden cronológico inverso y fecha visible (spec). */
export default function AnnouncementList({ items, showCourse = false }: { items: AnnouncementView[]; showCourse?: boolean }) {
  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li key={a.id}>
          <article aria-labelledby={`anuncio-${a.id}`} className="cosmos-card p-5">
            <p className="mb-1 font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">
              <time dateTime={a.publishedAt}>{formatCertificateDate(a.publishedAt)}</time>
              {showCourse && a.course && (
                <>
                  <span className="text-lila-300/30"> · </span>
                  <Link href={`/cursos/${a.course.slug}`} className="text-gold-400 hover:text-lila-300 transition-colors">
                    {a.course.title}
                  </Link>
                </>
              )}
            </p>
            <h3 id={`anuncio-${a.id}`} className="mb-2 font-display text-base tracking-wide text-ink">
              {a.title}
            </h3>
            <div className="space-y-3">
              {a.body.split(/\n{2,}/).filter(Boolean).map((par, i) => (
                <p key={i} className="whitespace-pre-line font-body text-sm text-ink-soft leading-relaxed">
                  {par}
                </p>
              ))}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

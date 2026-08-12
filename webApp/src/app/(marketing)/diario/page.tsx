import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { getPublishedPosts } from "@/lib/server/diario";
import { formatCertificateDate } from "@/lib/utils/format";
import { toRoman } from "@/lib/utils/roman";

// T-022 · Reemplaza el mock `src/lib/mocks/blog.ts` (T-017 lo había dejado fuera de alcance a
// propósito: no existía tabla). Criterio 2: solo publicados, más recientes primero — lo filtra
// `getPublishedPosts` (RLS `diario_posts_read`, migración 0018).
export default async function DiarioPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="min-h-screen bg-cosmos-0">
      <PageHeader
        badge={posts.length > 0 ? `${posts.length} anotaci${posts.length === 1 ? "ón" : "ones"}` : "Diario"}
        title={
          <>
            Anotaciones <em className="font-quote italic text-lila-300">al margen</em> del oficio
          </>
        }
        subtitle="Lo que las guías escriben entre clase y clase. Ensayos, cartas a estudiantes, notas de campo de la práctica."
      />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-12">
        {posts.length === 0 ? (
          // Criterio 5: estado vacío digno, no roto.
          <div className="cosmos-card p-10 text-center">
            <div className="mb-4 text-3xl text-lila-300">✦</div>
            <p className="mb-1 font-display text-base tracking-wide text-ink">
              Todavía no hay anotaciones publicadas.
            </p>
            <p className="font-body text-sm text-ink-faint">Las guías están escribiendo — volvé pronto.</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-lila-300/18">
            {posts.map((p, i) => (
              <Link
                key={p.slug}
                href={`/diario/${p.slug}`}
                className="group -mx-3 flex items-start gap-4 rounded-ritual px-3 py-6 transition-colors hover:bg-cosmos-surface/40"
              >
                <span className="w-8 flex-none pt-1 font-display text-eyebrow text-lila-300/60">
                  {toRoman(i + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1.5 font-display text-lg tracking-wide text-ink leading-snug group-hover:text-lila-300 transition-colors">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mb-2 font-quote italic text-sm text-ink-soft leading-relaxed">{p.excerpt}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
                    {p.teacherGlyph && <span className="text-lila-300">{p.teacherGlyph}</span>}
                    <span>{p.teacherName}</span>
                    <span className="text-lila-300/40">·</span>
                    <span>{formatCertificateDate(p.publishedAt)}</span>
                  </div>
                </div>
                <span className="flex-none font-display text-sm text-ink-faint transition-colors group-hover:text-lila-300">
                  ↦
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

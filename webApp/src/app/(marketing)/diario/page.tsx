import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/atoms/Icon";
import PageIntro from "@/components/layout/PageIntro";
import { getPublishedPosts } from "@/lib/server/diario";
import { formatCertificateDate } from "@/lib/utils/format";

// T-022 · Reemplaza el mock el mock `blog.ts` (T-017 lo había dejado fuera de alcance a
// propósito: no existía tabla). Criterio 2: solo publicados, más recientes primero — lo filtra
// `getPublishedPosts` (RLS `diario_posts_read`, migración 0018).

export const metadata: Metadata = {
  title: "Diario",
  description: "Lo que escriben las guías de la escuela entre clase y clase.",
};

export default async function DiarioPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro
        title="Diario"
        lead="Lo que las guías escriben entre clase y clase: ensayos, cartas a sus alumnas y notas de la práctica."
      />
      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        {posts.length === 0 ? (
          // Criterio 5: estado vacío digno, no roto.
          <div className="rounded-lg bg-salvia-100 p-10">
            <p className="text-lg font-semibold text-bosque">Todavía no hay escritos publicados.</p>
            <p className="mt-1 text-suave">Las guías están escribiendo. Volvé pronto.</p>
          </div>
        ) : (
          <ul className="max-w-3xl divide-y divide-linea border-y border-linea">
            {posts.map((p) => (
              <li key={p.slug} className="group relative py-8">
                <p className="text-sm text-suave">
                  <span className="font-semibold text-miel-800">{p.teacherName}</span> · {formatCertificateDate(p.publishedAt)}
                </p>
                <h2 className="mt-2 text-2xl leading-snug md:text-[28px]">
                  <Link href={`/diario/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-miel-800">
                    {p.title}
                  </Link>
                </h2>
                {p.excerpt && <p className="mt-2 max-w-[60ch] text-suave">{p.excerpt}</p>}
                <span aria-hidden="true" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-miel-800">
                  Leer
                  <Icon name="arrow-right" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

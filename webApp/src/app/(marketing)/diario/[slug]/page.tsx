import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/atoms/Breadcrumb";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { getPostBySlug } from "@/lib/server/diario";
import { formatCertificateDate } from "@/lib/utils/format";

interface Props {
  params: Promise<{ slug: string }>;
}

// Criterio 2: `notFound()` real (404 de verdad, no 200) — igual que `cursos/[slug]` y
// `guias/[slug]`: este segmento NO tiene `loading.tsx`, así que no hay Suspense boundary que
// mande los headers con 200 antes de que `notFound()` corra (la trampa documentada en
// `(app)/circulo/[curso]/layout.tsx` y en la deuda del engram). Verificado con el status code,
// no con el contenido — ver el handoff.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Escrito no encontrado" };
  const description = post.excerpt ?? undefined;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/diario/${slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `/diario/${slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      // Un openGraph propio reemplaza entero el de la raiz, imagen incluida: va explicita.
      images: [SITE_OG_IMAGE],
    },
  };
}

export default async function DiarioPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const paragraphs = post.body.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="min-h-screen bg-fondo">
      <Breadcrumb crumbs={[{ label: "Diario", href: "/diario" }, { label: post.title }]} />

      <header className="border-b border-linea px-6 py-16 text-center md:px-12">
        <h1 className="mx-auto mb-4 max-w-2xl font-display text-display-md text-tinta">{post.title}</h1>
        {post.excerpt && (
          <p className="mx-auto mb-5 max-w-xl font-quote italic text-lg text-miel-800">{post.excerpt}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2 font-display text-eyebrow tracking-wide text-suave">
          {post.teacherGlyph && <span className="text-miel-800">{post.teacherGlyph}</span>}
          <span>{post.teacherName}</span>
          <span className="text-miel-800">·</span>
          <span>{formatCertificateDate(post.publishedAt)}</span>
        </div>
      </header>

      <article className="mx-auto max-w-2xl space-y-5 px-6 py-14 md:px-12">
        {paragraphs.map((para, i) => (
          <p key={i} className="font-body text-base leading-relaxed text-suave">
            {para}
          </p>
        ))}
      </article>
    </div>
  );
}

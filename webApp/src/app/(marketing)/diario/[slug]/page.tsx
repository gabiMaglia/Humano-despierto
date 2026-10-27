import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/atoms/Icon";
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
      <div className="mx-auto max-w-[760px] px-6 pt-8">
        <Link href="/diario" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Volver al diario
        </Link>
      </div>
      <article className="mx-auto max-w-[760px] px-6 pb-24 pt-6">
        <header className="border-b border-linea pb-10">
          <h1 className="text-display-md leading-[1.12] [overflow-wrap:anywhere]">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-xl leading-snug text-tinta [overflow-wrap:anywhere]">{post.excerpt}</p>}
          <p className="mt-6 text-[15px] text-suave">
            Escribe{" "}
            {post.teacherSlug ? (
              <Link href={`/guias/${post.teacherSlug}`} className="font-semibold text-miel-800 hover:underline">
                {post.teacherName}
              </Link>
            ) : (
              <b className="font-semibold text-bosque">{post.teacherName}</b>
            )}{" "}
            · <time dateTime={post.publishedAt}>{formatCertificateDate(post.publishedAt)}</time>
          </p>
        </header>
        <div className="mt-10 space-y-5 text-[18px] leading-[1.8] text-tinta [overflow-wrap:anywhere]">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </div>
  );
}

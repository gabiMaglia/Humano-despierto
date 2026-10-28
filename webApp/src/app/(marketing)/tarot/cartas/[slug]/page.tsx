import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/atoms/Icon";
import TarotCard, { cardImageSrc } from "@/components/tarot/TarotCard";
import { ButtonLink } from "@/components/atoms/Button";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { getSiteUrl } from "@/lib/server/site-url";
import { CARDS, cardBySlug } from "@/lib/tarot/cards";

export function generateStaticParams() {
  return CARDS.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = cardBySlug(slug);
  if (!card) return { title: "Carta no encontrada" };
  const title = `${card.nombre_es}: significado en el tarot`;
  const description = `${card.nombre_es} (${card.nombre_en}) al derecho: ${card.palabras_clave_derecha.slice(0, 4).join(", ")}. Invertida: ${card.palabras_clave_invertida.slice(0, 3).join(", ")}.`;
  return { title, description, alternates: { canonical: `/tarot/cartas/${slug}` }, openGraph: { title, description, url: `/tarot/cartas/${slug}`, type: "article", images: [SITE_OG_IMAGE] } };
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-bosque">{titulo}</h2>
      <div className="mt-3 space-y-3 text-tinta">{children}</div>
    </section>
  );
}

export default async function CartaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = cardBySlug(slug);
  if (!card) notFound();
  const prev = CARDS[(card.indice + 77) % 78]!;
  const next = CARDS[(card.indice + 1) % 78]!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${card.nombre_es}: significado en el tarot`,
    image: `${getSiteUrl()}${cardImageSrc(card.id)}`,
    about: { "@type": "Thing", name: `${card.nombre_en} (Rider-Waite tarot)` },
    inLanguage: "es-AR",
  };

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-[1000px] px-6 pt-8">
        <Link href="/tarot/cartas" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Todas las cartas
        </Link>
      </div>
      <main className="mx-auto grid max-w-[1000px] gap-10 px-6 pb-20 pt-6 md:grid-cols-[0.4fr_0.6fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <TarotCard card={card} size="lg" priority className="w-full" />
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-suave">Arcano</dt><dd>{card.arcano === "mayor" ? `Mayor, ${card.numero}` : `Menor, ${card.palo}`}</dd>
            <dt className="text-suave">Elemento</dt><dd>{card.elemento}</dd>
            {card.astrologia && <><dt className="text-suave">Astrología</dt><dd>{card.astrologia}</dd></>}
            {card.letra_hebrea && <><dt className="text-suave">Letra hebrea</dt><dd>{card.letra_hebrea}</dd></>}
            {card.numerologia && <><dt className="text-suave">Número</dt><dd>{card.numerologia}</dd></>}
          </dl>
        </div>
        <article>
          <p className="text-sm font-semibold text-miel-800">{card.nombre_en}</p>
          <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{card.nombre_es}</h1>
          <p className="mt-4 text-suave">{card.palabras_clave_derecha.join(" · ")}</p>
          <Bloque titulo="Al derecho"><p>{card.significado_derecha}</p></Bloque>
          <Bloque titulo="Invertida"><p className="text-suave">{card.palabras_clave_invertida.join(" · ")}</p><p>{card.significado_invertida}</p></Bloque>
          <Bloque titulo="En cada área">
            <p><strong className="text-bosque">Amor.</strong> {card.amor}</p>
            <p><strong className="text-bosque">Trabajo.</strong> {card.trabajo}</p>
            <p><strong className="text-bosque">Dinero.</strong> {card.dinero}</p>
            <p><strong className="text-bosque">Salud.</strong> {card.salud}</p>
            <p><strong className="text-bosque">Consejo.</strong> {card.consejo}</p>
          </Bloque>
          <Bloque titulo="La ilustración"><p>{card.descripcion_imagen}</p></Bloque>
          <Bloque titulo="Lo que escribió Waite en 1911">
            <p lang="en" className="text-suave">Upright: {card.waite_divinatory.upright}</p>
            <p lang="en" className="text-suave">Reversed: {card.waite_divinatory.reversed}</p>
          </Bloque>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href="/tarot" arrow>Tirar las cartas</ButtonLink>
            <Link href={`/tarot/cartas/${prev.id}`} className="text-sm font-semibold text-miel-800 hover:underline">Anterior: {prev.nombre_es}</Link>
            <Link href={`/tarot/cartas/${next.id}`} className="text-sm font-semibold text-miel-800 hover:underline">Siguiente: {next.nombre_es}</Link>
          </div>
        </article>
      </main>
    </div>
  );
}

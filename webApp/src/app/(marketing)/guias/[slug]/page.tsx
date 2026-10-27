import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/atoms/Button";
import Icon from "@/components/atoms/Icon";
import TeacherPortrait from "@/components/atoms/TeacherPortrait";
import SectionHeading from "@/components/atoms/SectionHeading";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { getTeacherBySlug } from "@/lib/server/guias";


export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) return { title: "Guía no encontrada" };
  const description = teacher.headline ?? teacher.bio ?? undefined;
  return {
    title: teacher.fullName,
    description,
    alternates: { canonical: `/guias/${slug}` },
    // Un openGraph propio reemplaza entero el de la raiz, imagen incluida: va explicita.
    openGraph: { title: teacher.fullName, description, url: `/guias/${slug}`, type: "profile", images: [SITE_OG_IMAGE] },
  };
}

export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const M = await getTeacherBySlug(slug);
  if (!M) notFound();

  const bioParagraphs = (M.bio ?? "").split(/\n{2,}/).filter(Boolean);
  const datos = [
    M.yearsPractice != null ? `${M.yearsPractice} ${M.yearsPractice === 1 ? "año" : "años"} de práctica` : null,
    `${M.coursesCount} ${M.coursesCount === 1 ? "curso publicado" : "cursos publicados"}`,
    M.location,
  ].filter((d): d is string => !!d);

  return (
    <div className="min-h-screen bg-fondo">
      <div className="mx-auto max-w-[1200px] px-6 pt-8">
        <Link href="/guias" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Todas las guías
        </Link>
      </div>

      <header className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-16 pt-6 md:grid-cols-[1.3fr_0.7fr] md:gap-16">
        <div>
          {M.discipline && <p className="text-sm font-semibold text-miel-800">{M.discipline}</p>}
          <h1 className="mt-3 text-display-lg leading-[1.08] tracking-[-0.025em]">{M.fullName}</h1>
          {M.headline && <p className="mt-4 max-w-[44ch] text-xl leading-snug text-tinta">{M.headline}</p>}
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-suave">
            {datos.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </p>
          {M.courses.length > 0 && (
            <div className="mt-8">
              <ButtonLink href="#cursos" arrow>
                Ver sus cursos
              </ButtonLink>
            </div>
          )}
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-lg bg-salvia-100 shadow-lift md:max-w-none">
          <TeacherPortrait
            name={M.fullName}
            src={M.avatarUrl}
            alt={`Retrato de ${M.fullName}`}
            size="lg"
            loading="eager"
            className="absolute inset-0"
          />
        </div>
      </header>

      {bioParagraphs.length > 0 && (
        <section aria-labelledby="camino-titulo" className="border-t border-linea py-16">
          <div className="mx-auto grid max-w-[1200px] items-start gap-10 px-6 md:grid-cols-[1.2fr_0.8fr] md:gap-16">
            <div>
              <SectionHeading id="camino-titulo" size="md" title="Su camino" className="mb-6" />
              <div className="max-w-[64ch] space-y-4">
                {bioParagraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-lg text-tinta" : "text-tinta"}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
            {M.quote && (
              <figure className="rounded-lg bg-salvia-100 p-8">
                <blockquote className="text-xl font-medium leading-relaxed text-bosque">
                  <p>«{M.quote}»</p>
                </blockquote>
                <figcaption className="mt-4 text-sm text-suave">{M.fullName}</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}

      {M.formations.length > 0 && (
        <section aria-labelledby="formacion-titulo" className="border-t border-linea bg-papel py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <SectionHeading id="formacion-titulo" size="md" title="Formación" className="mb-6" />
            <ul className="max-w-3xl">
              {M.formations.map((f, i) => (
                <li key={`${f.year}-${i}`} className="grid gap-1 border-b border-linea py-4 sm:grid-cols-[72px_1fr_auto] sm:gap-5">
                  <span className="font-semibold tabular-nums text-bosque">{f.year}</span>
                  <span className="text-tinta">{f.title}</span>
                  <span className="text-sm text-suave">{f.place}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section id="cursos" aria-labelledby="cursos-titulo" className="scroll-mt-20 border-t border-linea py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeading id="cursos-titulo" size="md" title="Sus cursos" className="mb-6" />
          {M.courses.length === 0 ? (
            <p className="text-suave">Todavía no tiene cursos publicados.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {M.courses.map((c) => (
                <li key={c.slug} className="group relative rounded-lg border border-linea bg-papel p-5 transition-shadow hover:shadow-card">
                  <p className="text-sm font-semibold text-miel-800">
                    {c.discipline} <span className="text-suave">· {c.level}</span>
                  </p>
                  <h3 className="mt-1 text-lg">
                    <Link href={`/cursos/${c.slug}`} className="after:absolute after:inset-0 group-hover:text-miel-800">
                      {[c.title, c.titleEm].filter(Boolean).join(" ")}
                    </Link>
                  </h3>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {M.testimonials.length > 0 && (
        <section aria-labelledby="voces-titulo" className="border-t border-linea bg-papel py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <SectionHeading
              id="voces-titulo"
              size="md"
              title="Lo que dicen de ella"
              // T-017 c.3: estas citas son contenido curado del perfil, no reseñas verificadas.
              // Se dice, igual que antes: marcarlas como reales sería mentir.
              lead="Testimonios ilustrativos, cargados en su perfil. Las reseñas verificadas están en la página de cada curso."
              className="mb-8"
            />
            <ul className="grid gap-5 md:grid-cols-3">
              {M.testimonials.map((t, i) => (
                <li key={`${t.who}-${i}`}>
                  <figure className="h-full rounded-lg bg-salvia-100 p-6">
                    <blockquote className="text-[17px] leading-relaxed text-tinta">
                      <p>«{t.quote}»</p>
                    </blockquote>
                    <figcaption className="mt-4 text-sm">
                      <b className="block font-semibold text-bosque">{t.who}</b>
                      <span className="text-suave">{t.course}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

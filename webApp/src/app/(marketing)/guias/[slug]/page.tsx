import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/atoms/Breadcrumb";
import SectionDivider from "@/components/atoms/SectionDivider";
import StatBlock from "@/components/atoms/StatBlock";
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

  return (
    <div className="min-h-screen bg-fondo">
      <Breadcrumb crumbs={[{ label:"Guías", href:"/guias" }, { label:M.fullName }]} />

      {/* Hero */}
      <header className="px-6 py-16 md:px-12 grid md:grid-cols-[1fr_auto] gap-12 items-start border-b border-linea">
        <div>
          <p className="mb-4 font-display text-eyebrow tracking-[0.25em] text-suave">— Tras el velo —</p>
          <div className="mb-3 text-5xl font-display text-bosque">{M.glyph}</div>
          <h1 className="mb-2 font-display text-display-md text-tinta">{M.fullName}</h1>
          {M.headline && (
            <p className="mb-1 font-display text-eyebrow tracking-[0.2em] text-suave uppercase">{M.headline}</p>
          )}
          {M.location && (
            <p className="mb-8 font-display text-eyebrow tracking-wide text-suave">{M.location}</p>
          )}

          <div className="mb-8 flex flex-wrap gap-6 md:gap-10">
            {[
              M.yearsPractice != null ? { num: String(M.yearsPractice), label: "Años" } : null,
              { num: String(M.coursesCount), label: "Cursos" },
            ]
              .filter((s): s is { num: string; label: string } => s !== null)
              .map((s) => <StatBlock key={s.label} num={s.num} label={s.label} align="left" />)}
          </div>

          <div className="flex flex-wrap gap-3.5">
            <a href="#cursos" className="btn btn-primary">Ver sus cursos</a>
          </div>
        </div>

        {/* Portrait */}
        <div className="hidden md:flex flex-col items-center gap-4">
          <div className="relative h-64 w-48 rounded-sm overflow-hidden bg-salvia-100">
            {M.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada que vence en 1 h; el optimizador de next/image la cachearia mas alla de su vida.
              <img src={M.avatarUrl} alt={`Retrato de ${M.fullName}`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-6xl font-display text-bosque">
                {M.glyph}
              </span>
            )}
            {["top-3 left-3 border-t border-l","top-3 right-3 border-t border-r","bottom-3 left-3 border-b border-l","bottom-3 right-3 border-b border-r"].map((cls) => (
              <span key={cls} className={`absolute h-5 w-5 ${cls} border-miel`} />
            ))}
          </div>
        </div>
      </header>

      {/* Bio */}
      {bioParagraphs.length > 0 && (
        <section className="px-6 py-16 md:px-12">
          <div className="mx-auto max-w-5xl">
            <SectionDivider label="Su camino" className="mb-10" />
            <div className={M.quote ? "grid md:grid-cols-[1.2fr_1fr] gap-10 items-start" : "max-w-3xl"}>
              <div className="space-y-4">
                {bioParagraphs.map((p, i) => (
                  <p key={i} className={`font-${i===0?"quote italic text-lg text-tinta":"body text-sm text-suave"} leading-relaxed`}>
                    {p}
                  </p>
                ))}
              </div>
              {M.quote && (
                <aside className="tarjeta p-8">
                  <span className="block mb-4 text-4xl text-miel-800 font-quote">&ldquo;</span>
                  <p className="mb-4 font-quote italic text-xl text-tinta leading-relaxed">{M.quote}</p>
                  <span className="font-display text-eyebrow tracking-wide text-suave">— {M.fullName}</span>
                </aside>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Formación */}
      {M.formations.length > 0 && (
        <section className="border-t border-linea bg-papel px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Formación" className="mb-10" />
            <div className="space-y-4">
              {M.formations.map((f, i) => (
                <div key={`${f.year}-${i}`} className="flex items-start gap-5 border-b border-linea pb-4">
                  <span className="flex-none font-display text-eyebrow tracking-wide text-bosque w-16">{f.year}</span>
                  <span className="flex-1 font-body text-sm text-tinta">{f.title}</span>
                  <span className="flex-none font-display text-eyebrow tracking-wide text-suave">{f.place}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Courses */}
      <section id="cursos" className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <SectionDivider label="Sus cursos" className="mb-10" />
          <div className="grid gap-4 sm:grid-cols-2">
            {M.courses.map((c, i) => (
              <Link key={c.slug} href={`/cursos/${c.slug}`}>
                <article className="tarjeta p-5 cursor-pointer hover:-translate-y-0.5 transition-transform">
                  <div className="mb-3 flex justify-between items-center">
                    <span className="font-display text-sm tracking-wider text-bosque">{String(i + 1)}</span>
                    {c.moonGlyph && <span className="text-miel-800 text-base">{c.moonGlyph}</span>}
                  </div>
                  <p className="mb-1 font-display text-eyebrow tracking-[0.15em] text-miel-800">
                    {c.discipline} · {c.level}
                  </p>
                  <h4 className="font-display text-base tracking-wide text-tinta">
                    {c.title}{c.titleEm && <> <em className="font-quote italic text-miel-800">{c.titleEm}</em></>}
                  </h4>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      {M.testimonials.length > 0 && (
        <section className="border-t border-linea bg-papel px-6 py-16 md:px-12">
          <div className="mx-auto max-w-5xl">
            <SectionDivider label="Voces de quienes pasaron" className="mb-4" />
            {/* Mismo criterio que la landing (T-017 c.3): sin tabla de reviews —sin
                moderación ni vínculo a una inscripción verificada— estas citas son
                contenido curado, no testimonios de alumnas reales. Se marca acá también:
                marcarlo en un lado y no en el otro es peor que no marcarlo, porque
                sugiere que estos sí son auténticos. */}
            <p className="mb-10 text-center font-display text-[10px] uppercase tracking-[0.2em] text-suave">
              — testimonios ilustrativos —
            </p>
            <div className="grid gap-5 md:grid-cols-3">
              {M.testimonials.map((t, i) => (
                <blockquote key={`${t.who}-${i}`} className="tarjeta relative p-7">
                  <span className="pointer-events-none absolute left-4 top-1 select-none font-quote text-[64px] leading-none text-miel-800">&ldquo;</span>
                  <p className="relative z-10 mb-4 font-quote italic text-base leading-relaxed text-tinta">{t.quote}</p>
                  <footer>
                    <strong className="block font-display text-[11px] tracking-[0.15em] text-tinta uppercase">{t.who}</strong>
                    <span className="font-display text-eyebrow tracking-wide text-suave">{t.course}</span>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-linea px-6 py-24 md:px-12 text-center bg-salvia-100">
        <p className="mb-3 font-display text-eyebrow tracking-[0.25em] text-suave">— Para quienes buscan —</p>
        <h2 className="mb-3 font-display text-4xl tracking-wide text-tinta">
          Una <em className="font-quote italic text-miel-800">guía</em> que sostenga el camino
        </h2>
        <p className="mb-8 font-quote italic text-lg text-suave">
          Sus recorridos están abiertos · se cursan cuando quieras, a tu ritmo
        </p>
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <Link href="/cursos" className="btn btn-primary">Ver el catálogo</Link>
          <a href="#cursos" className="btn btn-outline">Ver todos sus cursos</a>
        </div>
      </section>
    </div>
  );
}

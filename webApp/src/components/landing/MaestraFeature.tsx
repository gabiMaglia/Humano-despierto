import { getFeaturedTeacher } from "@/lib/server/guias";
import Image from "next/image";
import { placeholderPortrait, unsplashUrl } from "@/content/placeholder-photos";

export default async function MaestraFeature() {
  const maestra = await getFeaturedTeacher();
  if (!maestra) return null;

  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl grid gap-16 md:grid-cols-[1fr_1.1fr] items-center">

        {/* PLACEHOLDER (ADR-015): retrato de muestra hasta que la guía destacada tenga el suyo acá (T-061). */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-salvia shadow-lift">
          <Image
            src={unsplashUrl(placeholderPortrait(maestra.slug).id)}
            alt=""
            fill
            sizes="(min-width: 768px) 45vw, 100vw"
            className="object-cover"
          />
        </div>

        {/* Text */}
        <div>
          <p className="mb-5 font-display text-eyebrow tracking-[0.25em] text-bosque">
            Quien transmite
          </p>

          <blockquote className="mb-8 border-l-2 border-miel pl-6 font-quote italic text-[26px] leading-[1.4] text-tinta">
            &ldquo;{maestra.quote}&rdquo;
          </blockquote>

          <div className="mb-1.5 font-display text-2xl uppercase tracking-[0.25em] text-bosque">
            {maestra.fullName}
          </div>
          <div className="mb-6 font-display text-eyebrow uppercase tracking-[0.18em] text-suave">
            {maestra.headline}
          </div>

          <div className="mb-7 flex gap-8 text-sm">
            {[
              maestra.yearsPractice != null
                ? { strong: String(maestra.yearsPractice), label: "Años" }
                : null,
              { strong: String(maestra.coursesCount), label: "Cursos vivos" },
            ]
              .filter((s): s is { strong: string; label: string } => s !== null)
              .map(({ strong, label }) => (
                <div key={label}>
                  <strong className="mb-0.5 block font-semibold text-tinta">{strong}</strong>
                  <span className="font-body text-xs text-suave">{label}</span>
                </div>
              ))}
          </div>

          <a href={`/guias/${maestra.slug}`} className="btn btn-outline">
            Conocer su obra
          </a>
        </div>
      </div>
    </section>
  );
}

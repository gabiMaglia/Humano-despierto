import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import { HERO_PHOTO, unsplashUrl } from "@/content/placeholder-photos";
import type { HeroStat } from "@/lib/landing";

const HERO = {
  badge: "Inscripción abierta · Todo el año",
  h1: { pre: "Una escuela para", em: "oficios sutiles", post: "del alma humana" },
  sub: "Astrología, tarot, herbalismo y reiki enseñados por guías con linaje. Formación profesional para terapeutas que buscan profundidad, no atajos.",
  ctas: [
    { label: "Ver los cursos", href: "/cursos" },
    { label: "Conocé a las guías", href: "/guias" },
  ],
} as const;

export default function HeroSection({ stats }: { stats: HeroStat[] }) {
  return (
    <section
      className="relative overflow-hidden px-6 pb-20 pt-28 md:px-12 md:pb-28 md:pt-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[1.05fr_1fr]">

      {/* ── Text ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-start">

        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-pill border border-linea px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-miel" aria-hidden="true" />
          <span className="font-display text-xs uppercase tracking-[0.08em] text-bosque">
            {HERO.badge}
          </span>
        </div>

        {/* H1 */}
        <h1 className="mb-6 font-display text-display-lg leading-[1.05] tracking-tight text-bosque text-balance">
          {HERO.h1.pre}<br />
          <em className="font-quote text-miel-800">{HERO.h1.em}</em><br />
          {HERO.h1.post}
        </h1>

        {/* Sub */}
        <p className="mb-10 max-w-[460px] font-quote italic text-xl leading-relaxed text-suave text-pretty">
          {HERO.sub}
        </p>

        {/* CTAs */}
        <div className="mb-14 flex flex-wrap gap-3.5">
          <ButtonLink href={HERO.ctas[0].href} arrow>
            {HERO.ctas[0].label}
          </ButtonLink>
          <ButtonLink href={HERO.ctas[1].href} variant="outline">
            {HERO.ctas[1].label}
          </ButtonLink>
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="flex gap-9 border-t border-linea pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <span className="block font-display text-3xl text-tinta">{s.num}</span>
                <span className="mt-1 block font-display text-eyebrow tracking-wide text-suave">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Foto (PLACEHOLDER, ADR-015) ─────────────────────────────────── T-061 rehace el hero */}
      <div className="relative">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-salvia shadow-lift">
          <Image
            src={unsplashUrl(HERO_PHOTO.id)}
            alt={HERO_PHOTO.alt}
            fill
            preload
            sizes="(min-width: 768px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
        <LeafIllustration className="absolute -bottom-8 -left-12 hidden md:block" />
      </div>

      </div>{/* /mx-auto grid */}

    </section>
  );
}

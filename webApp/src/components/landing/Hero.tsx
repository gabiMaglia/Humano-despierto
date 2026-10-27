import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import TeacherPortrait from "@/components/atoms/TeacherPortrait";
import { HERO_PHOTO, unsplashUrl } from "@/content/placeholder-photos";
import { LANDING } from "@/content/landing";

export interface HeroQuote {
  text: string;
  /** Guía real que la firmó (`profiles.quote`); sin ella, la frase de respaldo va sin firma. */
  guide: { name: string; role: string | null; slug: string; avatarUrl: string | null } | null;
}

/** Hero B4: foto a sangre, la guía habla. El header va transparente encima (`overHero`). */
export default function Hero({ quote }: { quote: HeroQuote }) {
  return (
    <section aria-label="Presentación" className="relative grid min-h-[min(100svh,860px)] items-end overflow-hidden bg-bosque text-white">
      <Image
        src={unsplashUrl(HERO_PHOTO.id)}
        alt={HERO_PHOTO.alt}
        fill
        preload
        sizes="100vw"
        className="object-cover object-[center_40%]"
      />
      {/* El degradado es lo que da contraste al texto blanco sobre una foto luminosa. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgb(20_32_24/0.9)_0%,rgb(20_32_24/0.62)_55%,rgb(20_32_24/0.3)_100%)]"
      />
      {/* Banda superior: el header transparente tiene texto blanco encima de la foto. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgb(20_32_24/0.6),rgb(20_32_24/0))]" />
      <div className="relative mx-auto w-full max-w-[1200px] px-6 pb-16 pt-36 md:pb-[72px]">
        <h1 className="sr-only">{LANDING.hero.heading}</h1>
        <figure>
          <blockquote className="max-w-[20ch] text-[clamp(32px,5.4vw,68px)] font-semibold leading-[1.08] tracking-[-0.025em] text-balance">
            <p>{quote.guide ? `«${quote.text}»` : quote.text}</p>
          </blockquote>
          <figcaption className="mb-10 mt-6 flex items-center gap-3.5 text-base">
            {quote.guide ? (
              <>
                <TeacherPortrait
                  name={quote.guide.name}
                  src={quote.guide.avatarUrl}
                  size="sm"
                  loading="eager"
                  className="h-12 w-12 flex-none rounded-full border-2 border-white"
                />
                <span>
                  <b className="block font-semibold">{quote.guide.name}</b>
                  {quote.guide.role && <span className="block text-sm text-salvia-100">{quote.guide.role}</span>}
                </span>
              </>
            ) : (
              <span className="text-salvia-100">{LANDING.hero.fallbackByline}</span>
            )}
          </figcaption>
        </figure>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/cursos" arrow>
            {LANDING.hero.ctaCursos}
          </ButtonLink>
          <ButtonLink href="/guias" variant="outline-light">
            {LANDING.hero.ctaGuias}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

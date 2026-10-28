import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import { PLACEHOLDER_PHOTOS, unsplashUrl } from "@/content/placeholder-photos";

// PLACEHOLDER (ADR-015): la foto del manifiesto de B4, verificada en el README.
const FOTO = PLACEHOLDER_PHOTOS.find((p) => p.id === "1760445529648-9c8af38a0bb3")!;

export default function Manifiesto() {
  const m = LANDING.manifiesto;
  return (
    <section aria-labelledby="manifiesto-titulo" className="py-[90px] md:pb-[110px] md:pt-[130px]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 md:grid-cols-2 md:gap-[72px]">
        <div>
          <Reveal>
            <h2 id="manifiesto-titulo" className="mb-5 max-w-[14ch] text-[clamp(32px,4vw,50px)] leading-[1.12]">
              {m.title}
            </h2>
          </Reveal>
          {m.paragraphs.map((p, i) => (
            <Reveal key={i} delay={i === 0 ? 1 : 2}>
              <p className="mt-4 max-w-[44ch] text-suave">{p}</p>
            </Reveal>
          ))}
          <Reveal delay={3} className="mt-8">
            <ButtonLink href="#empezar" arrow>
              {m.cta}
            </ButtonLink>
          </Reveal>
        </div>
        <Reveal delay={1} className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-salvia shadow-lift">
            <Image src={unsplashUrl(FOTO.id)} alt={FOTO.alt} fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
          </div>
          <LeafIllustration className="absolute -bottom-8 right-2 md:-left-[54px] md:right-auto" />
        </Reveal>
      </div>
    </section>
  );
}

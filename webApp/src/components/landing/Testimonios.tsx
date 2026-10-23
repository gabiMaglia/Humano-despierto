import LeafIllustration from "@/components/atoms/LeafIllustration";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import type { LandingTestimonial } from "@/lib/server/landing";

/** Reseñas reales de 5 estrellas (T-053), en el bloque oscuro de B1. */
export default function Testimonios({ items }: { items: LandingTestimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="testimonios-titulo" className="pb-[100px] md:pb-[120px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal className="relative overflow-hidden rounded-[24px] bg-bosque px-6 py-14 text-white md:px-16">
          <LeafIllustration className="absolute -right-8 -top-5 w-[220px] text-salvia opacity-20" />
          <h2 id="testimonios-titulo" className="relative mb-10 text-[clamp(26px,3vw,36px)] text-white">
            {LANDING.testimonios.title}
          </h2>
          <ul className="relative grid gap-10 md:grid-cols-3">
            {items.map((t) => (
              <li key={t.id}>
                <figure>
                  <blockquote className="text-lg font-medium leading-relaxed text-white">
                    <p>«{t.quote}»</p>
                  </blockquote>
                  <figcaption className="mt-5 text-[15px]">
                    <b className="block font-semibold text-white">{t.who}</b>
                    {t.role && <span className="text-salvia">{t.role}</span>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

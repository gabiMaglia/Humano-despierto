import type { LandingTestimonial } from "@/lib/server/landing";

export default function TestimonialsSection({ testimonials }: { testimonials: LandingTestimonial[] }) {
  if (testimonials.length === 0) return null;
  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">

        {/* Eyebrow */}
        <div className="mb-3.5 flex items-center gap-3.5">
          <div className="h-px flex-1 bg-salvia" />
          <span className="font-display text-eyebrow tracking-[0.25em] text-bosque">Voces del círculo</span>
          <div className="h-px flex-1 bg-salvia" />
        </div>

        <h2 className="mb-4 text-center font-display text-4xl tracking-wider text-tinta">
          Quienes han <em className="font-quote italic text-miel-800">cruzado</em>
        </h2>
        <p className="mx-auto mb-14 max-w-[560px] text-center font-quote italic text-xl leading-relaxed text-suave">
          Lo que dicen las iniciadas que sostienen consultas hoy.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote key={t.id} className="tarjeta relative p-8">
              {/* Decorative quote mark */}
              <span
                className="pointer-events-none absolute left-4 top-1 select-none font-quote text-[80px] leading-none text-miel-800"
                aria-hidden
              >
                &ldquo;
              </span>

              <p className="relative z-10 mt-3 mb-6 font-quote italic text-lg leading-relaxed text-tinta">
                {t.quote}
              </p>

              <footer className="flex items-center gap-3">
                <span className="h-9 w-9 flex-none rounded-full border border-linea bg-salvia-100" />
                <cite className="not-italic">
                  <span className="block font-display text-[11px] uppercase tracking-[0.2em] text-tinta">
                    {t.who}
                  </span>
                  <span className="mt-0.5 block font-display text-[9px] uppercase tracking-[0.2em] text-suave">
                    {t.role}
                  </span>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

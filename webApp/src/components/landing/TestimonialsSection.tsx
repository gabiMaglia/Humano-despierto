import { TESTIMONIALS } from "@/lib/mocks/landing";

export default function TestimonialsSection() {
  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">

        {/* Eyebrow */}
        <div className="mb-3.5 flex items-center gap-3.5">
          <div className="h-px flex-1 bg-lila-300/18" />
          <span className="font-display text-eyebrow tracking-[0.25em] text-lila-300">Voces del círculo</span>
          <div className="h-px flex-1 bg-lila-300/18" />
        </div>

        <h2 className="mb-4 text-center font-display text-4xl tracking-wider text-ink">
          Quienes han <em className="font-quote italic text-lila-300">cruzado</em>
        </h2>
        <p className="mx-auto mb-14 max-w-[560px] text-center font-quote italic text-xl leading-relaxed text-ink-soft">
          Lo que dicen las iniciadas que sostienen consultas hoy.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.who} className="cosmos-card relative p-8">
              {/* Decorative quote mark */}
              <span
                className="pointer-events-none absolute left-4 top-1 select-none font-quote text-[80px] leading-none text-lila-300/30"
                aria-hidden
              >
                &ldquo;
              </span>

              <p className="relative z-10 mt-3 mb-6 font-quote italic text-lg leading-relaxed text-ink">
                {t.quote}
              </p>

              <footer className="flex items-center gap-3">
                <span className="h-9 w-9 flex-none rounded-full border border-lila-300/40 bg-linear-to-br from-gold-400 to-magenta" />
                <cite className="not-italic">
                  <span className="block font-display text-[11px] uppercase tracking-[0.2em] text-ink">
                    {t.who}
                  </span>
                  <span className="mt-0.5 block font-display text-[9px] uppercase tracking-[0.2em] text-ink-faint">
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

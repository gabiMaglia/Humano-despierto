import { MAESTRA } from "@/lib/mocks/landing";

const CORNERS = [
  "top-3 left-3 border-t border-l",
  "top-3 right-3 border-t border-r",
  "bottom-3 left-3 border-b border-l",
  "bottom-3 right-3 border-b border-r",
] as const;

export default function MaestraFeature() {
  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl grid gap-16 md:grid-cols-[1fr_1.1fr] items-center">

        {/* Photo placeholder */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-linear-to-b from-lila-700 to-cosmos-1">
          {/* Gold highlight */}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 25%, rgba(245,215,110,0.3), transparent 40%)" }}
          />
          {/* Subtle grain */}
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)" }}
          />
          {/* SVG detail */}
          <svg
            className="absolute bottom-6 right-6 h-14 w-14 opacity-60"
            viewBox="0 0 60 60" stroke="#f5d76e" fill="none" strokeWidth={0.8}
            aria-hidden
          >
            <circle cx={30} cy={30} r={20} />
            <path d="M30 10 L30 50 M10 30 L50 30 M16 16 L44 44 M44 16 L16 44" />
          </svg>
          {/* Corner frames */}
          {CORNERS.map((cls) => (
            <span key={cls} className={`absolute h-6 w-6 ${cls} border-gold-400/60`} />
          ))}
        </div>

        {/* Text */}
        <div>
          <p className="mb-5 font-display text-eyebrow tracking-[0.25em] text-lila-300">
            Quien transmite
          </p>

          <blockquote className="mb-8 border-l-2 border-gold-400 pl-6 font-quote italic text-[26px] leading-[1.4] text-ink">
            &ldquo;{MAESTRA.quote}&rdquo;
          </blockquote>

          <div className="mb-1.5 font-display text-2xl uppercase tracking-[0.25em] text-lila-300">
            {MAESTRA.name}
          </div>
          <div className="mb-6 font-display text-eyebrow uppercase tracking-[0.18em] text-ink-faint">
            {MAESTRA.title}
          </div>

          <div className="mb-7 flex gap-8 text-sm">
            {[
              { strong: MAESTRA.sign,                       label: "Carta natal"  },
              { strong: String(MAESTRA.courses),            label: "Cursos vivos" },
              { strong: String(MAESTRA.students),           label: "Estudiantes"  },
            ].map(({ strong, label }) => (
              <div key={label}>
                <strong className="mb-0.5 block font-semibold text-ink">{strong}</strong>
                <span className="font-body text-xs text-ink-soft">{label}</span>
              </div>
            ))}
          </div>

          <a href={MAESTRA.href} className="btn-ritual btn-ritual-ghost rounded-pill">
            Conocer su obra ↦
          </a>
        </div>
      </div>
    </section>
  );
}

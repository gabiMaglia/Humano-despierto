import Link from "next/link";

interface GuiaCardData {
  slug: string;
  name: string;
  glyph: string;
  role: string;
  location: string;
  coursesCount: string;
  rating: string;
  sun: string;
  moon: string;
  asc: string;
  quote: string;
}

export default function GuiaCard({ slug, name, glyph, role, location, coursesCount, sun, moon, asc, quote }: GuiaCardData) {
  return (
    <Link href={`/guias/${slug}`} className="group block">
      <article className="cosmos-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lila-glow cursor-pointer">

        {/* Portrait placeholder */}
        <div className="relative h-52 bg-linear-to-b from-lila-700 to-cosmos-1 overflow-hidden flex items-end justify-between px-5 pb-5">
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle at 30% 20%, rgba(196,181,253,0.2), transparent 60%), radial-gradient(circle at 70% 80%, rgba(245,215,110,0.12), transparent 50%)",
          }} />
          {["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((cls) => (
            <span key={cls} className={`absolute h-4 w-4 ${cls} border-gold-400/40`} />
          ))}
          <span className="relative font-display text-6xl text-lila-300 leading-none select-none">{glyph}</span>
          <div className="relative text-right">
            <p className="font-display text-eyebrow tracking-[0.2em] text-gold-400 uppercase">{coursesCount}</p>
            <p className="font-display text-[9px] tracking-[0.15em] text-ink-faint uppercase">cursos</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="mb-0.5 font-display text-eyebrow tracking-[0.2em] text-gold-400 uppercase">{role}</p>
          <h3 className="mb-0.5 font-display text-xl tracking-wide text-ink group-hover:text-lila-200 transition-colors">{name}</h3>
          <p className="mb-4 font-display text-eyebrow tracking-cosmic text-ink-faint">✦ {location}</p>

          {/* Chart signs */}
          <div className="mb-4 flex gap-4 border-b border-lila-300/12 pb-4">
            {[
              { glyph: "☉", label: "Sol",  value: sun  },
              { glyph: "☽", label: "Luna", value: moon },
              { glyph: "↑", label: "Asc.", value: asc  },
            ].map(({ glyph: g, label, value }) => (
              <div key={label} className="flex-1">
                <p className="font-display text-[9px] tracking-[0.15em] text-ink-faint uppercase mb-0.5">{g} {label}</p>
                <p className="font-display text-eyebrow tracking-wide text-lila-300">{value}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <p className="font-quote italic text-sm text-ink-soft leading-relaxed line-clamp-2">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      </article>
    </Link>
  );
}

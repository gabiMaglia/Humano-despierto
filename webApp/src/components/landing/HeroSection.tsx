import ZodiacWheel from "@/components/cosmos/ZodiacWheel";
import { HERO } from "@/lib/mocks/landing";

export default function HeroSection() {
  return (
    <section
      className="relative grid items-center gap-12 overflow-hidden px-6 pb-20 pt-24 md:grid-cols-[1.05fr_1fr] md:px-12 md:pb-32 md:pt-32 min-h-screen"
      style={{ backgroundImage: "radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 30%, rgba(10,4,24,0.6) 70%, #0a0418 100%)" }}
    >
      {/* ── Text ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-start">

        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-pill border border-lila-300/40 px-3.5 py-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-gold-400"
            style={{ animation: "pulse-gold 2s ease-in-out infinite", boxShadow: "0 0 8px #f5d76e" }}
          />
          <span className="font-display text-[9px] uppercase tracking-[0.22em] text-lila-300">
            {HERO.badge}
          </span>
        </div>

        {/* H1 */}
        <h1 className="mb-6 font-display text-display-lg leading-[1.05] tracking-wide text-ink text-balance">
          {HERO.h1.pre}<br />
          <em className="font-quote text-lila-300">{HERO.h1.em}</em><br />
          {HERO.h1.post}
        </h1>

        {/* Sub */}
        <p className="mb-10 max-w-[460px] font-quote italic text-xl leading-relaxed text-ink-soft text-pretty">
          {HERO.sub}
        </p>

        {/* CTAs */}
        <div className="mb-14 flex flex-wrap gap-3.5">
          <a href={HERO.ctas[0].href} className="btn-ritual btn-ritual-primary rounded-pill">
            {HERO.ctas[0].label}
          </a>
          <a href={HERO.ctas[1].href} className="btn-ritual btn-ritual-ghost rounded-pill">
            {HERO.ctas[1].label}
          </a>
        </div>

        {/* Stats */}
        <div className="flex gap-9 border-t border-lila-300/18 pt-6">
          {HERO.stats.map((s) => (
            <div key={s.label}>
              <span className="block font-display text-3xl text-ink">{s.num}</span>
              <span className="mt-1 block font-display text-eyebrow tracking-cosmic text-ink-faint">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zodiac wheel ─────────────────────────────────────────────────── */}
      <div className="relative hidden items-center justify-end md:flex">
        <div className="relative aspect-square w-full max-w-[560px]">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-[10%] animate-breathe rounded-full bg-lila-600/20 blur-[40px]" />
          <ZodiacWheel size={560} />
          {/* Floating sigils */}
          {[
            { icon: "✦", pos: "-top-3 right-[18%]",  delay: "0s"   },
            { icon: "☾", pos: "bottom-[6%] -left-2",  delay: "1.5s" },
            { icon: "☉", pos: "top-[40%] -right-3.5", delay: "3s"   },
          ].map(({ icon, pos, delay }) => (
            <span
              key={icon}
              className={`absolute ${pos} font-display text-sm text-gold-400`}
              style={{ animation: `float 6s ease-in-out ${delay} infinite` }}
            >
              {icon}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 md:flex">
        <span className="font-display text-[9px] uppercase tracking-[0.25em] text-ink-faint">Desplazar</span>
        <div
          className="h-8 w-px bg-gradient-to-b from-ink-faint to-transparent"
          style={{ animation: "scrollDrop 2s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
}

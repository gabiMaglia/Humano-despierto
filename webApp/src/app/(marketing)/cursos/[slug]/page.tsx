import Breadcrumb from "@/components/atoms/Breadcrumb";
import SectionDivider from "@/components/atoms/SectionDivider";
import StatBlock from "@/components/atoms/StatBlock";
import { COURSE_DETAIL } from "@/lib/mocks/courses";

const FRAME_CORNERS = [
  "top-3 left-3 border-t border-l",
  "top-3 right-3 border-t border-r",
  "bottom-3 left-3 border-b border-l",
  "bottom-3 right-3 border-b border-r",
] as const;

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await params; // slug would select the course; we show COURSE_DETAIL as the mock
  const C = COURSE_DETAIL;

  return (
    <div className="min-h-screen bg-cosmos-0">
      <Breadcrumb crumbs={[
        { label:"Catálogo", href:"/cursos" },
        { label:C.tag },
        { label:C.title },
      ]} />

      {/* Pergamino header */}
      <header className="border-b border-lila-300/18 px-6 py-16 md:px-12 text-center">
        {/* Glyphs row */}
        <div className="mb-6 flex items-center justify-center gap-6">
          <svg className="h-12 w-12 stroke-lila-300/60 fill-none" viewBox="0 0 60 60" strokeWidth={0.6} aria-hidden>
            <circle cx={30} cy={30} r={22} /><circle cx={30} cy={30} r={14} strokeDasharray="1 2" />
            <path d="M30 8 L30 52 M8 30 L52 30 M14 14 L46 46 M14 46 L46 14" />
          </svg>
          <span className="font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Un curso de —</span>
          <svg className="h-12 w-12 stroke-gold-400/60 fill-none" viewBox="0 0 60 60" strokeWidth={0.6} aria-hidden>
            <polygon points="30,8 50,42 10,42" /><polygon points="30,52 50,18 10,18" />
            <circle cx={30} cy={30} r={6} />
          </svg>
        </div>

        <p className="mb-3 font-display text-eyebrow tracking-[0.2em] text-gold-400">✦ {C.tag} · {C.level}</p>
        <h1 className="font-display text-display-md text-ink mb-3">{C.title}</h1>
        <p className="font-quote italic text-xl text-lila-300 mb-6">{C.subtitle}</p>

        <div className="flex items-center justify-center gap-3.5 mb-8">
          <div className="h-px flex-1 max-w-[160px] bg-lila-300/18" />
          <span className="font-display text-eyebrow tracking-[0.25em] text-ink-faint">☾  ✦  ☉</span>
          <div className="h-px flex-1 max-w-[160px] bg-lila-300/18" />
        </div>

        <p className="mx-auto max-w-xl font-quote italic text-lg text-ink-soft leading-relaxed mb-10">
          {C.intro}
        </p>

        {/* Meta stats */}
        <div className="flex items-center justify-center gap-6 md:gap-10">
          {C.stats.map((s, i) => (
            <div key={s.label} className="flex items-center gap-6 md:gap-10">
              <StatBlock num={s.num} label={s.label} size="lg" />
              {i < C.stats.length - 1 && <span className="text-lila-300/30 text-xl">·</span>}
            </div>
          ))}
        </div>
      </header>

      {/* Maestra strip */}
      <section className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-10 md:px-12">
        <div className="mx-auto max-w-4xl flex items-center gap-8 md:gap-12">
          {/* Photo placeholder */}
          <div className="relative flex-none h-24 w-24 md:h-32 md:w-32 rounded-sm overflow-hidden bg-linear-to-b from-lila-700 to-cosmos-1">
            {FRAME_CORNERS.map((cls) => (
              <span key={cls} className={`absolute h-4 w-4 ${cls} border-gold-400/60`} />
            ))}
          </div>
          <div>
            <p className="mb-1 font-display text-eyebrow tracking-[0.2em] text-ink-faint uppercase">Quien transmite</p>
            <h3 className="mb-1 font-display text-xl tracking-wider text-lila-300">{C.teacher.name}</h3>
            <p className="mb-2 font-display text-eyebrow tracking-cosmic text-ink-faint">{C.teacher.role}</p>
            <p className="font-quote italic text-base text-ink-soft">&ldquo;{C.teacher.quote}&rdquo;</p>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-3xl">
          <SectionDivider label="El viaje" className="mb-10" />
          <div className="relative">
            {/* Spine line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-lila-300/18" />
            <div className="space-y-0">
              {C.modules.map((m) => (
                <article key={m.num} className="flex gap-6 pb-8">
                  <div className="relative z-10 flex flex-col items-center gap-1.5 flex-none">
                    <span className="h-10 w-10 rounded-full border border-lila-300/40 bg-cosmos-surface flex items-center justify-center font-display text-sm text-lila-300">
                      {m.num}
                    </span>
                  </div>
                  <div className="flex-1 pt-2 pb-4">
                    <h4 className="mb-1.5 font-display text-lg tracking-wide text-ink">{m.title}</h4>
                    <p className="mb-2 font-body text-sm text-ink-soft leading-relaxed">{m.desc}</p>
                    <span className="font-display text-eyebrow tracking-cosmic text-gold-400">☾ {m.sessions}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Includes */}
      <section className="border-t border-lila-300/18 bg-cosmos-surface px-6 py-16 md:px-12">
        <div className="mx-auto max-w-3xl">
          <SectionDivider label="Qué recibes" className="mb-10" />
          <div className="grid gap-3 sm:grid-cols-2">
            {C.includes.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex-none text-gold-400 text-sm">✦</span>
                <span className="font-body text-sm text-ink-soft">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pact CTA */}
      <section className="relative overflow-hidden border-t border-lila-300/18 px-6 py-24 md:px-12 text-center"
        style={{ background:"radial-gradient(ellipse at 50% 50%, rgba(196,181,253,0.08), transparent 60%), #0a0418" }}>
        <svg className="absolute left-1/2 top-8 h-16 w-16 -translate-x-1/2 fill-none stroke-gold-400/50" viewBox="0 0 80 80" strokeWidth={0.8} aria-hidden>
          <circle cx={40} cy={40} r={35} /><polygon points="40,12 65,55 15,55" />
          <circle cx={40} cy={40} r={8} fill="currentColor" opacity="0.3" />
        </svg>
        <p className="mb-3 mt-10 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— El Umbral —</p>
        <h2 className="mb-3 font-display text-4xl tracking-wide text-ink">
          Próxima cohorte abre con la <em className="font-quote italic text-lila-300">luna nueva</em>
        </h2>
        <p className="mb-8 font-quote italic text-lg text-ink-soft">{C.cohort} · cierra inscripciones al filo del eclipse</p>

        <div className="mx-auto max-w-xs cosmos-card p-6 mb-8 text-left">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-body text-sm text-ink-soft">Ofrenda</span>
            <span className="font-display text-2xl text-gold-400">{C.price}</span>
          </div>
          <div className="flex justify-between items-baseline mb-4 text-ink-faint">
            <span className="font-body text-xs">o tres pagos de</span>
            <span className="font-display text-base text-ink-soft">$ 100</span>
          </div>
          <a href={`/inscribirme/tarot-iniciatico`} className="btn-ritual btn-ritual-primary w-full rounded-pill justify-center">
            Sellar el pacto ↦
          </a>
          <button className="mt-3 w-full font-display text-eyebrow tracking-cosmic text-ink-soft hover:text-lila-300 transition-colors">
            Hablar con una guía antes
          </button>
        </div>
      </section>
    </div>
  );
}

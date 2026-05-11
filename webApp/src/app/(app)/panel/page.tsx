import Nav from "@/components/layout/Nav";
import SideCard from "@/components/molecules/SideCard";
import ProgressRing from "@/components/atoms/ProgressRing";
import Avatar from "@/components/atoms/Avatar";
import SectionDivider from "@/components/atoms/SectionDivider";
import { STUDENT } from "@/lib/mocks/student";

export default function DashboardPage() {
  const S = STUDENT;

  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">

        {/* Welcome header */}
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— El umbral de tu camino —</p>
            <h1 className="font-display text-display-md text-ink">
              Bienvenida de vuelta, <em className="font-quote italic text-lila-300">{S.name}</em>
            </h1>
            <div className="mt-2 flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-soft">
              <span>{S.glyph} {S.sign}</span>
            </div>
          </div>

          {/* Lunar phase widget */}
          <div className="flex items-center gap-4 cosmos-card px-5 py-4">
            <span className="text-4xl text-gold-400">{S.lunarPhase.icon}</span>
            <div>
              <p className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Hoy · {S.lunarPhase.date}</p>
              <p className="font-display text-sm tracking-wide text-ink">{S.lunarPhase.name}</p>
              <p className="font-body text-xs text-ink-soft mt-0.5 max-w-[220px]">{S.lunarPhase.desc}</p>
            </div>
          </div>
        </header>

        {/* Next session strip */}
        <div className="border-b border-lila-300/18 bg-lila-300/[0.04] px-6 py-5 md:px-12 flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Próxima sesión en vivo</p>
            <h3 className="font-display text-lg tracking-wide text-ink">{S.nextSession.course}</h3>
            <p className="font-display text-eyebrow tracking-cosmic text-lila-300">{S.nextSession.module}</p>
          </div>
          <div className="text-center">
            <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{S.nextSession.day}</p>
            <p className="font-display text-2xl text-ink">{S.nextSession.date}</p>
            <p className="font-display text-eyebrow tracking-cosmic text-gold-400">{S.nextSession.time}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <a href="#" className="btn-ritual btn-ritual-primary rounded-pill">Entrar a la sala ↦</a>
            <span className="font-quote italic text-sm text-ink-soft">Faltan <em className="text-lila-300">2 días</em></span>
          </div>
        </div>

        {/* Main grid */}
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-12 grid gap-8 lg:grid-cols-[1fr_320px]">

          <main className="min-w-0 space-y-10">
            {/* Enrolled courses */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg tracking-wide text-ink">Tu camino actual</h2>
                <a href="/cursos" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Ver todos</a>
              </div>
              <div className="space-y-4">
                {S.enrolled.map((c) => (
                  <article key={c.num} className={`cosmos-card flex items-center gap-5 p-5 ${c.progress === 100 ? "opacity-60" : ""}`}>
                    <div className="flex flex-col items-center gap-1 flex-none">
                      <span className="font-display text-lg tracking-wide text-lila-300">{c.num}</span>
                      <span className="text-base">{c.moon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-eyebrow tracking-cosmic text-gold-400 uppercase">{c.tag} · {c.maestra}</p>
                      <h4 className="font-display text-base tracking-wide text-ink mb-0.5">{c.title}</h4>
                      <p className="font-display text-eyebrow tracking-cosmic text-lila-300">{c.module}</p>
                      <div className="mt-1 flex items-center gap-2 font-body text-xs text-ink-faint">
                        <span>{c.sessionsDone}/{c.sessionsTotal} sesiones</span>
                        <span className="text-lila-300/30">·</span>
                        <span>{c.lastSeen}</span>
                      </div>
                    </div>
                    <div className="flex-none flex flex-col items-center gap-2">
                      <ProgressRing value={c.progress} />
                      {c.progress < 100 && (
                        <a href={`/leccion/lesson-current`} className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors whitespace-nowrap">
                          Continuar ↦
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Bitácora */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg tracking-wide text-ink">Tu bitácora</h2>
                <button className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Escribir entrada +</button>
              </div>
              <div className="space-y-3">
                {S.bitacora.map((e) => (
                  <article key={e.date} className="cosmos-card flex items-start gap-4 p-5 cursor-pointer hover:-translate-y-0.5 transition-transform">
                    <div className="flex-none h-10 w-10 rounded-ritual bg-cosmos-surface border border-lila-300/18 flex items-center justify-center text-lg text-lila-300">
                      {e.glyph}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="mb-0.5 font-display text-eyebrow tracking-cosmic text-ink-faint">{e.date}</p>
                      <h4 className="mb-1 font-display text-sm tracking-wide text-ink">{e.title}</h4>
                      <p className="font-body text-xs text-ink-soft leading-relaxed line-clamp-2">{e.preview}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          {/* Sidebar */}
          <aside className="space-y-5">
            <SideCard title="Próximos encuentros" badge="Calendario">
              <div className="space-y-3">
                {S.proximas.map((e) => (
                  <div key={e.title} className="flex items-start gap-3">
                    <div className="flex-none text-center w-9">
                      <div className="font-display text-lg leading-none text-lila-300">{e.day}</div>
                      <div className="font-display text-eyebrow tracking-cosmic text-ink-faint">{e.mes}</div>
                    </div>
                    <div>
                      <p className="font-display text-[11px] tracking-wide text-ink">{e.title}</p>
                      <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{e.course} · {e.tipo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SideCard>

            <SideCard title="El círculo" badge="3 nuevos">
              <div className="space-y-3 mb-4">
                {S.circulo.map((c) => (
                  <div key={c.name} className="flex items-start gap-2.5">
                    <Avatar glyph={c.glyph} size="xs" />
                    <div>
                      <p className="font-display text-[10px] tracking-wide text-ink">{c.name}</p>
                      <p className="font-body text-[11px] text-ink-soft leading-snug">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/circulo" className="btn-ritual btn-ritual-ghost w-full justify-center rounded-pill text-[10px]">
                Entrar al círculo
              </a>
            </SideCard>

            <SideCard>
              <p className="mb-1 font-display text-eyebrow tracking-cosmic text-lila-300">Quizás te llame</p>
              <h3 className="mb-2 font-display text-sm tracking-wide text-ink">Plenilunio en Escorpio</h3>
              <p className="mb-3 font-body text-xs text-ink-soft leading-relaxed">
                Encuentro abierto · 23 de mayo · con Sol Mayor. Para quienes ya cruzaron el primer umbral.
              </p>
              <a href="#" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Inscribirme ↦</a>
            </SideCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

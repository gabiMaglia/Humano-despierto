import Link from "next/link";
import Breadcrumb from "@/components/atoms/Breadcrumb";
import SectionDivider from "@/components/atoms/SectionDivider";
import StatBlock from "@/components/atoms/StatBlock";
import { GUIA_DATA } from "@/lib/mocks/guia";

const ZODIAC = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"] as const;
const ROMAN  = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"] as const;

function BirthChart() {
  const size = 280, cx = 140, cy = 140;
  const r1 = 130, r2 = 110, r3 = 90, r4 = 50;
  const polar = (angle: number, radius: number) => {
    const a = (angle - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius] as const;
  };
  const { planets } = GUIA_DATA.birthChart;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="text-lila-300">
      <defs>
        <radialGradient id="chartGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(245,215,110,0.15)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r1+10} fill="url(#chartGlow)" />
      {[r1, r2, r3].map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
          strokeOpacity={[0.6, 0.4, 0.3][i]} strokeDasharray={i === 2 ? "2 3" : undefined} />
      ))}
      <circle cx={cx} cy={cy} r={r4} fill="none" stroke="currentColor" strokeOpacity={0.4} />
      {Array.from({length:12}).map((_, i) => {
        const [x1,y1] = polar(i*30, r4);
        const [x2,y2] = polar(i*30, r1);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.2} />;
      })}
      {ZODIAC.map((s, i) => {
        const [x,y] = polar(i*30+15, (r1+r2)/2);
        return <text key={s} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#c4b5fd" opacity={0.8}>{s}</text>;
      })}
      {ROMAN.map((n, i) => {
        const [x,y] = polar(i*30+15, (r3+r4)/2);
        return <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={6} fill="#8070a0">{n}</text>;
      })}
      <g opacity={0.4}>
        {([[0,1],[0,3],[2,5],[1,4]] as [number,number][]).map(([a,b], i) => {
          const [x1,y1] = polar(planets[a].angle, planets[a].r);
          const [x2,y2] = polar(planets[b].angle, planets[b].r);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c4b5fd" strokeWidth={0.5} strokeDasharray="1 2" />;
        })}
      </g>
      {planets.map((p) => {
        const [x,y] = polar(p.angle, p.r);
        return (
          <g key={p.sym}>
            <circle cx={x} cy={y} r={10} fill="#1a0e2e" stroke="#f5d76e" strokeWidth={0.8} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#ede4ff">{p.sym}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={3} fill="#f5d76e" />
    </svg>
  );
}

export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  const M = GUIA_DATA;

  return (
    <div className="min-h-screen bg-cosmos-0">
      <Breadcrumb crumbs={[{ label:"Guías", href:"/guias" }, { label:M.name }]} />

      {/* Hero */}
      <header className="px-6 py-16 md:px-12 grid md:grid-cols-[1fr_auto] gap-12 items-start border-b border-lila-300/18">
        <div>
          <p className="mb-4 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Tras el velo —</p>
          <div className="mb-3 text-5xl font-display text-lila-300">{M.glyph}</div>
          <h1 className="mb-2 font-display text-display-md text-ink">{M.name}</h1>
          <p className="mb-1 font-display text-eyebrow tracking-[0.2em] text-ink-soft uppercase">{M.role}</p>
          <p className="mb-8 font-display text-eyebrow tracking-cosmic text-ink-faint">✦ {M.location}</p>

          <div className="mb-8 flex flex-wrap gap-6 md:gap-10">
            {[
              { num:M.years, label:"Años"       },
              { num:M.students, label:"Estudiantes"},
              { num:M.coursesCount, label:"Cursos"  },
              { num:M.rating, label:"Valoración" },
            ].map((s) => <StatBlock key={s.label} num={s.num} label={s.label} align="left" />)}
          </div>

          <div className="flex flex-wrap gap-3.5">
            <a href="#cursos" className="btn-ritual btn-ritual-primary rounded-pill">Ver sus cursos ↦</a>
            <a href="#"       className="btn-ritual btn-ritual-ghost rounded-pill">Pedir consulta privada</a>
          </div>
        </div>

        {/* Portrait + Chart */}
        <div className="hidden md:flex flex-col items-center gap-4">
          <div className="relative h-64 w-48 rounded-sm overflow-hidden bg-linear-to-b from-lila-700 to-cosmos-1">
            {["top-3 left-3 border-t border-l","top-3 right-3 border-t border-r","bottom-3 left-3 border-b border-l","bottom-3 right-3 border-b border-r"].map((cls) => (
              <span key={cls} className={`absolute h-5 w-5 ${cls} border-gold-400/60`} />
            ))}
          </div>
          <BirthChart />
          <p className="font-display text-eyebrow tracking-[0.2em] text-ink-faint text-center">
            — CARTA NATAL · {M.birthChart.date} —
          </p>
        </div>
      </header>

      {/* Bio */}
      <section className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <SectionDivider label="Su camino" className="mb-10" />
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-start">
            <div className="space-y-4">
              {M.bio.map((p, i) => (
                <p key={i} className={`font-${i===0?"quote italic text-lg text-ink":"body text-sm text-ink-soft"} leading-relaxed`}>
                  {p}
                </p>
              ))}
            </div>
            <aside className="cosmos-card p-8">
              <span className="block mb-4 text-4xl text-gold-400 font-quote">&ldquo;</span>
              <p className="mb-4 font-quote italic text-xl text-ink leading-relaxed">{M.quote}</p>
              <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">— {M.name}</span>
            </aside>
          </div>
        </div>
      </section>

      {/* Formación */}
      <section className="border-t border-lila-300/18 bg-cosmos-surface px-6 py-16 md:px-12">
        <div className="mx-auto max-w-3xl">
          <SectionDivider label="Formación" className="mb-10" />
          <div className="space-y-4">
            {M.formations.map((f) => (
              <div key={f.year} className="flex items-start gap-5 border-b border-lila-300/10 pb-4">
                <span className="flex-none font-display text-eyebrow tracking-cosmic text-lila-300 w-16">{f.year}</span>
                <span className="flex-1 font-body text-sm text-ink">{f.title}</span>
                <span className="flex-none font-display text-eyebrow tracking-cosmic text-ink-faint">{f.place}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="cursos" className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <SectionDivider label="Sus cursos" className="mb-10" />
          <div className="grid gap-4 sm:grid-cols-2">
            {M.courses.map((c) => (
              <article key={c.num} className="cosmos-card p-5 cursor-pointer hover:-translate-y-0.5 transition-transform">
                <div className="mb-3 flex justify-between items-center">
                  <span className="font-display text-sm tracking-wider text-lila-300">{c.num}</span>
                  <span className="text-gold-400 text-base">{c.moon}</span>
                </div>
                <p className="mb-1 font-display text-eyebrow tracking-[0.15em] text-gold-400">{c.tag}</p>
                <h4 className="mb-2 font-display text-base tracking-wide text-ink">{c.title}</h4>
                <div className="flex items-center justify-between font-display text-eyebrow tracking-cosmic text-ink-faint">
                  <span>{c.students} estudiantes</span>
                  <span className={c.status.includes("curso") || c.status.includes("Próximo") ? "text-lila-300" : "text-ink-faint"}>{c.status}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="border-t border-lila-300/18 bg-cosmos-surface px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <SectionDivider label="Voces de quienes pasaron" className="mb-10" />
          <div className="grid gap-5 md:grid-cols-3">
            {M.testimonios.map((t) => (
              <blockquote key={t.who} className="cosmos-card relative p-7">
                <span className="pointer-events-none absolute left-4 top-1 select-none font-quote text-[64px] leading-none text-lila-300/20">&ldquo;</span>
                <p className="relative z-10 mb-4 font-quote italic text-base leading-relaxed text-ink">{t.text}</p>
                <footer>
                  <strong className="block font-display text-[11px] tracking-[0.15em] text-ink uppercase">{t.who}</strong>
                  <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">{t.course}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-lila-300/18 px-6 py-24 md:px-12 text-center"
        style={{ background:"radial-gradient(ellipse at 50% 50%, rgba(196,181,253,0.08), transparent 60%), #0a0418" }}>
        <p className="mb-3 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Para quienes buscan —</p>
        <h2 className="mb-3 font-display text-4xl tracking-wide text-ink">
          Una <em className="font-quote italic text-lila-300">guía</em> que sostenga el camino
        </h2>
        <p className="mb-8 font-quote italic text-lg text-ink-soft">
          Sol abre dos cohortes al año · próxima en luna nueva del 6 de mayo
        </p>
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <Link href="/cursos/tarot-iniciatico" className="btn-ritual btn-ritual-primary rounded-pill">Tarot iniciático · 6 mayo ↦</Link>
          <a href="#cursos" className="btn-ritual btn-ritual-ghost rounded-pill">Ver todos sus cursos</a>
        </div>
      </section>
    </div>
  );
}

import SideCard from "@/components/molecules/SideCard";
import SectionDivider from "@/components/atoms/SectionDivider";
import Avatar from "@/components/atoms/Avatar";
import { BLOG } from "@/lib/mocks/blog";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-cosmos-0">
      {/* Header */}
      <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-16 md:px-12 text-center">
        <p className="mb-4 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— DIARIO ABIERTO —</p>
        <h1 className="font-display text-display-md text-ink mb-4">
          Anotaciones <em className="font-quote italic text-lila-300">al margen</em>
          <br />del oficio
        </h1>
        <p className="mx-auto max-w-lg font-quote italic text-lg text-ink-soft mb-8 leading-relaxed">
          Lo que las maestras escriben entre clase y clase. Ensayos, cartas a estudiantes, notas de campo después de cada cohorte.
        </p>
        <div className="mx-auto max-w-md flex items-center gap-2.5 rounded-ritual border border-lila-300/20 bg-cosmos-0 px-4 py-3">
          <span className="text-lila-300 text-sm">✦</span>
          <input type="text" placeholder="Buscar entre anotaciones..." className="flex-1 bg-transparent font-body text-sm text-ink placeholder:text-ink-faint outline-none" />
          <kbd className="font-body text-[9px] text-ink-faint border border-lila-300/20 rounded px-1.5 py-0.5">⌘K</kbd>
        </div>
      </header>

      {/* Category pills */}
      <div className="border-b border-lila-300/18 px-6 py-4 md:px-12 flex flex-wrap gap-2">
        {BLOG.cats.map((c) => (
          <a key={c.name} className={`inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 font-display text-eyebrow tracking-cosmic cursor-pointer transition-colors ${c.active ? "bg-lila-300/10 border border-lila-300/40 text-lila-300" : "border border-lila-300/18 text-ink-faint hover:text-ink-soft hover:border-lila-300/30"}`}>
            {c.name}<span className="text-[9px]">{c.n}</span>
          </a>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 grid gap-10 lg:grid-cols-[1fr_320px]">

        {/* Main */}
        <main className="min-w-0">
          {/* Featured */}
          <article className="cosmos-card mb-10 overflow-hidden grid md:grid-cols-[1fr_1.2fr]">
            {/* Art */}
            <div className="relative flex items-center justify-center min-h-[200px] md:min-h-0 bg-linear-to-br from-lila-700 to-cosmos-2">
              <div className="text-[80px] text-gold-400 font-display animate-breathe">{BLOG.featured.glyph}</div>
              <div className="absolute inset-0" style={{ background:"radial-gradient(circle at 50% 50%, rgba(245,215,110,0.15), transparent 60%)" }} />
            </div>
            {/* Body */}
            <div className="p-7">
              <p className="mb-2 font-display text-eyebrow tracking-[0.2em] text-gold-400 uppercase">{BLOG.featured.cat}</p>
              <h2 className="mb-2 font-display text-2xl tracking-wide text-ink leading-snug">{BLOG.featured.title}</h2>
              <p className="mb-2 font-quote italic text-base text-lila-300">{BLOG.featured.sub}</p>
              <p className="mb-5 font-body text-sm text-ink-soft leading-relaxed">{BLOG.featured.excerpt}</p>
              <div className="mb-5 flex flex-wrap items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
                <span>{BLOG.featured.author}</span>
                <span className="text-lila-300/40">·</span>
                <span>{BLOG.featured.date}</span>
                <span className="text-lila-300/40">·</span>
                <span>{BLOG.featured.read}</span>
                <span className="text-gold-400 ml-1">{BLOG.featured.moon}</span>
              </div>
              <a href="#" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">
                Leer la entrada completa ↦
              </a>
            </div>
          </article>

          <SectionDivider label="Últimas anotaciones" className="mb-8" />

          {/* Post list */}
          <div className="space-y-0 divide-y divide-lila-300/18">
            {BLOG.posts.map((p) => (
              <article key={p.num} className="flex items-start gap-4 py-5 group cursor-pointer hover:bg-cosmos-surface/40 px-3 -mx-3 rounded-ritual transition-colors">
                <span className="flex-none font-display text-eyebrow text-lila-300/60 w-5 pt-0.5">{p.num}</span>
                {/* Glyph art */}
                <div className="flex-none h-12 w-12 rounded-ritual bg-cosmos-surface flex flex-col items-center justify-center gap-1 border border-lila-300/18">
                  <span className="text-lila-300 text-base leading-none">{p.glyph}</span>
                  <span className="text-ink-faint text-[10px] leading-none">{p.moon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 font-display text-eyebrow tracking-[0.15em] text-gold-400 uppercase">{p.cat}</p>
                  <h4 className="mb-1 font-display text-base tracking-wide text-ink group-hover:text-lila-300 transition-colors leading-snug">{p.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
                    <span>{p.author}</span>
                    <span className="text-lila-300/40">·</span>
                    <span>{p.date}</span>
                    <span className="text-lila-300/40">·</span>
                    <span>{p.read}</span>
                  </div>
                </div>
                <span className="flex-none text-ink-faint group-hover:text-lila-300 transition-colors font-display text-sm">↦</span>
              </article>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-10 flex items-center justify-between font-display text-eyebrow tracking-cosmic text-ink-faint">
            <a href="#" className="hover:text-lila-300 transition-colors">← Más viejas</a>
            <span className="hidden sm:block">I · II · III · IV · V</span>
            <a href="#" className="hover:text-lila-300 transition-colors">Más recientes →</a>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="space-y-5">
          <SideCard title="Boletín lunar" badge="Mensual">
            <p className="mb-4 font-quote italic text-sm text-ink-soft leading-relaxed">
              Una carta cada luna nueva. Lo que las maestras leen, escriben y observan en el cielo.
            </p>
            <div className="flex gap-2">
              <input type="email" placeholder="tu correo" className="flex-1 rounded-ritual border border-lila-300/20 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink placeholder:text-ink-faint outline-none focus:border-lila-300/50" />
              <button className="rounded-ritual bg-lila-300/20 border border-lila-300/40 px-3 py-2 font-display text-eyebrow tracking-cosmic text-lila-300 hover:bg-lila-300/30 transition-colors">Suscribir</button>
            </div>
          </SideCard>

          <SideCard title="Las plumas" badge="IV Maestras">
            <div className="space-y-3">
              {BLOG.authors.map((a) => (
                <div key={a.name} className="flex items-center gap-3">
                  <Avatar glyph={a.glyph} size="sm" />
                  <div>
                    <p className="font-display text-[11px] tracking-wide text-ink">{a.name}</p>
                    <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{a.posts} entradas</p>
                  </div>
                </div>
              ))}
            </div>
          </SideCard>

          <SideCard>
            <p className="mb-2 font-display text-eyebrow tracking-cosmic text-lila-300">Serie en curso</p>
            <h3 className="mb-2 font-display text-base tracking-wide text-ink">{BLOG.serie.title}</h3>
            <p className="mb-3 font-body text-sm text-ink-soft">{BLOG.serie.sub}</p>
            <div className="mb-4 flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-gold-400">
              <span>{BLOG.serie.glyph}</span>
              <span>{BLOG.serie.count}</span>
            </div>
            <a href="#" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Seguir la serie ↦</a>
          </SideCard>
        </aside>
      </div>
    </div>
  );
}

import SideCard from "@/components/molecules/SideCard";
import Avatar from "@/components/atoms/Avatar";
import StatBlock from "@/components/atoms/StatBlock";
import { COM } from "@/lib/mocks/community";

export default function ComunidadPage() {
  return (
    <div className="min-h-screen bg-cosmos-0">
      {/* Header */}
      <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-14 md:px-12 text-center">
        <p className="mb-4 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— Círculo privado —</p>
        <h1 className="mb-4 font-display text-display-md text-ink">
          Las que ya están <em className="font-quote italic text-lila-300">adentro</em>
        </h1>
        <p className="mx-auto mb-8 max-w-lg font-quote italic text-lg text-ink-soft leading-relaxed">
          Un foro habitado, no una red social. Sin métricas, sin algoritmo. Solo estudiantes, maestras y tiempo lento.
        </p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {COM.stats.map((s) => <StatBlock key={s.label} num={s.n} label={s.label} />)}
        </div>
      </header>

      <div className="mx-auto max-w-7xl grid gap-0 lg:grid-cols-[240px_1fr_280px]">

        {/* Left sidebar — channels */}
        <aside className="hidden lg:block border-r border-lila-300/18 p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Canales</span>
            <span className="text-lila-300 cursor-pointer hover:text-gold-400 transition-colors">+</span>
          </div>
          <nav className="space-y-0.5 mb-8">
            {COM.channels.map((c) => (
              <a key={c.name} className={`flex items-center gap-2.5 rounded-ritual px-3 py-2.5 cursor-pointer transition-colors ${c.active ? "bg-lila-300/10 border border-lila-300/20" : "hover:bg-cosmos-surface"}`}>
                <span className={`text-base ${c.active ? "text-gold-400" : "text-lila-300/70"}`}>{c.glyph}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-display text-[11px] tracking-wide truncate ${c.active ? "text-ink" : "text-ink-soft"}`}>{c.name}</p>
                  <p className="font-body text-[10px] text-ink-faint truncate">{c.sub}</p>
                </div>
                <span className="font-display text-eyebrow text-ink-faint flex-none">{c.n.split(" ")[0]}</span>
              </a>
            ))}
          </nav>

          {/* Código del círculo */}
          <div>
            <p className="mb-3 font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Código del círculo</p>
            <ul className="space-y-2">
              {COM.pact.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-none font-display text-eyebrow text-lila-300 w-4">{["I","II","III","IV"][i]}</span>
                  <span className="font-body text-[11px] text-ink-faint leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main — feed */}
        <main className="min-w-0 border-r border-lila-300/18">
          {/* Feed header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-lila-300/18 p-5">
            <div>
              <h2 className="font-display text-lg tracking-wide text-ink">Plaza mayor</h2>
              <p className="font-body text-xs text-ink-faint">Lo que se está conversando ahora mismo</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-3 font-display text-eyebrow tracking-cosmic">
                {["Recientes","Sin responder","Mías"].map((t, i) => (
                  <span key={t} className={`cursor-pointer transition-colors ${i === 0 ? "text-lila-300 border-b border-lila-300" : "text-ink-faint hover:text-ink-soft"}`}>{t}</span>
                ))}
              </div>
              <button className="rounded-ritual border border-lila-300/30 bg-lila-300/10 px-3 py-1.5 font-display text-eyebrow tracking-cosmic text-lila-300 hover:bg-lila-300/20 transition-colors">
                ✦ Abrir hilo
              </button>
            </div>
          </div>

          {/* Compose */}
          <div className="flex items-center gap-3 border-b border-lila-300/18 px-5 py-3">
            <Avatar glyph="☽" size="sm" />
            <input type="text" placeholder="Compartí una pregunta, una observación, una carta que salió..."
              className="flex-1 bg-transparent font-body text-sm text-ink placeholder:text-ink-faint outline-none" />
            <div className="flex gap-3 text-ink-faint text-sm">
              <span className="cursor-pointer hover:text-lila-300 transition-colors">◐</span>
              <span className="cursor-pointer hover:text-lila-300 transition-colors">"</span>
              <span className="cursor-pointer hover:text-gold-400 transition-colors">✦</span>
            </div>
          </div>

          {/* Threads */}
          <div className="divide-y divide-lila-300/18">
            {COM.threads.map((t) => (
              <article key={t.title} className={`p-5 cursor-pointer hover:bg-cosmos-surface/40 transition-colors ${t.pin ? "bg-lila-300/[0.03]" : ""}`}>
                {t.pin && (
                  <span className="mb-2 inline-block font-display text-eyebrow tracking-cosmic text-gold-400">★ HILO ANCLADO</span>
                )}
                <div className="mb-2 flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
                  <span className="text-gold-400 font-medium">{t.cat}</span>
                  <span className="text-lila-300/30">·</span>
                  <span>{t.time}</span>
                  <span className="ml-1 text-base">{t.moon}</span>
                </div>
                <h3 className="mb-1.5 font-display text-base tracking-wide text-ink hover:text-lila-300 transition-colors">{t.title}</h3>
                <p className="mb-4 font-body text-sm text-ink-soft leading-relaxed line-clamp-2">{t.excerpt}</p>
                <footer className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar glyph={t.author[0]} size="xs" />
                    <div>
                      <span className="block font-display text-[10px] tracking-wide text-ink">{t.author}</span>
                      <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">{t.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-display text-eyebrow tracking-cosmic text-ink-faint">
                    <span>↩ {t.replies} respuestas</span>
                    <span className="text-lila-300/30">·</span>
                    <span className="hover:text-lila-300 transition-colors cursor-pointer">♡</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>

          <div className="flex items-center gap-4 p-5 border-t border-lila-300/18">
            <div className="h-px flex-1 bg-lila-300/18" />
            <a href="#" className="font-display text-eyebrow tracking-cosmic text-ink-faint hover:text-lila-300 transition-colors">Cargar hilos más antiguos ↓</a>
            <div className="h-px flex-1 bg-lila-300/18" />
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block p-5 space-y-5">
          <SideCard title="Encuentros" badge="Próximos">
            <div className="space-y-3 mb-4">
              {COM.events.map((e) => (
                <div key={e.title} className={`flex gap-3 items-start rounded-ritual p-2.5 ${e.active ? "bg-gold-400/10 border border-gold-400/20" : ""}`}>
                  <div className={`flex-none text-center ${e.active ? "text-gold-400" : "text-lila-300"}`}>
                    <div className="font-display text-xl leading-none">{e.day}</div>
                    <div className="font-display text-eyebrow tracking-cosmic">{e.month}</div>
                  </div>
                  <div>
                    <p className={`font-display text-[11px] tracking-wide ${e.active ? "text-gold-400" : "text-ink"}`}>{e.title}</p>
                    <p className="font-body text-[10px] text-ink-faint">{e.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="#" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Calendario completo ↦</a>
          </SideCard>

          <SideCard title="En el círculo ahora" badge="IV activas">
            <div className="space-y-3">
              {COM.members.map((m) => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <Avatar glyph={m.glyph} size="sm" online={m.online} />
                  <div>
                    <p className="font-display text-[10px] tracking-wide text-ink">{m.name}</p>
                    <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </SideCard>

          <SideCard>
            <p className="mb-2 font-display text-eyebrow tracking-cosmic text-lila-300">Ritual semanal</p>
            <h3 className="mb-2 font-display text-sm tracking-wide text-ink">Círculo de luna llena</h3>
            <p className="mb-3 font-body text-xs text-ink-soft leading-relaxed">Todos los plenilunios. Encendemos vela, leemos, escuchamos. Sin grabación.</p>
            <div className="mb-3 flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-gold-400">
              <span>☾</span><span>Próximo: XII de mayo · 21:00</span>
            </div>
            <a href="#" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Anotarme ↦</a>
          </SideCard>
        </aside>
      </div>
    </div>
  );
}

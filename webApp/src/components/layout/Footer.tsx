const COLS = [
  { title: "Estudiar", links: ["Cursos", "Cohortes", "Guías", "Calendario"] },
  { title: "Templo",   links: ["Círculo", "Biblioteca", "Becas"]            },
  { title: "Hablar",   links: ["Contacto","Newsletter","Instagram","Substack"]  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-lila-300/18 bg-cosmos-0 px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">

        {/* Brand */}
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none stroke-lila-300 fill-none" strokeWidth={1} aria-hidden>
              <circle cx={12} cy={12} r={10} />
              <path d="M12 2 L12 22 M2 12 L22 12" />
              <circle cx={12} cy={12} r={3} fill="currentColor" className="text-lila-300" />
            </svg>
            <span className="font-display text-[13px] tracking-[0.22em] text-ink uppercase">
              Humano{" "}
              <span className="font-quote italic text-lila-300 normal-case tracking-normal">Despierto</span>
            </span>
          </div>
          <p className="font-quote italic text-sm text-ink-faint leading-relaxed max-w-[280px]">
            Una escuela para oficios sutiles. Formación profesional con linaje y rigor, en español, para todo el continente.
          </p>
        </div>

        {/* Link cols */}
        {COLS.map(({ title, links }) => (
          <div key={title}>
            <h4 className="mb-4 font-display text-eyebrow tracking-[0.18em] text-ink uppercase">{title}</h4>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l}>
                  <a href="#" className="font-body text-sm text-ink-soft transition-colors hover:text-lila-300">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-lila-300/18 pt-6 md:col-span-4">
          <span className="font-display text-[9px] tracking-[0.2em] text-ink-faint uppercase">
            ✦ MMXXVI · Humano Despierto
          </span>
          <span className="font-display text-[9px] tracking-[0.2em] text-ink-faint uppercase">
            Términos · Privacidad · Manifiesto
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-lila-300/20 bg-cosmos-0/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10 py-3.5">

        {/* Brand */}
        <a href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none stroke-lila-300 fill-none" strokeWidth={1} aria-hidden>
            <circle cx={12} cy={12} r={10} />
            <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M19 5 L5 19" />
            <circle cx={12} cy={12} r={3} fill="currentColor" className="text-lila-300" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[13px] tracking-[0.22em] text-ink uppercase">
              Humano{" "}
              <span className="font-quote italic text-lila-300 normal-case tracking-normal">Despierto</span>
            </span>
            <span className="font-body text-[7px] tracking-[0.2em] text-ink-faint uppercase mt-0.5">
              Escuela holística
            </span>
          </div>
        </a>

        {/* Links */}
        <div className="hidden items-center gap-6 lg:flex">
          {[
            { label: "Cursos",   href: "/cursos"   },
            { label: "Maestras", href: "/maestras" },
            { label: "Diario",   href: "/diario",   hidden: "xl" },
            { label: "Círculo",  href: "/circulo",  hidden: "xl" },
          ].map(({ label, href, hidden }) => (
            <a
              key={label}
              href={href}
              className={`font-display text-eyebrow tracking-cosmic text-ink-soft transition-colors hover:text-ink${hidden ? " hidden xl:block" : ""}`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2.5">
          <button className="hidden font-display text-eyebrow tracking-cosmic text-ink-soft transition-colors hover:text-lila-300 md:block">
            Entrar
          </button>
          <a href="/cursos" className="btn-ritual btn-ritual-ghost hidden rounded-pill md:inline-flex">
            Inscribirme
          </a>
        </div>
      </div>
    </nav>
  );
}

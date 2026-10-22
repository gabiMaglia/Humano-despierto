import Link from "next/link";

// C-02 · Solo destinos que existen. Antes eran diez etiquetas con ancla vacia — la navegacion
// entera del pie era decorativa. "Biblioteca", "Becas", "Contacto", "Newsletter", "Instagram" y
// "Substack" no tienen ruta ni cuenta detras: vuelven cuando exista el destino. Un link ausente
// es honesto; uno que no lleva a ningun lado le enseña a la usuaria que la interfaz miente.
const COLS = [
  {
    title: "Estudiar",
    links: [
      { label: "Cursos", href: "/cursos" },
      { label: "Guías", href: "/guias" },
      { label: "Diario", href: "/diario" },
    ],
  },
  {
    title: "Templo",
    links: [{ label: "Círculo", href: "/circulo" }],
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-linea bg-fondo px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl grid gap-10 md:grid-cols-[2fr_1fr_1fr]">

        {/* Brand */}
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none stroke-musgo fill-none" strokeWidth={1} aria-hidden>
              <circle cx={12} cy={12} r={10} />
              <path d="M12 2 L12 22 M2 12 L22 12" />
              <circle cx={12} cy={12} r={3} fill="currentColor" className="text-miel-800" />
            </svg>
            <span className="font-display text-[13px] tracking-[0.22em] text-tinta uppercase">
              Humano{" "}
              <span className="font-quote italic text-miel-800 normal-case tracking-normal">Despierto</span>
            </span>
          </div>
          <p className="font-quote italic text-sm text-suave leading-relaxed max-w-[280px]">
            Una escuela para oficios sutiles. Formación profesional con linaje y rigor, en español, para todo el continente.
          </p>
        </div>

        {/* Link cols */}
        {COLS.map(({ title, links }) => (
          <div key={title}>
            <h4 className="mb-4 font-display text-eyebrow tracking-[0.18em] text-tinta uppercase">{title}</h4>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="font-body text-sm text-suave transition-colors hover:text-miel-800"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-linea pt-6 md:col-span-4">
          <span className="font-display text-[9px] tracking-[0.2em] text-suave uppercase">
            ✦ MMXXVI · Humano Despierto
          </span>
          <span className="font-display text-[9px] tracking-[0.2em] text-suave uppercase">
            Términos · Privacidad · Manifiesto
          </span>
        </div>
      </div>
    </footer>
  );
}

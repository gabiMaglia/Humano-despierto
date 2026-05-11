export default function ClosingCTA() {
  return (
    <section
      className="relative overflow-hidden border-t border-lila-300/18 px-6 py-32 text-center"
      style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(196,181,253,0.1), transparent 60%), #0a0418" }}
    >
      {/* Triangle glyph */}
      <svg
        className="absolute left-1/2 top-8 h-14 w-14 -translate-x-1/2 fill-none stroke-gold-400 opacity-60"
        viewBox="0 0 60 60" strokeWidth={0.8} aria-hidden
      >
        <polygon points="30,5 55,52 5,52" />
        <polygon points="30,55 55,8 5,8" />
        <circle cx={30} cy={30} r={8} />
      </svg>

      <h2 className="mt-10 mb-5 font-display text-5xl leading-[1.1] tracking-wide text-ink lg:text-6xl">
        El umbral está{" "}
        <em className="font-quote italic text-lila-300">abierto</em>
      </h2>

      <p className="mx-auto mb-9 max-w-[540px] font-quote italic text-xl leading-relaxed text-ink-soft">
        Próxima cohorte abre con la luna nueva del 6 de mayo.
        Inscripciones cierran al filo del eclipse.
      </p>

      <div className="flex flex-col justify-center gap-3.5 sm:flex-row">
        <a href="/cursos" className="btn-ritual btn-ritual-primary rounded-pill">
          Comenzar el viaje ↦
        </a>
        <a href="/circulo" className="btn-ritual btn-ritual-ghost rounded-pill">
          Hablar con una guía
        </a>
      </div>
    </section>
  );
}

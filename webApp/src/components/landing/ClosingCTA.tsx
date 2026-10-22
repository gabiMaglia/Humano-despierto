import Link from "next/link";

export default function ClosingCTA() {
  return (
    <section
      className="relative overflow-hidden border-t border-linea px-6 py-24 text-center md:px-12 bg-salvia-100"
    >
      {/* Triangle glyph */}
      <svg
        className="absolute left-1/2 top-8 h-14 w-14 -translate-x-1/2 fill-none stroke-miel opacity-60"
        viewBox="0 0 60 60" strokeWidth={0.8} aria-hidden
      >
        <polygon points="30,5 55,52 5,52" />
        <polygon points="30,55 55,8 5,8" />
        <circle cx={30} cy={30} r={8} />
      </svg>

      <h2 className="mt-10 mb-5 font-display text-5xl leading-[1.1] tracking-wide text-tinta lg:text-6xl">
        El umbral está{" "}
        <em className="font-quote italic text-miel-800">abierto</em>
      </h2>

      <p className="mx-auto mb-9 max-w-[540px] font-quote italic text-xl leading-relaxed text-suave">
        Todos los recorridos están abiertos. Empezás cuando quieras.
        Inscripciones cierran al filo del eclipse.
      </p>

      <div className="flex flex-col justify-center gap-3.5 sm:flex-row">
        <Link href="/cursos" className="btn btn-primary">
          Comenzar el viaje
        </Link>
        <Link href="/circulo" className="btn btn-outline">
          Hablar con una guía
        </Link>
      </div>
    </section>
  );
}

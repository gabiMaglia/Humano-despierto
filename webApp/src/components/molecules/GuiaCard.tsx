import Link from "next/link";
import Monogram from "@/components/atoms/Monogram";
import type { PublicTeacherCard } from "@/lib/server/guias";

export default function GuiaCard({
  slug, fullName, headline, location, coursesCount, yearsPractice, discipline, quote,
}: PublicTeacherCard) {
  return (
    <Link href={`/guias/${slug}`} className="group block">
      <article className="tarjeta overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-pointer">

        {/* Sin avatar firmado en PublicTeacherCard (D-62): iniciales, nunca un retrato de stock. */}
        <div className="relative h-52">
          <Monogram name={fullName} className="h-full w-full" />
          <span className="absolute bottom-3 right-3 rounded-pill bg-papel px-3 py-1 text-xs font-semibold text-bosque">
            {coursesCount} {coursesCount === 1 ? "curso" : "cursos"}
          </span>
        </div>

        {/* Body */}
        <div className="p-5">
          {headline && (
            <p className="mb-0.5 font-display text-eyebrow tracking-[0.2em] text-miel-800 uppercase">{headline}</p>
          )}
          <h3 className="mb-0.5 font-display text-xl tracking-wide text-tinta group-hover:text-bosque transition-colors">{fullName}</h3>
          {location && (
            <p className="mb-4 font-display text-eyebrow tracking-wide text-suave">{location}</p>
          )}

          {(yearsPractice != null || discipline) && (
            <div className="mb-4 flex gap-4 border-b border-linea pb-4">
              {yearsPractice != null && (
                <div className="flex-1">
                  <p className="font-display text-[9px] tracking-[0.15em] text-suave uppercase mb-0.5">Años</p>
                  <p className="font-display text-eyebrow tracking-wide text-bosque">{String(yearsPractice)}</p>
                </div>
              )}
              {discipline && (
                <div className="flex-1">
                  <p className="font-display text-[9px] tracking-[0.15em] text-suave uppercase mb-0.5">Disciplina</p>
                  <p className="font-display text-eyebrow tracking-wide text-bosque">{discipline}</p>
                </div>
              )}
            </div>
          )}

          {/* Quote */}
          {quote && (
            <p className="font-quote italic text-sm text-suave leading-relaxed line-clamp-2">
              &ldquo;{quote}&rdquo;
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

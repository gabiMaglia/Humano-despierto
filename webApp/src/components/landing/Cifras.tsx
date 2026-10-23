import Reveal from "@/components/layout/Reveal";
import CifraRotativa from "./CifraRotativa";
import { LANDING } from "@/content/landing";
import { joinSpanish, type DisciplineCount, type HeroStat } from "@/lib/landing";

/** Cifra B4 con datos reales: cuántos cursos y de qué oficios, y la fila de conteos de la base. */
export default function Cifras({ stats, disciplines }: { stats: HeroStat[]; disciplines: DisciplineCount[] }) {
  const cursos = stats.find((s) => /^Cursos?$/.test(s.label));
  if (!cursos) return null;
  const oficios = disciplines.map((d) => d.label.toLocaleLowerCase("es"));
  return (
    <section aria-labelledby="cifras-titulo" className="py-[90px] md:py-[120px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 id="cifras-titulo" className="sr-only">La escuela hoy</h2>
        <Reveal>
          <p className="max-w-[18ch] text-[clamp(30px,4.5vw,56px)] font-semibold leading-[1.15] tracking-[-0.02em] text-bosque">
            {cursos.num} {cursos.label.toLocaleLowerCase("es")} {LANDING.cifra.verbo}{" "}
            {oficios.length > 0 && (
              <>
                <span className="sr-only">{joinSpanish(oficios)}.</span>
                <CifraRotativa words={oficios.map((o) => `${o}.`)} />
              </>
            )}
          </p>
        </Reveal>
        <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-linea pt-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse">
              <dt className="text-sm text-suave">{s.label}</dt>
              <dd className="text-3xl font-semibold text-bosque">{s.num}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-[48ch] text-[15px] text-suave">{LANDING.cifra.nota}</p>
      </div>
    </section>
  );
}

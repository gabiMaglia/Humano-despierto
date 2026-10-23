import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import type { FreeClassClaim } from "@/lib/catalog/free-class";

/** «Empezá por la clase gratuita» (B4). Lo que se afirma depende de `claim`: «cada curso tiene una»
 *  sólo con «todos»; sin el dato, el texto prudente; si ninguno tiene, no se promete clase gratis. */
export default function Empezar({ claim }: { claim: FreeClassClaim }) {
  const e = LANDING.empezar;
  const sinClase = claim === "ninguno";
  const lead = claim === "todos" ? e.lead.todos : sinClase ? e.lead.ninguno : e.lead.prudente;
  const pasos = sinClase ? e.pasosSinClase : e.pasos;
  return (
    <section id="empezar" aria-labelledby="empezar-titulo" className="scroll-mt-20 pb-[100px] md:pb-[120px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal className="relative grid items-center gap-10 overflow-hidden rounded-[24px] bg-salvia-100 px-6 py-14 md:px-16 lg:grid-cols-[1.2fr_0.8fr]">
          <LeafIllustration className="absolute -bottom-9 -right-6 opacity-35" />
          <div className="relative">
            <h2 id="empezar-titulo" className="mb-3.5 max-w-[16ch] text-[clamp(30px,3.8vw,46px)]">
              {sinClase ? e.titleSinClase : e.title}
            </h2>
            <p className="max-w-[46ch] text-suave">{lead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/cursos" arrow>
                {e.cta}
              </ButtonLink>
            </div>
          </div>
          <ol className="relative grid gap-3.5">
            {pasos.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[36px_1fr] items-start gap-3.5 text-[15px] leading-normal text-tinta">
                <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-papel font-bold text-bosque">
                  {i + 1}
                </span>
                <span>
                  <b className="block text-bosque">{p.title}</b>
                  {p.detail}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

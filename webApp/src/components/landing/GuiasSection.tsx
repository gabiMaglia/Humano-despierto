import Link from "next/link";
import Monogram from "@/components/atoms/Monogram";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import type { PublicTeacherCard } from "@/lib/server/guias";

export default function GuiasSection({ guias, total }: { guias: PublicTeacherCard[]; total: number }) {
  if (guias.length === 0) return null;
  const g = LANDING.guias;
  return (
    <section id="guias" aria-labelledby="guias-titulo" className="pb-[100px] md:pb-[130px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <h2 id="guias-titulo" className="mb-3 text-[clamp(30px,3.6vw,42px)]">{g.title}</h2>
        </Reveal>
        <Reveal delay={1}>
          <p className="mb-11 max-w-[46ch] text-suave">{g.lead}</p>
        </Reveal>
        <ul className="grid gap-7 md:grid-cols-3">
          {guias.map((guia, i) => (
            <Reveal as="li" key={guia.slug} delay={(i % 3) as 0 | 1 | 2} className="grid grid-cols-[96px_1fr] items-start gap-[18px]">
              {/* Sin avatar firmado en PublicTeacherCard (D-62): iniciales, nunca un retrato de stock. */}
              <Monogram name={guia.fullName} className="h-[120px] w-24 rounded-md" />
              <div className="min-w-0">
                <h3 className="mb-1 text-lg">{guia.fullName}</h3>
                {guia.discipline && <p className="mb-2 text-sm font-semibold text-miel-800">{guia.discipline}</p>}
                {guia.headline && <p className="text-[15px] leading-normal text-suave">{guia.headline}</p>}
                <Link
                  href={`/guias/${guia.slug}`}
                  className="mt-2 inline-block border-b-[1.5px] border-miel-100 py-1 text-sm font-semibold text-miel-800 transition-colors hover:border-miel-800"
                >
                  {g.verPerfil}
                  <span className="sr-only"> de {guia.fullName}</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>
        {total > guias.length && (
          <p className="mt-10">
            <Link href="/guias" className="border-b-[1.5px] border-current font-semibold text-miel-800">
              {g.verTodas}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/atoms/Button";
import Icon from "@/components/atoms/Icon";
import Picker from "@/components/tarot/Picker";
import { CARDS } from "@/lib/tarot/cards";
import type { CardName } from "@/lib/tarot/card-names";
import { MAX_QUESTION, sanitizeQuestion } from "@/lib/tarot/question";
import { spreadBySlug, SPREADS } from "@/lib/tarot/spreads";

type Param = string | string[] | undefined;
type Search = { listo?: Param; q?: Param; inv?: Param; n?: Param };

const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

export function generateStaticParams() {
  return SPREADS.map((s) => ({ tirada: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tirada: string }> }): Promise<Metadata> {
  const { tirada } = await params;
  const spread = spreadBySlug(tirada);
  if (!spread) return { title: "Tirada no encontrada" };
  return { title: `${spread.nombre}: tirada de tarot online`, description: spread.descripcion, alternates: { canonical: `/tarot/${tirada}` } };
}

export default async function TiradaPage({ params, searchParams }: { params: Promise<{ tirada: string }>; searchParams: Promise<Search> }) {
  const { tirada } = await params;
  const spread = spreadBySlug(tirada);
  if (!spread) notFound();
  const sp = await searchParams;
  const question = sanitizeQuestion(first(sp.q));
  const n = Number(first(sp.n));
  const count = spread.cartas.includes(n) ? n : spread.cartas[0]!;
  const reversedEnabled = spread.allowReversed && first(sp.inv) !== "0";
  const names: CardName[] = CARDS.map((c) => ({ indice: c.indice, id: c.id, nombre_es: c.nombre_es }));

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <div className="mx-auto max-w-[1000px] px-6 pt-8">
        <Link href="/tarot" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline"><Icon name="arrow-left" />Todas las tiradas</Link>
      </div>
      <main className="mx-auto max-w-[1000px] px-6 pb-20 pt-6">
        <h1 className="text-display-lg leading-[1.08] tracking-[-0.025em]">{spread.nombre}</h1>
        <p className="mt-3 max-w-[56ch] text-suave">{spread.descripcion}</p>
        {first(sp.listo) === "1" ? (
          <div className="mt-10">
            {question && <p className="mb-6 text-center text-tinta">Tu pregunta: «{question}»</p>}
            <Picker spread={spread} count={count} reversedEnabled={reversedEnabled} question={question} names={names} />
          </div>
        ) : (
          <form method="get" className="mt-10 max-w-[48ch] space-y-6">
            <input type="hidden" name="listo" value="1" />
            <label className="block">
              <span className="text-sm font-semibold text-bosque">Tu pregunta (opcional)</span>
              <input name="q" maxLength={MAX_QUESTION} defaultValue={question ?? ""} placeholder="¿Qué necesito ver hoy?" className="mt-2 w-full rounded-md border border-linea bg-papel px-4 py-3" />
              <span className="mt-1 block text-xs text-suave">Si ya preguntaste esto hoy, dejá reposar la respuesta.</span>
            </label>
            {spread.cartas.length > 1 && (
              <fieldset>
                <legend className="text-sm font-semibold text-bosque">Cantidad de cartas</legend>
                <div className="mt-2 flex gap-4">
                  {spread.cartas.map((c) => (
                    <label key={c} className="flex items-center gap-2"><input type="radio" name="n" value={c} defaultChecked={c === count} />{c} {c === 1 ? "carta" : "cartas"}</label>
                  ))}
                </div>
              </fieldset>
            )}
            {spread.allowReversed && (
              <label className="flex items-center gap-3">
                <input type="checkbox" name="inv" value="1" defaultChecked className="h-5 w-5" />
                <span className="text-sm text-tinta">Leer cartas invertidas</span>
              </label>
            )}
            {spread.allowReversed && <input type="hidden" name="inv" value="0" />}
            <Button type="submit" arrow>Mezclar</Button>
          </form>
        )}
      </main>
    </div>
  );
}

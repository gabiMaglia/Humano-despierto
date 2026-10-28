import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/atoms/Button";
import ReadingView from "@/components/tarot/ReadingView";
import { decodeReading, encodeReading, readingSeed } from "@/lib/tarot/codec";
import { renderReading } from "@/lib/tarot/prose";
import { sanitizeQuestion } from "@/lib/tarot/question";
import { buildReading } from "@/lib/tarot/reading";

export const metadata: Metadata = { title: "Tu lectura de tarot", robots: { index: false, follow: false } };

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

export default async function LecturaPage({ searchParams }: { searchParams: Promise<{ t?: Param; c?: Param; q?: Param }> }) {
  const sp = await searchParams;
  const reading = decodeReading(first(sp.t) ?? "", first(sp.c) ?? "");
  if (!reading) notFound();
  const question = sanitizeQuestion(first(sp.q));
  const facts = buildReading(reading, question);
  const text = renderReading(facts, readingSeed(reading));
  const shareHref = `/tarot/lectura?t=${reading.spread}&c=${encodeReading(reading)}`;

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <p className="text-sm font-semibold text-miel-800">{facts.spread.nombre}</p>
        <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{question ?? "Tu lectura"}</h1>
        <div className="mt-10"><ReadingView facts={facts} text={text} /></div>
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <ButtonLink href={`/tarot/${reading.spread}`} arrow>Tirar de nuevo</ButtonLink>
          <Link href={shareHref} className="text-sm font-semibold text-miel-800 hover:underline" data-testid="compartir">Enlace para compartir (sin tu pregunta)</Link>
        </div>
      </main>
    </div>
  );
}

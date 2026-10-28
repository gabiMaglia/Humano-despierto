import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReadingView from "@/components/tarot/ReadingView";
import { getSavedReading } from "@/lib/server/tarot";
import { readingSeed } from "@/lib/tarot/codec";
import { renderReading } from "@/lib/tarot/prose";
import { buildReading } from "@/lib/tarot/reading";

export const metadata: Metadata = { title: "Tirada guardada", robots: { index: false, follow: false } };

export default async function LecturaGuardadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getSavedReading(id);
  if (!saved) notFound();
  const facts = buildReading(saved.reading, saved.question);
  const text = renderReading(facts, readingSeed(saved.reading));
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <p className="text-sm font-semibold text-miel-800">{facts.spread.nombre} · {new Date(saved.createdAt).toLocaleDateString("es-AR")}</p>
        <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{saved.question ?? "Tu lectura"}</h1>
        <div className="mt-10"><ReadingView facts={facts} text={text} /></div>
      </main>
    </div>
  );
}

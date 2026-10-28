import SpreadLayout from "@/components/tarot/SpreadLayout";
import TarotCard from "@/components/tarot/TarotCard";
import EthicsNote from "@/components/tarot/EthicsNote";
import type { ReadingFacts } from "@/lib/tarot/reading";
import type { ReadingText } from "@/lib/tarot/prose";
import { positionsFor } from "@/lib/tarot/spreads";

export default function ReadingView({ facts, text }: { facts: ReadingFacts; text: ReadingText }) {
  const positions = positionsFor(facts.spread, facts.placed.length);
  return (
    <div className="space-y-12">
      <SpreadLayout positions={positions} render={(_p, i) => <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size={facts.placed.length > 3 ? "sm" : "md"} priority={i === 0} />} />
      <section className="mx-auto max-w-[68ch] space-y-5 text-lg leading-relaxed text-tinta">
        <p>{text.apertura}</p>
        {text.panorama && <p className="text-suave">{text.panorama}</p>}
      </section>
      <section className="mx-auto max-w-[68ch] space-y-8">
        {text.posiciones.map((p, i) => (
          <article key={p.titulo} className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size="sm" />
            <div>
              <h2 className="text-xl font-bold text-bosque">{p.titulo}</h2>
              <p className="mt-2 text-tinta">{p.texto}</p>
            </div>
          </article>
        ))}
      </section>
      {text.hilo && (
        <section className="mx-auto max-w-[68ch]">
          <h2 className="text-xl font-bold text-bosque">El hilo entre las cartas</h2>
          <p className="mt-2 text-tinta">{text.hilo}</p>
        </section>
      )}
      <section className="mx-auto max-w-[68ch] rounded-lg bg-papel p-6 shadow-card">
        <h2 className="text-xl font-bold text-bosque">Síntesis</h2>
        <p className="mt-2 text-tinta">{text.sintesis}</p>
        <p className="mt-4 font-semibold text-miel-800">{text.consejo}</p>
      </section>
      <div className="mx-auto max-w-[68ch]"><EthicsNote /></div>
    </div>
  );
}

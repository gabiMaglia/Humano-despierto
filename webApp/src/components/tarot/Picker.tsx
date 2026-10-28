"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardBack from "@/components/tarot/CardBack";
import TarotCard from "@/components/tarot/TarotCard";
import SpreadLayout from "@/components/tarot/SpreadLayout";
import { cardByIndex } from "@/lib/tarot/cards";
import { encodeReading, type DrawnCard } from "@/lib/tarot/codec";
import { cryptoRng, drawReversed, shuffleDeck } from "@/lib/tarot/draw";
import { positionsFor, type Spread } from "@/lib/tarot/spreads";
import { cn } from "@/lib/utils/cn";

export default function Picker({ spread, count, reversedEnabled, question }: { spread: Spread; count: number; reversedEnabled: boolean; question: string | null }) {
  const router = useRouter();
  const positions = positionsFor(spread, count);
  // Se mezcla una vez por montaje: el abanico es la misma permutación mientras la persona elige.
  const deck = useMemo(() => shuffleDeck(cryptoRng()), []);
  const [chosen, setChosen] = useState<{ slot: number; card: DrawnCard }[]>([]);
  const taken = new Set(chosen.map((c) => c.slot));
  const current = positions[chosen.length];

  function pick(slot: number) {
    if (!current || taken.has(slot)) return;
    const card: DrawnCard = { indice: deck[slot]!, reversed: drawReversed(cryptoRng(), reversedEnabled && spread.allowReversed) };
    const next = [...chosen, { slot, card }];
    setChosen(next);
    if (next.length === positions.length) {
      const params = new URLSearchParams({ t: spread.slug, c: encodeReading({ spread: spread.slug, cards: next.map((n) => n.card) }) });
      if (question) params.set("q", question);
      router.push(`/tarot/lectura?${params}`);
    }
  }

  return (
    <div className="space-y-10">
      <p aria-live="polite" className="text-center text-lg font-semibold text-bosque">
        {current ? `Elegí la carta para: ${current.nombre}` : "Leyendo…"}
      </p>
      <SpreadLayout positions={positions} render={(p, i) => {
        const c = chosen[i];
        return c ? <TarotCard card={cardByIndex(c.card.indice)!} reversed={c.card.reversed} size="sm" /> : <div className="aspect-[1/1.7] w-16 rounded-md border border-dashed border-salvia" aria-label={`${p.nombre}, vacía`} />;
      }} />
      <ul className="flex flex-wrap justify-center gap-1" aria-label="Mazo mezclado, boca abajo">
        {deck.map((_, slot) => (
          <li key={slot}>
            <button type="button" onClick={() => pick(slot)} disabled={taken.has(slot) || !current} aria-label={`Carta ${slot + 1} del mazo`} className={cn("h-20 w-12 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-miel disabled:opacity-30", taken.has(slot) && "invisible")}>
              <CardBack />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

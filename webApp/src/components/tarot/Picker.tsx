"use client";

import { useEffect, useRef, useState } from "react";
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
  const [deck] = useState(() => shuffleDeck(cryptoRng()));
  const deckRef = useRef<HTMLUListElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const [chosen, setChosen] = useState<{ slot: number; card: DrawnCard }[]>([]);
  const taken = new Set(chosen.map((c) => c.slot));
  const current = positions[chosen.length];

  useEffect(() => {
    if (chosen.length === 0) return;
    if (chosen.length >= positions.length) {
      liveRef.current?.focus();
      return;
    }
    const used = new Set(chosen.map((c) => c.slot));
    const next = Array.from(deckRef.current?.querySelectorAll<HTMLButtonElement>("button[data-slot]") ?? []).find((b) => !used.has(Number(b.dataset.slot)));
    next?.focus();
  }, [chosen, positions.length]);

  const last = chosen[chosen.length - 1];
  const lastCard = last ? cardByIndex(last.card.indice) : undefined;
  const placed = last && lastCard ? `Carta ${chosen.length}: ${lastCard.nombre_es}${last.card.reversed ? " al revés" : ""}, para ${positions[chosen.length - 1]!.nombre}. ` : "";

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
      <p ref={liveRef} tabIndex={-1} aria-live="polite" className="text-center text-lg font-semibold text-bosque outline-none">
        {placed}{current ? `Elegí la carta para: ${current.nombre}` : "Leyendo…"}
      </p>
      <SpreadLayout positions={positions} render={(p, i) => {
        const c = chosen[i];
        return c ? <TarotCard card={cardByIndex(c.card.indice)!} reversed={c.card.reversed} size="sm" /> : <div role="img" className="aspect-[1/1.7] w-16 rounded-md border border-dashed border-salvia" aria-label={`${p.nombre}, vacía`} />;
      }} />
      <ul ref={deckRef} className="flex flex-wrap justify-center gap-1" aria-label="Mazo mezclado, boca abajo">
        {deck.map((_, slot) => (
          <li key={slot}>
            <button type="button" data-slot={slot} onClick={() => pick(slot)} disabled={taken.has(slot) || !current} aria-label={`Carta ${slot + 1} del mazo`} className={cn("h-20 w-12 transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-miel disabled:opacity-30", taken.has(slot) && "invisible")}>
              <CardBack />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Image from "next/image";
import type { Card } from "@/lib/tarot/cards";
import { cn } from "@/lib/utils/cn";

const SIZES = { sm: "w-16", md: "w-28", lg: "w-44" } as const;

export function cardImageSrc(slug: string): string {
  return `/tarot/rws/${slug}.webp`;
}

export default function TarotCard({ card, reversed = false, size = "md", priority = false, className }: { card: Card; reversed?: boolean; size?: keyof typeof SIZES; priority?: boolean; className?: string }) {
  return (
    <figure className={cn("shrink-0", SIZES[size], className)}>
      <div className={cn("relative aspect-[1/1.7] overflow-hidden rounded-md bg-salvia-100 shadow-card", reversed && "rotate-180")}>
        <Image src={cardImageSrc(card.id)} alt={`${card.nombre_es}${reversed ? ", invertida" : ""}`} fill sizes="(max-width: 640px) 30vw, 180px" priority={priority} className="object-cover" />
      </div>
      <figcaption className="mt-2 text-center text-xs font-semibold text-suave">
        {card.nombre_es}
        {reversed && <span className="block font-normal">invertida</span>}
      </figcaption>
    </figure>
  );
}

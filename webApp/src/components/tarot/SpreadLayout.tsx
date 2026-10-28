import type { ReactNode } from "react";
import type { Position } from "@/lib/tarot/spreads";
import { cn } from "@/lib/utils/cn";

/** Grilla CSS a partir de x/y de cada posición. Dos posiciones en la misma celda (cruz celta 1 y 2) se superponen y la rotada va encima. */
export default function SpreadLayout({ positions, render }: { positions: Position[]; render: (p: Position, i: number) => ReactNode }) {
  const cols = Math.max(...positions.map((p) => p.x)) + 1;
  const rows = Math.max(...positions.map((p) => p.y)) + 1;
  return (
    <div className="mx-auto grid w-fit gap-4" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {positions.map((p, i) => (
        <div key={p.n} className={cn("relative grid place-items-center", p.rotada && "z-10")} style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}>
          <div className={p.rotada ? "rotate-90 scale-75" : undefined}>{render(p, i)}</div>
        </div>
      ))}
    </div>
  );
}

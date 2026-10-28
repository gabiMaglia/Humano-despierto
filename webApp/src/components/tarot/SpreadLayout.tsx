import type { ReactNode } from "react";
import type { Position } from "@/lib/tarot/spreads";

/** Grilla CSS a partir de x/y de cada posición. Dos posiciones en la misma celda (cruz celta 1 y 2) se apilan. */
export default function SpreadLayout({ positions, render }: { positions: Position[]; render: (p: Position, i: number) => ReactNode }) {
  const cols = Math.max(...positions.map((p) => p.x)) + 1;
  const rows = Math.max(...positions.map((p) => p.y)) + 1;
  return (
    <div className="mx-auto grid w-fit gap-4" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {positions.map((p, i) => (
        <div key={p.n} className={p.rotada ? "rotate-90 scale-90" : undefined} style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}>
          {render(p, i)}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/** La palabra que rota es decoración: la frase completa ya está en `.sr-only` al lado, así que
 *  esto va `aria-hidden` y un lector de pantalla no escucha un texto que cambia solo. */
export default function CifraRotativa({ words }: { words: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % words.length), 2600);
    return () => window.clearInterval(t);
  }, [words.length]);

  return (
    <span aria-hidden="true" className="inline-grid h-[1.15em] overflow-hidden align-bottom text-miel-800">
      {words.map((w, n) => (
        <span
          key={w}
          className={cn(
            "[grid-area:1/1] transition-[transform,opacity] duration-700 ease-brote motion-reduce:transition-none",
            n === i ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
          )}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

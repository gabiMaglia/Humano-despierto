"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { shouldDeferReveal } from "@/lib/ui/reveal";
import { cn } from "@/lib/utils/cn";

interface Props {
  children: ReactNode;
  as?: ElementType;
  /** Escalonado en décimas de segundo (0..3), como `.d1`..`.d3` de la maqueta. */
  delay?: 0 | 1 | 2 | 3;
  className?: string;
}

/** Visible en reposo: el HTML del servidor no esconde nada. Sólo lo que arranca debajo del pliegue
 *  recibe `reveal-pre` al montar y lo pierde al entrar en pantalla. */
export default function Reveal({ children, as: Tag = "div", delay = 0, className }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = el.getBoundingClientRect().top;
    if (!shouldDeferReveal({ top, viewportHeight: window.innerHeight, reducedMotion })) return;

    el.classList.add("reveal-pre");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.remove("reveal-pre");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={cn("reveal", className)} style={delay ? { transitionDelay: `${delay / 10}s` } : undefined}>
      {children}
    </Tag>
  );
}

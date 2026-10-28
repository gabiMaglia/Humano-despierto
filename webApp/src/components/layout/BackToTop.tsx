"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/atoms/Icon";
import { isBackToTopVisible } from "@/lib/ui/header";
import { cn } from "@/lib/utils/cn";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(isBackToTopVisible(window.scrollY));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      // Oculto también para teclado y lector: un botón invisible pero enfocable confunde.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      className={cn(
        "fixed bottom-[22px] right-[22px] z-30 grid h-12 w-12 place-items-center rounded-full bg-papel text-bosque shadow-float transition-opacity duration-500",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icon name="arrow-up" className="h-[18px] w-[18px]" />
    </button>
  );
}

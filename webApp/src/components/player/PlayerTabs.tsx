"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface PlayerTab {
  id: string;
  label: string;
  panel: ReactNode;
}

interface Props {
  tabs: PlayerTab[];
  initialTabId?: string;
  label: string;
}

/**
 * Único `tablist` del player. Agregar una pestaña (p. ej. "Preguntas", T-030) es sumar un
 * elemento a `tabs`: el teclado ← →, los roles y los ids salen de acá, no de cada pestaña.
 * Layout: debajo del video hasta lg, columna lateral desde lg (mismo DOM, sin drawer).
 */
export default function PlayerTabs({ tabs, initialTabId, label }: Props) {
  const [activeId, setActiveId] = useState(initialTabId ?? tabs[0].id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // Patrón ARIA de tablist: el grupo es UNA sola parada de Tab y adentro se navega con flechas.
  function handleKeys(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === active.id);
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    setActiveId(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return (
    <aside className="flex w-full flex-none flex-col border-t border-linea bg-papel lg:sticky lg:top-0 lg:max-h-screen lg:w-[380px] lg:self-start lg:border-l lg:border-t-0">
      <div role="tablist" aria-label={label} onKeyDown={handleKeys} className="flex border-b border-linea px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active.id === t.id}
            aria-controls={active.id === t.id ? `panel-${t.id}` : undefined}
            tabIndex={active.id === t.id ? 0 : -1}
            onClick={() => setActiveId(t.id)}
            className={cn(
              // Subrayado miel-800 (5.3:1 sobre papel): la pestaña activa no se dice sólo con el peso.
              "-mb-px min-h-12 flex-1 border-b-[3px] px-1 text-sm font-semibold transition-colors",
              active.id === t.id ? "border-miel-800 text-bosque" : "border-transparent text-suave hover:text-bosque"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Un solo panel: sólo se renderiza la pestaña activa, así que el id y el
          aria-labelledby siguen a la activa en vez de haber un contenedor por pestaña.
          `relative`: sin él, los `.sr-only` (absolute) de adentro escapan del scroll y estiran la página. */}
      <div
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        tabIndex={0}
        className="relative max-h-[70vh] min-h-0 flex-1 overflow-auto p-5 lg:max-h-none"
      >
        {active.panel}
      </div>
    </aside>
  );
}

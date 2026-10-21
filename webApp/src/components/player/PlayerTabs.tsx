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
 * Layout: debajo del video en móvil, columna lateral desde md (mismo DOM, sin drawer).
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
    <aside className="w-full md:w-72 flex-none border-t md:border-t-0 md:border-l border-lila-300/18 flex flex-col">
      <div role="tablist" aria-label={label} onKeyDown={handleKeys} className="flex border-b border-lila-300/18">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active.id === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active.id === t.id ? 0 : -1}
            onClick={() => setActiveId(t.id)}
            className={cn(
              "flex-1 py-3 font-display text-eyebrow tracking-cosmic transition-colors",
              active.id === t.id ? "text-lila-300 border-b-2 border-lila-300" : "text-ink-faint hover:text-ink-soft"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Un solo panel: sólo se renderiza la pestaña activa, así que el id y el
          aria-labelledby siguen a la activa en vez de haber un contenedor por pestaña. */}
      <div
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        tabIndex={0}
        className="flex-1 overflow-auto p-4 max-h-[60vh] md:max-h-none"
      >
        {active.panel}
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CampusThreadSummary } from "@/lib/server/campus";

// Solo la parte activa depende del pathname — el listado en sí lo trae el layout del server
// (`getCampusSidebar`, RLS-scoped). 'use client' acá es exactamente el resaltado, no el fetch.
export default function CampusSidebar({ threads }: { threads: CampusThreadSummary[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {threads.map((t) => {
        const href = t.slug ? `/circulo/${t.slug}` : "/circulo";
        const isActive = pathname === href;
        return (
          <Link
            key={t.slug ?? "general"}
            href={href}
            className={`flex items-center gap-2.5 rounded-ritual px-3 py-2.5 transition-colors ${
              isActive ? "bg-lila-300/10 border border-lila-300/20" : "hover:bg-cosmos-surface"
            }`}
          >
            <span className={`text-base ${isActive ? "text-gold-400" : "text-lila-300/70"}`}>{t.glyph}</span>
            <div className="min-w-0 flex-1">
              <p className={`font-display text-[11px] tracking-wide truncate ${isActive ? "text-ink" : "text-ink-soft"}`}>
                {t.title}
              </p>
              <p className="font-body text-[10px] text-ink-faint truncate">{t.subtitle}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

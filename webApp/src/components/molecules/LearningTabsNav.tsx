import Link from "next/link";
import type { LearningTab } from "@/lib/learning/tabs";
import { cn } from "@/lib/utils/cn";

const LABELS: { tab: LearningTab; label: string }[] = [
  { tab: "en-curso", label: "En curso" },
  { tab: "completados", label: "Completados" },
  { tab: "guardados", label: "Guardados" },
  { tab: "solicitados", label: "Solicitados" },
];

/** Pestañas enlazables (botón atrás y URL compartible, doctrina T-019): son links, no estado. */
export default function LearningTabsNav({
  current,
  counts,
}: {
  current: LearningTab;
  counts: Record<LearningTab, number>;
}) {
  return (
    <nav aria-label="Mi aprendizaje" className="mb-6 flex flex-wrap gap-2">
      {LABELS.map(({ tab, label }) => {
        const active = current === tab;
        return (
          <Link
            key={tab}
            href={tab === "en-curso" ? "/panel" : `/panel?tab=${tab}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-pill border-[1.5px] px-4 text-sm font-semibold transition-colors",
              active ? "border-bosque bg-bosque text-white" : "border-salvia bg-papel text-bosque hover:bg-salvia-100",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-pill px-2 text-xs tabular-nums",
                active ? "bg-white/15 text-white" : "bg-salvia-100 text-bosque",
              )}
            >
              {counts[tab]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import type { LearningTab } from "@/lib/learning/tabs";

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
    <nav aria-label="Mi aprendizaje" className="mb-6 flex flex-wrap items-center gap-2">
      {LABELS.map(({ tab, label }) => (
        <Link
          key={tab}
          href={tab === "en-curso" ? "/panel" : `/panel?tab=${tab}`}
          aria-current={current === tab ? "page" : undefined}
          className={`rounded-pill border px-3 py-1 font-display text-eyebrow ${
            current === tab
              ? "border-lila-300/60 bg-lila-300/20 text-lila-300"
              : "border-lila-300/20 text-ink-faint hover:text-ink-soft"
          }`}
        >
          {label} <span className="text-ink-faint">{counts[tab]}</span>
        </Link>
      ))}
    </nav>
  );
}

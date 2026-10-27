import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChipTone } from "@/lib/panel/status";

const TONE: Record<ChipTone, string> = {
  ok: "bg-salvia-100 text-bosque border-salvia",
  accent: "bg-miel-100 text-miel-800 border-miel",
  muted: "bg-papel text-suave border-linea",
  error: "bg-papel text-error border-error",
};

// El signo acompaña al texto: el estado no se dice sólo con el color.
function Mark({ tone }: { tone: ChipTone }) {
  const common = { viewBox: "0 0 12 12", className: "h-3.5 w-3.5 flex-none", "aria-hidden": true, focusable: false } as const;
  if (tone === "ok") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.3l2.4 2.4 4.6-5" />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M3 3l6 6M9 3l-6 6" />
      </svg>
    );
  }
  if (tone === "accent") return <svg {...common} fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>;
  return <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="6" cy="6" r="3" /></svg>;
}

export default function StatusChip({ tone, children, className }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      <Mark tone={tone} />
      {children}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  label: string;
  active?: boolean;
  count?: number | string;
  onClick?: () => void;
}

export default function Pill({ label, active, count, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-1.5 font-display text-eyebrow tracking-cosmic transition-colors",
        active
          ? "border-lila-300/60 bg-lila-300/10 text-lila-300"
          : "border-lila-300/20 text-ink-faint hover:border-lila-300/40 hover:text-ink-soft"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn("text-[8px]", active ? "text-lila-400" : "text-ink-faint")}>
          {count}
        </span>
      )}
    </button>
  );
}

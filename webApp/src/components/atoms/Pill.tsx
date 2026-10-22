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
        "inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-1.5 font-display text-eyebrow tracking-wide transition-colors",
        active
          ? "border-linea bg-salvia-100 text-miel-800"
          : "border-linea text-suave hover:border-linea hover:text-suave"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn("text-[8px]", active ? "text-miel-800" : "text-suave")}>
          {count}
        </span>
      )}
    </button>
  );
}

import { cn } from "@/lib/utils/cn";

/** Avance de un curso. El número va siempre escrito al lado: la barra sola no alcanza (ni en
 *  contraste ni para el lector). */
export default function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 flex-1 overflow-hidden rounded-pill bg-linea"
      >
        <div className="h-full rounded-pill bg-miel" style={{ width: `${pct}%` }} />
      </div>
      <span aria-hidden="true" className="w-11 text-right text-sm font-semibold tabular-nums text-bosque">
        {pct}%
      </span>
    </div>
  );
}

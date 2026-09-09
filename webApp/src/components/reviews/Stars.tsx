import { cn } from "@/lib/utils/cn";

/** §4: sin raster ni iconos de librería — `★`/`☆` Unicode. El glifo va `aria-hidden` y el valor
 *  viaja en texto: una fila de estrellas mudas no dice nada en un lector de pantalla (X-01). */
export default function Stars({
  value,
  size = "sm",
  showValue = false,
}: {
  value: number;
  size?: "sm" | "lg";
  showValue?: boolean;
}) {
  const llenas = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("font-display tracking-[0.15em] text-gold-400", size === "lg" ? "text-2xl" : "text-sm")}
      >
        {"★".repeat(llenas)}
        <span className="text-ink-faint">{"☆".repeat(5 - llenas)}</span>
      </span>
      {showValue && (
        <span className={cn("font-display text-gold-400", size === "lg" ? "text-2xl" : "text-sm")}>
          {value.toFixed(1)}
        </span>
      )}
      <span className="sr-only">{value.toFixed(1)} de 5 estrellas</span>
    </span>
  );
}

import { cn } from "@/lib/utils/cn";
import Icon from "@/components/atoms/Icon";

/** Estrellas de línea (`Icon`, ADR-015), decorativas: el valor viaja en texto, porque una fila de
 *  estrellas mudas no dice nada en un lector de pantalla (X-01). */
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
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon
            key={n}
            name="star"
            filled={n <= llenas}
            className={cn(n <= llenas ? "text-miel" : "text-suave", size === "lg" ? "h-6 w-6" : "h-3.5 w-3.5")}
          />
        ))}
      </span>
      {showValue && (
        <span className={cn("font-display text-miel-800", size === "lg" ? "text-2xl" : "text-sm")}>
          {value.toFixed(1)}
        </span>
      )}
      <span className="sr-only">{value.toFixed(1)} de 5 estrellas</span>
    </span>
  );
}

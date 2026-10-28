import { cn } from "@/lib/utils/cn";
import Icon from "@/components/atoms/Icon";

/** R-01 · sin reseñas no hay estrellas ni «0,0»: se dice que el curso es nuevo. El texto visible
 *  sigue el formato de `formatRating` («4,5 · 2 reseñas») y el valor exacto viaja en `.sr-only`. */
export default function Rating({
  average,
  count,
  className,
}: {
  average?: number | null;
  count?: number | null;
  className?: string;
}) {
  if (!count || average == null) {
    return <p className={cn("text-sm text-suave", className)}>Curso nuevo, todavía sin reseñas</p>;
  }
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-bosque", className)}>
      <Icon name="star" className="h-[15px] w-[15px] text-miel" />
      <span className="sr-only">{average.toFixed(1)} de 5 estrellas.</span>
      <b aria-hidden="true" className="font-semibold">{average.toFixed(1).replace(".", ",")}</b>{" "}
      <span className="text-suave">
        · {count} {count === 1 ? "reseña" : "reseñas"}
      </span>
    </p>
  );
}

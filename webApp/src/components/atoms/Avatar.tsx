import { cn } from "@/lib/utils/cn";
import Icon from "@/components/atoms/Icon";
import { initials } from "@/lib/ui/initials";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  xs: "h-5 w-5 text-[8px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-base",
};

interface Props {
  /** Dato de la persona (`profiles.glyph`); si no tiene, iniciales de `name` o una hoja. */
  glyph?: string | null;
  name?: string | null;
  src?: string | null;
  alt?: string;
  size?: Size;
  online?: boolean;
  className?: string;
}

export default function Avatar({ glyph, name, src, alt, size = "md", online, className }: Props) {
  const fallback = initials(name);
  return (
    <div className={cn("relative flex-none", className)}>
      <div
        className={cn(
          SIZES[size],
          "overflow-hidden rounded-full border border-linea bg-salvia-100",
          "flex items-center justify-center"
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada que vence en 1 h; el optimizador de next/image la cachearia mas alla de su vida.
          <img src={src} alt={alt ?? ""} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="font-display font-semibold leading-none text-bosque">
            {glyph || fallback || <Icon name="leaf" className="h-1/2 w-1/2 text-musgo" />}
          </span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-papel bg-exito" />
      )}
    </div>
  );
}

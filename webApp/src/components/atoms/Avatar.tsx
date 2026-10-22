import { cn } from "@/lib/utils/cn";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  xs: "h-5 w-5 text-[8px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-base",
};

interface Props {
  glyph?: string;
  src?: string | null;
  alt?: string;
  size?: Size;
  online?: boolean;
  className?: string;
}

export default function Avatar({ glyph, src, alt, size = "md", online, className }: Props) {
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
          glyph && <span className="font-display text-tinta leading-none">{glyph}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-papel bg-green-400" />
      )}
    </div>
  );
}

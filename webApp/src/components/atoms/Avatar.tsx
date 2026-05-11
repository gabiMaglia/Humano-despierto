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
  size?: Size;
  online?: boolean;
  className?: string;
}

export default function Avatar({ glyph, size = "md", online, className }: Props) {
  return (
    <div className={cn("relative flex-none", className)}>
      <div
        className={cn(
          SIZES[size],
          "rounded-full border border-lila-300/40 bg-linear-to-br from-magenta to-lila-700",
          "flex items-center justify-center"
        )}
      >
        {glyph && (
          <span className="font-display text-ink leading-none">{glyph}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-cosmos-0 bg-green-400" />
      )}
    </div>
  );
}

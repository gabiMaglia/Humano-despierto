import { cn } from "@/lib/utils/cn";

/** Íconos de línea (ADR-015): reemplazan a los glifos Unicode donde eran ícono. Siempre
 *  `aria-hidden`: el significado lo lleva el texto de al lado (visible o `.sr-only`). */
const PATHS = {
  "arrow-right": "M3 8h10M9 4l4 4-4 4",
  "arrow-up": "M8 13V3M3 8l5-5 5 5",
  "arrow-left": "M13 8H3M7 4L3 8l4 4",
  download: "M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10",
  "chevron-down": "M4 6l4 4 4-4",
  check: "M3 8.5l3 3 7-7",
  circle: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z",
  play: "M5.5 3.5v9l7-4.5z",
  menu: "M2 4h12M2 8h12M2 12h12",
  close: "M3.5 3.5l9 9M12.5 3.5l-9 9",
  bookmark: "M4 2.5h8v11l-4-3-4 3z",
  lock: "M4.5 7.5h7v6h-7zM5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2",
  eye: "M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z",
  leaf: "M8 14.5V7M8 9.5C4.5 9.5 3 7.5 3 4c3.5 0 5 2 5 5.5zM8 7c0-3 2-4.5 5-4.5 0 3-2 4.5-5 4.5z",
  star: "M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z",
} as const;

export type IconName = keyof typeof PATHS;

const FILLED: ReadonlySet<IconName> = new Set(["play", "star"]);

export default function Icon({
  name,
  filled,
  className,
}: {
  name: IconName;
  /** Relleno con el color actual (estado «activo»: guardado, votado). */
  filled?: boolean;
  className?: string;
}) {
  const solid = filled ?? FILLED.has(name);
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block h-4 w-4 flex-none", className)}
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={solid ? 1 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

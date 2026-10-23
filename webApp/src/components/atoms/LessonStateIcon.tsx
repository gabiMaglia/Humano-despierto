import { cn } from "@/lib/utils/cn";
import Icon, { type IconName } from "@/components/atoms/Icon";

export type LessonState = "done" | "current" | "pending" | "preview" | "locked";

// Una sola tabla para la ficha (CurriculumAccordion) y el player (CurriculumTab): el mismo estado
// se dibuja igual en los dos lados. Antes eran glifos Unicode repetidos.
const ICON: Record<LessonState, IconName> = {
  done: "check",
  current: "play",
  pending: "circle",
  preview: "eye",
  locked: "lock",
};

const TONE: Record<LessonState, string> = {
  done: "text-exito",
  current: "text-miel-800",
  pending: "text-musgo",
  preview: "text-miel-800",
  locked: "text-suave",
};

/** Decorativo: el estado en texto lo pone quien lo usa (`.sr-only` o `aria-label`). */
export default function LessonStateIcon({ state, className }: { state: LessonState; className?: string }) {
  return <Icon name={ICON[state]} className={cn("h-3.5 w-3.5", TONE[state], className)} />;
}

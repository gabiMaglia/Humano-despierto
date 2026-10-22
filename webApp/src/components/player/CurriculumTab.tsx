import { cn } from "@/lib/utils/cn";
import { formatDurationSeconds } from "@/lib/utils/format";
import type { PlayerLessonState, PlayerModule } from "@/lib/server/lesson-player";

const STATE_ICON: Record<PlayerLessonState, string> = {
  done: "✓",
  current: "▶",
  pending: "○",
  preview: "✦",
  locked: "⌗",
};

const STATE_LABEL: Record<PlayerLessonState, string> = {
  done: "Completada",
  current: "En reproducción",
  pending: "Pendiente",
  preview: "Vista previa",
  locked: "Bloqueada",
};

const STATE_ICON_CLASS: Record<PlayerLessonState, string> = {
  done: "text-miel-800",
  current: "text-miel-800",
  pending: "text-suave",
  preview: "text-miel-800",
  locked: "text-suave",
};

interface Props {
  modules: PlayerModule[];
  /** La lección en reproducción ya llegó al 90 %: cuenta como completada en "n/m". */
  currentCompleted: boolean;
}

export default function CurriculumTab({ modules, currentCompleted }: Props) {
  return (
    <div className="space-y-2">
      {modules.map((m) => {
        const done = m.lessons.filter(
          (l) => l.state === "done" || (l.state === "current" && currentCompleted)
        ).length;
        return (
          <div
            key={m.position}
            className={cn(
              "rounded-md border p-3",
              m.lessons.some((l) => l.state === "current")
                ? "border-linea bg-salvia-100"
                : "border-linea"
            )}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-display text-sm text-bosque w-5">{String(m.position)}</span>
              <span className="flex-1 font-display text-[11px] tracking-wide text-tinta">{m.title}</span>
              <span
                className="font-display text-eyebrow tracking-wide text-suave"
                aria-label={`${done} de ${m.lessons.length} completadas`}
              >
                {done}/{m.lessons.length}
              </span>
            </div>
            {m.lessons.length > 0 && (
              <div className="ml-7 mt-2 space-y-1">
                {m.lessons.map((l) => {
                  const shown: PlayerLessonState = l.state === "current" && currentCompleted ? "done" : l.state;
                  return (
                    <a
                      key={l.id}
                      href={l.state === "locked" ? undefined : `/leccion/${l.id}`}
                      aria-disabled={l.state === "locked"}
                      aria-current={l.state === "current" ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 py-1.5 rounded px-2",
                        l.state === "current" && "bg-miel-100 border border-miel",
                        l.state === "locked" && "pointer-events-none opacity-60"
                      )}
                    >
                      <span
                        role="img"
                        aria-label={STATE_LABEL[shown]}
                        className={cn("font-display text-[9px]", STATE_ICON_CLASS[shown])}
                      >
                        {STATE_ICON[shown]}
                      </span>
                      <span className="font-display text-[9px] text-suave w-4">{l.position}</span>
                      <span
                        className={cn(
                          "flex-1 font-body text-[11px] truncate",
                          l.state === "current" ? "text-miel-800" : "text-suave"
                        )}
                      >
                        {l.title}
                      </span>
                      <span className="font-display text-[9px] text-suave">
                        {formatDurationSeconds(l.durationSeconds)}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { cn } from "@/lib/utils/cn";
import { formatDurationSeconds } from "@/lib/utils/format";
import { toRoman } from "@/lib/utils/roman";
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
  done: "text-lila-300",
  current: "text-gold-400",
  pending: "text-ink-faint",
  preview: "text-gold-400",
  locked: "text-ink-faint",
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
              "rounded-ritual border p-3",
              m.lessons.some((l) => l.state === "current")
                ? "border-lila-300/40 bg-lila-300/[0.05]"
                : "border-lila-300/18"
            )}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-display text-sm text-lila-300 w-5">{toRoman(m.position)}</span>
              <span className="flex-1 font-display text-[11px] tracking-wide text-ink">{m.title}</span>
              <span
                className="font-display text-eyebrow tracking-cosmic text-ink-faint"
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
                        l.state === "current" && "bg-gold-400/10 border border-gold-400/20",
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
                      <span className="font-display text-[9px] text-ink-faint w-4">{l.position}</span>
                      <span
                        className={cn(
                          "flex-1 font-body text-[11px] truncate",
                          l.state === "current" ? "text-gold-400" : "text-ink-soft"
                        )}
                      >
                        {l.title}
                      </span>
                      <span className="font-display text-[9px] text-ink-faint">
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

import { cn } from "@/lib/utils/cn";
import LessonStateIcon from "@/components/atoms/LessonStateIcon";
import { formatDurationSeconds } from "@/lib/utils/format";
import type { PlayerLessonState, PlayerModule } from "@/lib/server/lesson-player";

const STATE_LABEL: Record<PlayerLessonState, string> = {
  done: "Completada",
  current: "En reproducción",
  pending: "Pendiente",
  preview: "Vista previa",
  locked: "Bloqueada",
};

interface Props {
  modules: PlayerModule[];
  /** La lección en reproducción ya llegó al 90 %: cuenta como completada en "n/m". */
  currentCompleted: boolean;
}

export default function CurriculumTab({ modules, currentCompleted }: Props) {
  return (
    <div className="space-y-3">
      {modules.map((m) => {
        const done = m.lessons.filter(
          (l) => l.state === "done" || (l.state === "current" && currentCompleted)
        ).length;
        return (
          <section key={m.position} aria-label={`Módulo ${m.position}: ${m.title}`} className="overflow-hidden rounded-md border border-linea">
            <div className="flex items-start gap-3 bg-fondo px-4 py-3">
              <span className="w-5 flex-none pt-0.5 text-sm font-bold tabular-nums text-bosque">{String(m.position)}</span>
              <span className="flex-1 text-sm font-semibold leading-snug text-bosque">{m.title}</span>
              <span
                className="flex-none text-xs font-semibold tabular-nums text-suave"
                aria-label={`${done} de ${m.lessons.length} completadas`}
              >
                {done}/{m.lessons.length}
              </span>
            </div>
            {m.lessons.length > 0 && (
              <ul className="divide-y divide-linea border-t border-linea">
                {m.lessons.map((l) => {
                  const shown: PlayerLessonState = l.state === "current" && currentCompleted ? "done" : l.state;
                  return (
                    <li key={l.id}>
                      <a
                        href={l.state === "locked" ? undefined : `/leccion/${l.id}`}
                        aria-disabled={l.state === "locked"}
                        aria-current={l.state === "current" ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 px-4 py-2 transition-colors",
                          l.state === "current" ? "bg-miel-100" : "hover:bg-salvia-100",
                          // Inactiva: atenuada a propósito (WCAG 1.4.3 exime los controles inactivos).
                          l.state === "locked" && "pointer-events-none opacity-60"
                        )}
                      >
                        <span role="img" aria-label={STATE_LABEL[shown]} className="inline-flex">
                          <LessonStateIcon state={shown} />
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-sm leading-snug",
                            l.state === "current" ? "font-semibold text-bosque" : "text-tinta"
                          )}
                        >
                          {l.position}. {l.title}
                        </span>
                        <span className="flex-none text-xs tabular-nums text-suave">
                          {formatDurationSeconds(l.durationSeconds)}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

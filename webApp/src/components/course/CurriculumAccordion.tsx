"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import Icon from "@/components/atoms/Icon";
import LessonStateIcon from "@/components/atoms/LessonStateIcon";
import { formatDurationSeconds, formatTotalDuration } from "@/lib/utils/format";
import type { CourseDetailModule } from "@/lib/server/courses";

type LessonState = "done" | "current" | "pending" | "preview" | "locked";

// X-01 · el ícono va aria-hidden; el estado viaja en este texto, visualmente oculto.
const STATE_LABEL: Record<LessonState, string> = {
  done: "Completada",
  current: "En curso",
  pending: "Pendiente",
  preview: "Vista previa gratuita",
  locked: "Requiere inscripción",
};

interface Props {
  modules: CourseDetailModule[];
  hasAccess: boolean;
  completedLessonIds: string[];
}

function useLessonStates(modules: CourseDetailModule[], hasAccess: boolean, completedLessonIds: string[]) {
  return useMemo(() => {
    const completed = new Set(completedLessonIds);
    const states = new Map<string, LessonState>();
    let currentAssigned = false;

    for (const m of modules) {
      for (const lesson of m.lessons) {
        if (!hasAccess) {
          states.set(lesson.id, lesson.isPreview ? "preview" : "locked");
          continue;
        }
        if (completed.has(lesson.id)) {
          states.set(lesson.id, "done");
        } else if (!currentAssigned) {
          states.set(lesson.id, "current");
          currentAssigned = true;
        } else {
          states.set(lesson.id, "pending");
        }
      }
    }
    return states;
  }, [modules, hasAccess, completedLessonIds]);
}

function moduleMeta(m: CourseDetailModule): string {
  const seconds = m.lessons.reduce((s, l) => s + l.durationSeconds, 0);
  const clases = `${m.lessonCount} ${m.lessonCount === 1 ? "clase" : "clases"}`;
  return seconds > 0 ? `${clases}, ${formatTotalDuration(seconds)}` : clases;
}

/** Programa del curso (B1 «Así es un curso por dentro»): un módulo abierto a la vez. */
export default function CurriculumAccordion({ modules, hasAccess, completedLessonIds }: Props) {
  const lessonStates = useLessonStates(modules, hasAccess, completedLessonIds);

  const defaultOpen = useMemo(() => {
    const withCurrent = modules.find((m) => m.lessons.some((l) => lessonStates.get(l.id) === "current"));
    if (withCurrent) return withCurrent.position;
    return modules.find((m) => m.lessons.length > 0)?.position ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules]);

  const [openPosition, setOpenPosition] = useState<number | null>(defaultOpen);

  return (
    <div className="space-y-3">
      {modules.map((m) => {
        const isOpen = openPosition === m.position;
        return (
          <article key={m.position} className="overflow-hidden rounded-md border-[1.5px] border-linea bg-papel">
            <h3 className="text-[17px]">
              <button
                type="button"
                onClick={() => setOpenPosition(isOpen ? null : m.position)}
                aria-expanded={isOpen}
                aria-controls={`modulo-panel-${m.position}`}
                id={`modulo-trigger-${m.position}`}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block">{m.title}</span>
                  <span className="mt-0.5 block text-sm font-normal tracking-normal text-suave">{moduleMeta(m)}</span>
                </span>
                <Icon
                  name="chevron-down"
                  className={cn(
                    "h-[18px] w-[18px] text-bosque transition-transform duration-300 ease-brote motion-reduce:transition-none",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>

            {isOpen && (
              <div
                id={`modulo-panel-${m.position}`}
                role="region"
                aria-labelledby={`modulo-trigger-${m.position}`}
                className="border-t border-linea"
              >
                {m.description && <p className="px-5 pt-4 text-[15px] leading-relaxed text-suave">{m.description}</p>}
                {m.lessons.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-suave">Las clases de este módulo están en preparación.</p>
                ) : (
                  <ol>
                    {m.lessons.map((lesson) => {
                      const state = lessonStates.get(lesson.id) ?? "locked";
                      const clickable = state !== "locked";
                      const rowClass = cn(
                        "grid min-h-12 grid-cols-[20px_1fr_auto] items-center gap-3 px-5 py-3 text-[15px] leading-snug",
                        clickable ? "text-tinta transition-colors hover:bg-salvia-100" : "text-suave",
                        state === "current" && "bg-miel-100",
                      );
                      const content = (
                        <>
                          <LessonStateIcon state={state} className="h-4 w-4" />
                          <span className="min-w-0">
                            <span className="sr-only">{STATE_LABEL[state]}: </span>
                            {lesson.title}
                            {state === "preview" && (
                              <span className="ml-2 whitespace-nowrap rounded-pill bg-miel-100 px-2 py-0.5 text-xs font-semibold text-miel-800">
                                Gratis
                              </span>
                            )}
                          </span>
                          <time className="text-sm tabular-nums text-suave">{formatDurationSeconds(lesson.durationSeconds)}</time>
                        </>
                      );
                      return (
                        <li key={lesson.id} className="border-t border-linea first:border-t-0">
                          {clickable ? (
                            <a href={`/leccion/${lesson.id}`} className={rowClass}>
                              {content}
                            </a>
                          ) : (
                            <div className={rowClass} aria-disabled="true">
                              {content}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatDurationSeconds } from "@/lib/utils/format";
import { toRoman } from "@/lib/utils/roman";
import type { CourseDetailModule } from "@/lib/server/courses";

type LessonState = "done" | "current" | "pending" | "preview" | "locked";

// Mismo set de glifos que leccion/[id]/page.tsx:7 (STATE_ICON) — se extiende, no se
// reinventa: "preview" y "pending" toman glifos ya aprobados en 01_requirements.md §4
// (✦ y ○), nunca badges/raster estilo Udemy.
const STATE_ICON: Record<LessonState, string> = {
  done: "✓",
  current: "▶",
  pending: "○",
  preview: "✦",
  locked: "⌗",
};

const STATE_ICON_CLASS: Record<LessonState, string> = {
  done: "text-lila-300",
  current: "text-gold-400",
  pending: "text-ink-faint",
  preview: "text-gold-400",
  locked: "text-ink-faint",
};

const STATE_TITLE_CLASS: Record<LessonState, string> = {
  done: "text-ink-soft",
  current: "text-gold-400",
  pending: "text-ink-soft",
  preview: "text-ink",
  locked: "text-ink-faint",
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
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-lila-300/18" />
      <div className="space-y-0">
        {modules.map((m) => {
          const isOpen = openPosition === m.position;
          return (
            <article key={m.position} className="flex gap-6 pb-8">
              <div className="relative z-10 flex flex-col items-center gap-1.5 flex-none">
                <span className="h-10 w-10 rounded-full border border-lila-300/40 bg-cosmos-surface flex items-center justify-center font-display text-sm text-lila-300">
                  {toRoman(m.position)}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-2 pb-4">
                <button
                  type="button"
                  onClick={() => setOpenPosition(isOpen ? null : m.position)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1.5 font-display text-lg tracking-wide text-ink">{m.title}</h4>
                    {m.description && (
                      <p className="mb-2 font-body text-sm text-ink-soft leading-relaxed">{m.description}</p>
                    )}
                    <span className="font-display text-eyebrow tracking-cosmic text-gold-400">
                      ☾ {m.lessonCount} {m.lessonCount === 1 ? "lección" : "lecciones"}
                    </span>
                  </div>
                  <span className="mt-1 flex-none font-display text-sm text-ink-faint">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>

                {isOpen && m.lessons.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {m.lessons.map((lesson) => {
                      const state = lessonStates.get(lesson.id) ?? "locked";
                      const clickable = state !== "locked";
                      const rowClass = cn(
                        "flex items-center gap-3 rounded-ritual px-3 py-2 transition-colors min-w-0",
                        state === "current" && "bg-gold-400/10 border border-gold-400/20",
                        state === "preview" && "border border-gold-400/15",
                        clickable && "hover:bg-cosmos-surface cursor-pointer",
                        !clickable && "opacity-60"
                      );
                      const content = (
                        <>
                          <span className={cn("font-display text-xs flex-none", STATE_ICON_CLASS[state])}>
                            {STATE_ICON[state]}
                          </span>
                          <span className={cn("flex-1 min-w-0 truncate font-body text-sm", STATE_TITLE_CLASS[state])}>
                            {lesson.title}
                          </span>
                          {state === "preview" && (
                            <span className="flex-none font-display text-[9px] tracking-cosmic uppercase text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5">
                              Vista previa
                            </span>
                          )}
                          <span className="flex-none font-display text-xs text-ink-faint">
                            {formatDurationSeconds(lesson.durationSeconds)}
                          </span>
                        </>
                      );

                      return clickable ? (
                        <a key={lesson.id} href={`/leccion/${lesson.id}`} className={rowClass}>
                          {content}
                        </a>
                      ) : (
                        <div key={lesson.id} className={rowClass} aria-disabled="true">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isOpen && m.lessons.length === 0 && (
                  <p className="mt-2 font-body text-xs italic text-ink-faint">
                    Currículum en preparación para este módulo.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

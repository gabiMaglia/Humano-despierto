"use client";

import { useActionState } from "react";
import Link from "next/link";
import { moveLessonAction, deleteLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonSummary } from "@/lib/server/teacher";

interface Props {
  courseId: string;
  moduleId: string;
  lesson: TeacherLessonSummary;
  isFirst: boolean;
  isLast: boolean;
}

export default function LessonRow({ courseId, moduleId, lesson, isFirst, isLast }: Props) {
  const [moveState, moveAction, movePending] = useActionState(moveLessonAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteLessonAction,
    TEACHER_ACTION_INITIAL_STATE
  );

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-linea bg-papel px-3 py-2.5">
      <Link
        href={`/panel/docente/cursos/${courseId}/lecciones/${lesson.id}`}
        className="min-w-0 flex-1 font-body text-sm text-tinta hover:text-miel-800"
      >
        {lesson.title}
      </Link>

      <div className="flex flex-none items-center gap-1.5 font-display text-[10px] tracking-wide uppercase">
        {lesson.isPreview && (
          <span className="rounded-pill border border-miel px-2 py-0.5 text-miel-800">Vista previa</span>
        )}
        <span
          className={`rounded-pill border px-2 py-0.5 ${
            lesson.hasVideo ? "border-linea text-miel-800" : "border-red-400/30 text-red-400"
          }`}
        >
          {lesson.hasVideo ? "Video ✓" : "Sin video"}
        </span>
        <span
          className={`rounded-pill border px-2 py-0.5 ${
            lesson.isPublished ? "border-linea text-miel-800" : "border-linea text-suave"
          }`}
        >
          {lesson.isPublished ? "Publicada" : "Oculta"}
        </span>
      </div>

      <form action={moveAction} className="flex flex-none gap-1">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <button
          type="submit"
          name="direction"
          value="up"
          disabled={isFirst || movePending}
          className="btn btn-outline px-2 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Subir lección"
        >
          ↑
        </button>
        <button
          type="submit"
          name="direction"
          value="down"
          disabled={isLast || movePending}
          className="btn btn-outline px-2 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Bajar lección"
        >
          ↓
        </button>
      </form>

      <form action={deleteAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <button
          type="submit"
          disabled={deletePending}
          className="btn btn-outline px-2 py-1 text-[10px] text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Borrar
        </button>
      </form>

      {(moveState.error || deleteState.error) && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {moveState.error || deleteState.error}
        </p>
      )}
    </li>
  );
}

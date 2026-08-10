"use client";

import { useActionState } from "react";
import { setLessonPublishedAction, deleteLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishLessonControl({
  courseId,
  lessonId,
  isPublished,
}: {
  courseId: string;
  lessonId: string;
  isPublished: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    setLessonPublishedAction,
    TEACHER_ACTION_INITIAL_STATE
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteLessonAction,
    TEACHER_ACTION_INITIAL_STATE
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="nextPublished" value={isPublished ? "false" : "true"} />
        <button
          type="submit"
          disabled={isPending}
          className={
            isPublished
              ? "btn-ritual btn-ritual-ghost rounded-pill disabled:opacity-60"
              : "btn-ritual btn-ritual-primary rounded-pill disabled:opacity-60"
          }
        >
          {isPending ? "…" : isPublished ? "Ocultar lección" : "Publicar lección"}
        </button>
        {state.error && <p className="font-body text-xs text-red-400">{state.error}</p>}
        {state.success && <p className="font-body text-xs text-lila-300">{state.success}</p>}
      </form>

      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!confirm("¿Borrar esta lección? Se pierden sus capítulos y recursos.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <button
          type="submit"
          disabled={deletePending}
          className="font-body text-xs text-red-400/80 hover:text-red-400 disabled:opacity-60"
        >
          {deletePending ? "Borrando…" : "Borrar lección"}
        </button>
        {deleteState.error && <p className="font-body text-xs text-red-400">{deleteState.error}</p>}
      </form>
    </div>
  );
}

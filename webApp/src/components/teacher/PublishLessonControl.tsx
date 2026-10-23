"use client";

import { useActionState } from "react";
import { setLessonPublishedAction, deleteLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishLessonControl({ courseId, lessonId, isPublished }: { courseId: string; lessonId: string; isPublished: boolean }) {
  const [state, formAction, isPending] = useActionState(setLessonPublishedAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteLessonAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <div className="tarjeta flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip tone={isPublished ? "ok" : "muted"}>{isPublished ? "Publicada" : "Oculta"}</StatusChip>
        <form action={formAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="nextPublished" value={isPublished ? "false" : "true"} />
          <Button type="submit" variant={isPublished ? "outline" : "primary"} size="sm" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Un momento…" : isPublished ? "Ocultar lección" : "Publicar lección"}
          </Button>
        </form>
      </div>

      <form
        action={deleteAction}
        onSubmit={(e) => {
          if (!confirm("¿Borrar esta lección? Se pierden sus capítulos y recursos.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
          {deletePending ? "Borrando…" : "Borrar lección"}
        </Button>
      </form>

      <StatusMessage error={state.error || deleteState.error} success={state.success} className="w-full" />
    </div>
  );
}

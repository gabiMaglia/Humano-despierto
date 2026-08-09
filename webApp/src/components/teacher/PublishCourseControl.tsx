"use client";

import { useActionState } from "react";
import { setCoursePublishedAction } from "@/app/(app)/panel/docente/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishCourseControl({
  courseId,
  status,
}: {
  courseId: string;
  status: "draft" | "published" | "archived";
}) {
  const [state, formAction, isPending] = useActionState(
    setCoursePublishedAction,
    TEACHER_ACTION_INITIAL_STATE
  );
  const isPublished = status === "published";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="nextStatus" value={isPublished ? "draft" : "published"} />
        <button
          type="submit"
          disabled={isPending}
          className={
            isPublished
              ? "btn-ritual btn-ritual-ghost rounded-pill disabled:opacity-60"
              : "btn-ritual btn-ritual-primary rounded-pill disabled:opacity-60"
          }
        >
          {isPending ? "…" : isPublished ? "Pasar a borrador" : "Publicar curso"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="max-w-xs text-right font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && <p className="font-body text-xs text-lila-300">{state.success}</p>}
    </div>
  );
}

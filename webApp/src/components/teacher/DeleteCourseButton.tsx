"use client";

import { useActionState } from "react";
import { deleteCourseAction } from "@/app/(app)/panel/docente/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function DeleteCourseButton({ courseId }: { courseId: string }) {
  const [state, formAction, isPending] = useActionState(deleteCourseAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("¿Borrar este curso? Esta acción no se puede deshacer.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <button
          type="submit"
          disabled={isPending}
          className="font-body text-xs text-red-400/80 hover:text-red-400 disabled:opacity-60"
        >
          {isPending ? "Borrando…" : "Borrar curso"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="max-w-xs text-right font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}

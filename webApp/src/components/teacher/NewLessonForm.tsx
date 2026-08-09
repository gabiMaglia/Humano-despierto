"use client";

import { useActionState, useRef, useEffect } from "react";
import { createLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function NewLessonForm({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const [state, formAction, isPending] = useActionState(createLessonAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <input
        name="title"
        required
        placeholder="Título de la lección"
        className="min-w-[180px] flex-1 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50 focus:bg-cosmos-0"
      />
      <label className="flex items-center gap-1.5 font-body text-xs text-ink-faint">
        <input type="checkbox" name="isPreview" className="accent-lila-300" />
        Vista previa
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "…" : "+ Lección"}
      </button>
      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}

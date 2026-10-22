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
        className="min-w-[180px] flex-1 rounded-md border border-linea bg-papel px-3 py-2 font-body text-xs text-tinta outline-none focus:border-linea focus:bg-fondo"
      />
      <label className="flex items-center gap-1.5 font-body text-xs text-suave">
        <input type="checkbox" name="isPreview" className="accent-bosque" />
        Vista previa
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-outline text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
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

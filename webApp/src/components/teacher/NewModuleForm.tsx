"use client";

import { useActionState, useRef, useEffect } from "react";
import { createModuleAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function NewModuleForm({ courseId }: { courseId: string }) {
  const [state, formAction, isPending] = useActionState(createModuleAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="tarjeta flex flex-wrap items-end gap-3 p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="min-w-[200px] flex-1">
        <label className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
          Nuevo módulo
        </label>
        <input
          name="title"
          required
          placeholder="Título del módulo"
          className="w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-sm text-tinta outline-none focus:border-linea focus:bg-fondo"
        />
      </div>
      <div className="min-w-[200px] flex-1">
        <input
          name="description"
          placeholder="Descripción (opcional)"
          className="w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-sm text-tinta outline-none focus:border-linea focus:bg-fondo"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "…" : "+ Módulo"}
      </button>
      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}

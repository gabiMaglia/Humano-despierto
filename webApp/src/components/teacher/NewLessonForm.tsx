"use client";

import { useActionState, useRef, useEffect } from "react";
import { createLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function NewLessonForm({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const [state, formAction, isPending] = useActionState(createLessonAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-linea pt-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <PanelInput className="min-w-56 flex-1" label="Nueva lección" name="title" required placeholder="Título de la lección" error={state.error} />
      <label className="flex min-h-12 items-center gap-2 self-start text-sm text-tinta sm:mt-[1.625rem]">
        <input type="checkbox" name="isPreview" className="h-5 w-5 accent-bosque" />
        Vista previa
      </label>
      <Button type="submit" variant="outline" disabled={isPending} aria-busy={isPending} className="sm:mt-[1.625rem]">
        {isPending ? "Agregando…" : "+ Lección"}
      </Button>
    </form>
  );
}

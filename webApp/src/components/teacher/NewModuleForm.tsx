"use client";

import { useActionState, useRef, useEffect } from "react";
import { createModuleAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function NewModuleForm({ courseId }: { courseId: string }) {
  const [state, formAction, isPending] = useActionState(createModuleAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="tarjeta flex flex-wrap items-start gap-x-4 gap-y-3 p-5">
      <input type="hidden" name="courseId" value={courseId} />
      <PanelInput className="min-w-56 flex-1" label="Nuevo módulo" name="title" required placeholder="Título del módulo" error={state.error} />
      <PanelInput className="min-w-56 flex-1" label="Descripción (opcional)" name="description" />
      <Button type="submit" disabled={isPending} aria-busy={isPending} className="sm:mt-[1.625rem]">
        {isPending ? "Agregando…" : "+ Módulo"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput, PanelTextarea } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE, fieldError, formError } from "@/lib/teacher/action-state";
import type { TeacherLessonFields } from "@/lib/server/teacher";

export default function LessonFieldsForm({ lesson }: { lesson: TeacherLessonFields }) {
  const [state, formAction, isPending] = useActionState(updateLessonAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta space-y-5 p-6">
      <input type="hidden" name="courseId" value={lesson.courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />

      <PanelInput label="Título" name="title" error={fieldError(state, "title")} defaultValue={lesson.title} required />
      <PanelTextarea label="Descripción" name="description" error={fieldError(state, "description")} defaultValue={lesson.description ?? ""} rows={3} />

      <label className="flex min-h-12 items-center gap-3 text-base text-tinta">
        <input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} className="h-5 w-5 accent-bosque" />
        Vista previa (se puede ver sin inscripción)
      </label>

      <StatusMessage error={formError(state)} success={state.success} />
      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

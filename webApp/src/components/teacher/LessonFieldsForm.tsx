"use client";

import { useActionState } from "react";
import { updateLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonFields } from "@/lib/server/teacher";

const inputClass =
  "w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-sm text-tinta outline-none transition-colors focus:border-linea focus:bg-fondo";
const labelClass = "mb-1.5 block font-display text-eyebrow tracking-wide text-suave";

export default function LessonFieldsForm({ lesson }: { lesson: TeacherLessonFields }) {
  const [state, formAction, isPending] = useActionState(updateLessonAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta space-y-4 p-6">
      <input type="hidden" name="courseId" value={lesson.courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />

      <div>
        <label className={labelClass}>Título</label>
        <input name="title" defaultValue={lesson.title} required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Descripción</label>
        <textarea name="description" defaultValue={lesson.description ?? ""} rows={3} className={inputClass} />
      </div>

      <label className="flex items-center gap-2 font-body text-xs text-suave">
        <input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} className="accent-bosque" />
        Vista previa (se puede ver sin inscripción)
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        {state.error && <p className="font-body text-xs text-red-400">{state.error}</p>}
        {state.success && <p className="font-body text-xs text-miel-800">{state.success}</p>}
      </div>
    </form>
  );
}

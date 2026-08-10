"use client";

import { useActionState } from "react";
import { updateLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonFields } from "@/lib/server/teacher";

const inputClass =
  "w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-sm text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0";
const labelClass = "mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft";

export default function LessonFieldsForm({ lesson }: { lesson: TeacherLessonFields }) {
  const [state, formAction, isPending] = useActionState(updateLessonAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="cosmos-card space-y-4 p-6">
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

      <label className="flex items-center gap-2 font-body text-xs text-ink-soft">
        <input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} className="accent-lila-300" />
        Vista previa (se puede ver sin inscripción)
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-primary rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        {state.error && <p className="font-body text-xs text-red-400">{state.error}</p>}
        {state.success && <p className="font-body text-xs text-lila-300">{state.success}</p>}
      </div>
    </form>
  );
}

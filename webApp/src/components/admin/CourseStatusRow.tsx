"use client";

import { useActionState } from "react";
import { setCourseStatusAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { AdminCourseRow, CourseStatus } from "@/lib/server/admin";

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export default function CourseStatusRow({ course }: { course: AdminCourseRow }) {
  const [state, formAction, isPending] = useActionState(
    setCourseStatusAction,
    ADMIN_ACTION_INITIAL_STATE
  );

  return (
    <li className="cosmos-card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm tracking-wide text-ink">{course.title}</p>
        <p className="font-body text-xs text-ink-faint">
          {course.teacherName} · /cursos/{course.slug}
        </p>
      </div>

      <form action={formAction} className="flex flex-none items-center gap-2">
        <input type="hidden" name="courseId" value={course.id} />
        <select
          name="status"
          defaultValue={course.status}
          className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
        >
          {(Object.keys(STATUS_LABEL) as CourseStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : "Guardar"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="w-full font-body text-xs text-lila-300">{state.success}</p>
      )}
    </li>
  );
}

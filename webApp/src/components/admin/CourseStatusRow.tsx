"use client";

import { useActionState } from "react";
import { setCourseStatusAction } from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import { PanelSelect } from "@/components/panel/PanelField";
import { PanelRow, RowMain } from "@/components/panel/PanelRow";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import { COURSE_STATUS, statusOf } from "@/lib/panel/status";
import type { AdminCourseRow, CourseStatus } from "@/lib/server/admin";

export default function CourseStatusRow({ course }: { course: AdminCourseRow }) {
  const [state, formAction, isPending] = useActionState(setCourseStatusAction, ADMIN_ACTION_INITIAL_STATE);
  const current = statusOf(COURSE_STATUS, course.status);

  return (
    <PanelRow>
      <RowMain title={course.title} meta={`${course.teacherName} · /cursos/${course.slug}`} />
      <StatusChip tone={current.tone}>{current.label}</StatusChip>

      <form action={formAction} className="flex flex-none items-center gap-2">
        <input type="hidden" name="courseId" value={course.id} />
        <PanelSelect label={`Estado de ${course.title}`} hideLabel name="status" defaultValue={course.status} invalid={Boolean(state.error)}>
          {(Object.keys(COURSE_STATUS) as CourseStatus[]).map((status) => (
            <option key={status} value={status}>
              {COURSE_STATUS[status].label}
            </option>
          ))}
        </PanelSelect>
        <Button type="submit" variant="outline" size="sm" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </form>

      <StatusMessage error={state.error} success={state.success} className="w-full" />
    </PanelRow>
  );
}

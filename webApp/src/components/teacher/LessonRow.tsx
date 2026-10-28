"use client";

import { useActionState } from "react";
import Link from "next/link";
import { moveLessonAction, deleteLessonAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonSummary } from "@/lib/server/teacher";

interface Props {
  courseId: string;
  moduleId: string;
  lesson: TeacherLessonSummary;
  isFirst: boolean;
  isLast: boolean;
}

export default function LessonRow({ courseId, moduleId, lesson, isFirst, isLast }: Props) {
  const [moveState, moveAction, movePending] = useActionState(moveLessonAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteLessonAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-linea bg-papel px-3 py-2.5">
      <Link
        href={`/panel/docente/cursos/${courseId}/lecciones/${lesson.id}`}
        className="min-h-10 min-w-0 flex-1 basis-48 content-center font-semibold text-tinta [overflow-wrap:anywhere] hover:text-miel-800 hover:underline"
      >
        {lesson.title}
      </Link>

      <div className="flex flex-none flex-wrap items-center gap-1.5">
        {lesson.isPreview && <StatusChip tone="accent">Vista previa</StatusChip>}
        <StatusChip tone={lesson.hasVideo ? "ok" : "error"}>{lesson.hasVideo ? "Con video" : "Sin video"}</StatusChip>
        <StatusChip tone={lesson.isPublished ? "ok" : "muted"}>{lesson.isPublished ? "Publicada" : "Oculta"}</StatusChip>
      </div>

      <form action={moveAction} className="flex flex-none gap-1.5">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <Button type="submit" variant="outline" size="sm" name="direction" value="up" disabled={isFirst || movePending} className="w-10 !px-0" aria-label="Subir lección">
          ↑
        </Button>
        <Button type="submit" variant="outline" size="sm" name="direction" value="down" disabled={isLast || movePending} className="w-10 !px-0" aria-label="Bajar lección">
          ↓
        </Button>
      </form>

      <form action={deleteAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
          Borrar
        </Button>
      </form>

      <StatusMessage error={moveState.error || deleteState.error} className="w-full" />
    </li>
  );
}

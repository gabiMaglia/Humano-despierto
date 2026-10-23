"use client";

import { useActionState } from "react";
import { deleteCourseAction } from "@/app/(app)/panel/docente/actions";
import TypeToConfirmZone from "@/components/panel/TypeToConfirmZone";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

interface Props {
  courseId: string;
  courseTitle: string;
  moduleCount: number;
  lessonCount: number;
}

/** Al pie del editor, lejos de publicar/despublicar: una acción irreversible no comparte vecindario
 *  con las que se usan todos los días. */
export default function DangerZone({ courseId, courseTitle, moduleCount, lessonCount }: Props) {
  const [state, formAction, isPending] = useActionState(deleteCourseAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <TypeToConfirmZone
      heading="Borrar este curso"
      confirmText={courseTitle}
      action={formAction}
      isPending={isPending}
      error={state.error}
      hidden={{ courseId }}
      submitLabel="Borrar curso"
      pendingLabel="Borrando…"
    >
      <p className="text-base text-suave">
        Se borra el curso junto con {moduleCount === 1 ? "su módulo" : `sus ${moduleCount} módulos`}
        {lessonCount > 0 && ` y ${lessonCount === 1 ? "su lección" : `sus ${lessonCount} lecciones`}`}
        , con los capítulos, recursos, notas y el progreso de quienes lo estén cursando.
      </p>
    </TypeToConfirmZone>
  );
}

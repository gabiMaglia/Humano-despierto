"use client";

import { useActionState } from "react";
import { publishAnnouncement } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishAnnouncementControl({ courseId, announcementId }: { courseId: string; announcementId: string }) {
  const [state, formAction, isPending] = useActionState(publishAnnouncement, TEACHER_ACTION_INITIAL_STATE);
  const hintId = `publicar-${announcementId}-aviso`;

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="announcementId" value={announcementId} />
      <button
        type="submit"
        disabled={isPending}
        aria-describedby={hintId}
        className="btn btn-primary disabled:opacity-60"
      >
        {isPending ? "…" : "Publicar y enviar por mail"}
      </button>
      <p id={hintId} className="font-body text-xs text-suave">
        Le llega un mail a cada inscripta activa. Después no se puede editar.
      </p>
      {state.error && (
        <p role="alert" className="font-body text-xs text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { publishAnnouncement } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishAnnouncementControl({ courseId, announcementId }: { courseId: string; announcementId: string }) {
  const [state, formAction, isPending] = useActionState(publishAnnouncement, TEACHER_ACTION_INITIAL_STATE);
  const hintId = `publicar-${announcementId}-aviso`;

  return (
    <form action={formAction} className="flex max-w-sm flex-col items-start gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="announcementId" value={announcementId} />
      <Button type="submit" disabled={isPending} aria-busy={isPending} aria-describedby={hintId}>
        {isPending ? "Publicando…" : "Publicar y enviar por mail"}
      </Button>
      <p id={hintId} className="text-sm text-suave">
        Le llega un mail a cada inscripta activa. Después no se puede editar.
      </p>
      <StatusMessage error={state.error} />
    </form>
  );
}

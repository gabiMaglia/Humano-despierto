"use client";

import { useActionState } from "react";
import { saveAnnouncementDraft } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput, PanelTextarea } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

interface Props {
  courseId: string;
  draft?: { id: string; title: string; body: string };
}

export default function AnnouncementComposer({ courseId, draft }: Props) {
  const [state, formAction, isPending] = useActionState(saveAnnouncementDraft, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      {draft && <input type="hidden" name="announcementId" value={draft.id} />}
      <PanelInput label="Título del anuncio" name="title" required minLength={3} maxLength={200} defaultValue={draft?.title} />
      <PanelTextarea label="Texto del anuncio" name="body" required maxLength={6000} rows={5} defaultValue={draft?.body} />
      <StatusMessage error={state.error} success={state.success} />
      <Button type="submit" variant="outline" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Guardando…" : "Guardar borrador"}
      </Button>
    </form>
  );
}

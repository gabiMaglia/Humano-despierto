"use client";

import { useActionState } from "react";
import { saveAnnouncementDraft } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

interface Props {
  courseId: string;
  draft?: { id: string; title: string; body: string };
}

const FIELD =
  "w-full rounded-ritual border border-lila-300/25 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink outline-none transition-colors focus:border-lila-300/60";

export default function AnnouncementComposer({ courseId, draft }: Props) {
  const [state, formAction, isPending] = useActionState(saveAnnouncementDraft, TEACHER_ACTION_INITIAL_STATE);
  const prefix = draft ? `anuncio-${draft.id}` : "anuncio-nuevo";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      {draft && <input type="hidden" name="announcementId" value={draft.id} />}
      <label htmlFor={`${prefix}-title`} className="block font-display text-eyebrow tracking-cosmic text-ink-faint">
        Título del anuncio
      </label>
      <input id={`${prefix}-title`} name="title" required minLength={3} maxLength={200} defaultValue={draft?.title} className={FIELD} />
      <label htmlFor={`${prefix}-body`} className="block font-display text-eyebrow tracking-cosmic text-ink-faint">
        Texto del anuncio
      </label>
      <textarea id={`${prefix}-body`} name="body" required maxLength={6000} rows={5} defaultValue={draft?.body} className={FIELD} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-ritual btn-ritual-ghost rounded-pill disabled:opacity-60">
          {isPending ? "Guardando…" : "Guardar borrador"}
        </button>
        {state.error && (
          <p role="alert" className="font-body text-xs text-red-400">
            {state.error}
          </p>
        )}
        {state.success && <p className="font-body text-xs text-lila-300">{state.success}</p>}
      </div>
    </form>
  );
}

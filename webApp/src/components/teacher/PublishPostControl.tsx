"use client";

import { useActionState } from "react";
import { setPostPublishedAction } from "@/app/(app)/panel/docente/diario/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishPostControl({ postId, status }: { postId: string; status: "draft" | "published" }) {
  const [state, formAction, isPending] = useActionState(setPostPublishedAction, TEACHER_ACTION_INITIAL_STATE);
  const isPublished = status === "published";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="nextStatus" value={isPublished ? "draft" : "published"} />
        <button
          type="submit"
          disabled={isPending}
          className={
            isPublished
              ? "btn btn-outline disabled:opacity-60"
              : "btn btn-primary disabled:opacity-60"
          }
        >
          {isPending ? "…" : isPublished ? "Pasar a borrador" : "Publicar post"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="max-w-xs text-right font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && <p className="font-body text-xs text-miel-800">{state.success}</p>}
    </div>
  );
}

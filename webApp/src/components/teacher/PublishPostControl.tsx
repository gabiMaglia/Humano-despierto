"use client";

import { useActionState } from "react";
import { setPostPublishedAction } from "@/app/(app)/panel/docente/diario/actions";
import Button from "@/components/atoms/Button";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function PublishPostControl({ postId, status }: { postId: string; status: "draft" | "published" }) {
  const [state, formAction, isPending] = useActionState(setPostPublishedAction, TEACHER_ACTION_INITIAL_STATE);
  const isPublished = status === "published";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form action={formAction}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="nextStatus" value={isPublished ? "draft" : "published"} />
        <Button type="submit" variant={isPublished ? "outline" : "primary"} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Un momento…" : isPublished ? "Pasar a borrador" : "Publicar post"}
        </Button>
      </form>
      <StatusMessage error={state.error} success={state.success} className="max-w-xs" />
    </div>
  );
}

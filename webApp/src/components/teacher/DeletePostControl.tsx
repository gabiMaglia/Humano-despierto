"use client";

import { useActionState } from "react";
import { deletePostAction } from "@/app/(app)/panel/docente/diario/actions";
import TypeToConfirmZone from "@/components/panel/TypeToConfirmZone";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

export default function DeletePostControl({ postId, postTitle }: { postId: string; postTitle: string }) {
  const [state, formAction, isPending] = useActionState(deletePostAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <TypeToConfirmZone
      heading="Borrar este post"
      confirmText={postTitle}
      action={formAction}
      isPending={isPending}
      error={state.error}
      hidden={{ postId }}
      submitLabel="Borrar post"
      pendingLabel="Borrando…"
    />
  );
}

"use client";

import { useActionState } from "react";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { deleteTarotReadingAction } from "@/app/(marketing)/tarot/actions";

export default function DeleteReadingButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteTarotReadingAction, ACTION_INITIAL_STATE);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label="Borrar tirada">Borrar</Button>
      {state.error && <p role="alert" className="text-xs text-error">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE, type ActionState } from "@/lib/action-state";
import { saveTarotReadingAction } from "@/app/(marketing)/tarot/actions";

const INITIAL: ActionState & { id?: string } = ACTION_INITIAL_STATE;

export default function SaveReadingButton({ t, c, q, inv }: { t: string; c: string; q: string | null; inv: boolean }) {
  const [state, action, pending] = useActionState(saveTarotReadingAction, INITIAL);
  if (state.id) {
    return <Link href={`/tarot/lectura/${state.id}`} className="text-sm font-semibold text-exito hover:underline">Guardada. Verla en mi panel</Link>;
  }
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="t" value={t} />
      <input type="hidden" name="c" value={c} />
      {q && <input type="hidden" name="q" value={q} />}
      <input type="hidden" name="inv" value={inv ? "1" : "0"} />
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Guardando…" : "Guardar en mi panel"}</Button>
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
    </form>
  );
}

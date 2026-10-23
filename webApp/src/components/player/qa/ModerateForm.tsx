"use client";

import { useActionState, useState } from "react";
import { QA_ACTION_INITIAL_STATE, type QaActionState } from "@/lib/lesson-qa/action-state";
import QaTextButton from "./QaTextButton";

interface Props {
  // Ya ligada a lección e id por quien la usa: este formulario no sabe si borra pregunta o respuesta.
  action: (prev: QaActionState, formData: FormData) => Promise<QaActionState>;
}

export default function ModerateForm({ action }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);

  if (!open) {
    return (
      <QaTextButton variant="danger" onClick={() => setOpen(true)}>
        Borrar
      </QaTextButton>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex w-full items-center gap-2">
      <input
        name="reason"
        aria-label="Motivo del borrado"
        required
        maxLength={500}
        placeholder="Motivo"
        className="min-w-0 flex-1 rounded-md border border-linea bg-transparent px-2 py-1 font-body text-xs text-tinta placeholder:text-suave outline-none"
      />
      <QaTextButton type="submit" variant="danger" disabled={pending}>
        Confirmar borrado
      </QaTextButton>
      <QaTextButton onClick={() => setOpen(false)}>Cancelar</QaTextButton>
      {state.error && (
        <p role="alert" className="font-body text-xs text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}

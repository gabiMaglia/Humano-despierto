"use client";

import { useActionState, useId, useState } from "react";
import { QA_ACTION_INITIAL_STATE, type QaActionState } from "@/lib/lesson-qa/action-state";
import FormField from "@/components/molecules/FormField";
import QaTextButton from "./QaTextButton";

interface Props {
  // Ya ligada a lección e id por quien la usa: este formulario no sabe si borra pregunta o respuesta.
  action: (prev: QaActionState, formData: FormData) => Promise<QaActionState>;
}

export default function ModerateForm({ action }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);
  const id = useId();

  if (!open) {
    return (
      <QaTextButton variant="danger" onClick={() => setOpen(true)}>
        Borrar
      </QaTextButton>
    );
  }

  return (
    <form action={formAction} className="mt-2 w-full space-y-2">
      <FormField id={`${id}-motivo`} label="Motivo del borrado" hideLabel error={state.error}>
        {(c) => <input {...c} name="reason" required maxLength={500} placeholder="Motivo" className={`${c.className} text-sm`} />}
      </FormField>
      <div className="flex flex-wrap gap-1">
        <QaTextButton type="submit" variant="danger" disabled={pending}>
          Confirmar borrado
        </QaTextButton>
        <QaTextButton onClick={() => setOpen(false)}>Cancelar</QaTextButton>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import AuthField from "@/components/molecules/AuthField";
import ErrorMark from "@/components/atoms/ErrorMark";
import SubmitButton from "@/components/atoms/SubmitButton";
import { updatePasswordAction } from "./actions";
import { PASSWORD_UPDATE_INITIAL_STATE } from "@/lib/auth/action-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

// Acá los campos sí llevan `name`: los lee la Server Action, que viaja por POST.
export default function NuevaClaveForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, PASSWORD_UPDATE_INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <AuthField
        id="nueva-clave"
        label="Clave nueva"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <AuthField
        id="nueva-clave-confirmar"
        label="Repetí la clave"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      {state.error && (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-error">
          <ErrorMark />
          {state.error}
        </p>
      )}
      <SubmitButton loading={isPending} label="Guardar clave" />
    </form>
  );
}

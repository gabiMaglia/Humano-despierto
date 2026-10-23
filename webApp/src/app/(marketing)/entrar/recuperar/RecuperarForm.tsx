"use client";

import { useActionState } from "react";
import AuthField from "@/components/molecules/AuthField";
import { ButtonLink } from "@/components/atoms/Button";
import SubmitButton from "@/components/atoms/SubmitButton";
import { requestPasswordResetAction } from "./actions";
import { RESET_REQUEST_INITIAL_STATE } from "@/lib/auth/action-state";

export default function RecuperarForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, RESET_REQUEST_INITIAL_STATE);

  if (state.status === "sent") {
    // `role="status"` solo en el párrafo: c.5 compara su texto entre dos mails y no tiene que
    // arrastrar el del link.
    return (
      <div className="space-y-5">
        <p role="status" className="text-base text-tinta">
          {state.message}
        </p>
        <ButtonLink href="/entrar" variant="outline">
          Volver a entrar
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <AuthField
        id="recuperar-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@email.com"
        error={state.status === "invalid" ? state.message : null}
      />
      <SubmitButton loading={isPending} label="Enviar enlace" />
    </form>
  );
}

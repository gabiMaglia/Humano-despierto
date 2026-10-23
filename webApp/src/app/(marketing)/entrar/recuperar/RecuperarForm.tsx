"use client";

import { useActionState } from "react";
import Link from "next/link";
import AuthField from "@/components/molecules/AuthField";
import SubmitButton from "@/components/atoms/SubmitButton";
import { requestPasswordResetAction } from "./actions";
import { RESET_REQUEST_INITIAL_STATE } from "@/lib/auth/action-state";

export default function RecuperarForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, RESET_REQUEST_INITIAL_STATE);

  if (state.status === "sent") {
    // `role="status"` solo en el párrafo: c.5 compara su texto entre dos mails y no tiene que
    // arrastrar el del link.
    return (
      <div className="space-y-4">
        <p role="status" className="font-body text-sm text-suave">
          {state.message}
        </p>
        <Link href="/entrar" className="font-body text-xs text-miel-800 transition-colors hover:text-miel-800">
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <AuthField
        id="recuperar-email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@email.com"
      />
      {state.status === "invalid" && (
        <p role="alert" className="font-body text-xs text-error">
          {state.message}
        </p>
      )}
      <SubmitButton loading={isPending} label="Enviar enlace" />
    </form>
  );
}

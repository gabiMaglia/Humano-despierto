"use client";

import { useActionState } from "react";
import { inviteTeacherAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { INVITE_ACTION_INITIAL_STATE } from "@/lib/admin/invite-state";
import ResendInvitationButton from "./ResendInvitationButton";

export default function InviteTeacherForm() {
  const [state, invite, isPending] = useActionState(inviteTeacherAction, INVITE_ACTION_INITIAL_STATE);
  // "Ya hay una invitación pendiente" no es un fallo sino un aviso con salida (reenviar): se
  // anuncia sin interrumpir, igual que antes del rediseño.
  return (
    <div className="tarjeta space-y-4 p-5">
      <form action={invite} className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <PanelInput className="min-w-56 flex-1" label="Mail de la docente" type="email" name="email" required maxLength={320} autoComplete="off" invalid={Boolean(state.error)} />
        <Button type="submit" disabled={isPending} aria-busy={isPending} className="sm:mt-[1.625rem]">
          {isPending ? "Invitando…" : "Invitar"}
        </Button>
      </form>
      <StatusMessage error={state.error} success={state.success} polite />
      {state.resendEmail && <ResendInvitationButton email={state.resendEmail} label="Reenviar invitación" />}
    </div>
  );
}

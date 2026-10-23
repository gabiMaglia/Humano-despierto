"use client";

import { useActionState } from "react";
import { resendInvitationAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import Button, { type ButtonSize } from "@/components/atoms/Button";
import StatusMessage from "@/components/panel/StatusMessage";
import { INVITE_ACTION_INITIAL_STATE } from "@/lib/admin/invite-state";

export default function ResendInvitationButton({ email, label, size }: { email: string; label: string; size?: ButtonSize }) {
  const [state, resend, isPending] = useActionState(resendInvitationAction, INVITE_ACTION_INITIAL_STATE);
  return (
    <form action={resend} className="flex flex-col items-start gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="outline" size={size} disabled={isPending} aria-busy={isPending}>
        {isPending ? "Reenviando…" : label}
      </Button>
      <StatusMessage error={state.error} success={state.success} polite />
    </form>
  );
}

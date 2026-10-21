"use client";

import { useActionState } from "react";
import { resendInvitationAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import { INVITE_ACTION_INITIAL_STATE } from "@/lib/admin/invite-state";
import ActionFeedback from "@/components/reviews/ActionFeedback";

export default function ResendInvitationButton({ email, label }: { email: string; label: string }) {
  const [state, resend, isPending] = useActionState(resendInvitationAction, INVITE_ACTION_INITIAL_STATE);
  return (
    <form action={resend}>
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={isPending}
        className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "…" : label}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

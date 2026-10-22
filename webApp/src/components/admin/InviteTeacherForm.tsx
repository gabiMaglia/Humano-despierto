"use client";

import { useActionState } from "react";
import { inviteTeacherAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import { INVITE_ACTION_INITIAL_STATE } from "@/lib/admin/invite-state";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import ResendInvitationButton from "./ResendInvitationButton";

export default function InviteTeacherForm() {
  const [state, invite, isPending] = useActionState(inviteTeacherAction, INVITE_ACTION_INITIAL_STATE);
  return (
    <div className="cosmos-card p-4">
      <form action={invite} className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">Mail de la docente</span>
          <input
            type="email"
            name="email"
            required
            maxLength={320}
            autoComplete="off"
            className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-primary flex-none rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : "Invitar"}
        </button>
      </form>
      <ActionFeedback state={state} />
      {state.resendEmail && (
        <div className="mt-3">
          <ResendInvitationButton email={state.resendEmail} label="Reenviar invitación" />
        </div>
      )}
    </div>
  );
}

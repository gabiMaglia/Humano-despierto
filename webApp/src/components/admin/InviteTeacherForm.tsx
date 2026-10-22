"use client";

import { useActionState } from "react";
import { inviteTeacherAction } from "@/app/(app)/panel/admin/invitaciones/actions";
import { INVITE_ACTION_INITIAL_STATE } from "@/lib/admin/invite-state";
import ActionFeedback from "@/components/reviews/ActionFeedback";
import ResendInvitationButton from "./ResendInvitationButton";

export default function InviteTeacherForm() {
  const [state, invite, isPending] = useActionState(inviteTeacherAction, INVITE_ACTION_INITIAL_STATE);
  return (
    <div className="tarjeta p-4">
      <form action={invite} className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">Mail de la docente</span>
          <input
            type="email"
            name="email"
            required
            maxLength={320}
            autoComplete="off"
            className="w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-xs text-tinta outline-none transition-colors focus:border-linea focus:bg-fondo"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary flex-none disabled:cursor-not-allowed disabled:opacity-60"
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

"use client";

import { useActionState, useState } from "react";
import type { AnnouncementFormState } from "@/lib/announcements/types";

interface Props {
  action: (prev: AnnouncementFormState, formData: FormData) => Promise<AnnouncementFormState>;
  announcementId: string;
  /** Solo la docente lo manda: sus actions revalidan por curso. */
  courseId?: string;
  label: string;
}

const IDLE: AnnouncementFormState = { error: null, success: null };

// Docente y admin retiran con el mismo formulario: el motivo es obligatorio en la base (ADR-012).
export default function WithdrawAnnouncementForm({ action, announcementId, courseId, label }: Props) {
  const [state, formAction, isPending] = useActionState(action, IDLE);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display text-eyebrow tracking-cosmic text-ink-faint hover:text-red-400 transition-colors"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="announcementId" value={announcementId} />
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      <label className="flex-1">
        <span className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-faint">Motivo</span>
        <input
          type="text"
          name="reason"
          required
          maxLength={500}
          autoComplete="off"
          className="w-full rounded-ritual border border-lila-300/25 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink outline-none transition-colors focus:border-red-400/60"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-ritual border border-red-400/50 px-4 py-2 font-display text-eyebrow tracking-cosmic text-red-400 transition-colors hover:enabled:bg-red-400/10 disabled:opacity-40"
      >
        {isPending ? "Retirando…" : "Retirar"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="font-display text-eyebrow tracking-cosmic text-ink-faint">
        Cancelar
      </button>
      {state.error && (
        <p role="alert" className="font-body text-xs text-red-400 sm:basis-full">
          {state.error}
        </p>
      )}
    </form>
  );
}

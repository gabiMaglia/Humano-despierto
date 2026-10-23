"use client";

import { useActionState, useState } from "react";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
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
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex w-full flex-col gap-3 sm:flex-row sm:items-start">
      <input type="hidden" name="announcementId" value={announcementId} />
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      <PanelInput className="flex-1" label="Motivo" type="text" name="reason" required maxLength={500} autoComplete="off" error={state.error} />
      <div className="flex items-center gap-2 sm:mt-[1.625rem]">
        <Button type="submit" variant="danger" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Retirando…" : "Retirar"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

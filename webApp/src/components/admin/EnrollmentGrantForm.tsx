"use client";

import { useActionState } from "react";
import { grantEnrollmentByEmailAction } from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";

/** T-049: mail y slug en vez de dos <select> con todas las cuentas y cursos; los resuelve el servidor. */
export default function EnrollmentGrantForm() {
  const [state, formAction, isPending] = useActionState(grantEnrollmentByEmailAction, ADMIN_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta flex flex-wrap items-start gap-x-4 gap-y-3 p-5">
      <PanelInput className="min-w-48 flex-1" label="Mail de la alumna/o" type="email" name="email" required maxLength={320} autoComplete="off" invalid={Boolean(state.error)} />
      <PanelInput
        className="min-w-48 flex-1"
        label="Slug del curso"
        type="text"
        name="courseSlug"
        required
        maxLength={120}
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        autoComplete="off"
        error={state.error}
      />
      <Button type="submit" disabled={isPending} aria-busy={isPending} className="sm:mt-[1.625rem]">
        {isPending ? "Inscribiendo…" : "Inscribir"}
      </Button>
      <StatusMessage success={state.success} className="w-full" />
    </form>
  );
}

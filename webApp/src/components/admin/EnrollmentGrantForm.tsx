"use client";

import { useActionState } from "react";
import { grantEnrollmentByEmailAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";

const INPUT_CLASS =
  "w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-xs text-tinta outline-none transition-colors focus:border-linea focus:bg-fondo";

/** T-049: mail y slug en vez de dos <select> con todas las cuentas y cursos; los resuelve el servidor. */
export default function EnrollmentGrantForm() {
  const [state, formAction, isPending] = useActionState(grantEnrollmentByEmailAction, ADMIN_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-[180px] flex-1">
        <span className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">Mail de la alumna/o</span>
        <input type="email" name="email" required maxLength={320} autoComplete="off" className={INPUT_CLASS} />
      </label>

      <label className="min-w-[180px] flex-1">
        <span className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">Slug del curso</span>
        <input
          type="text"
          name="courseSlug"
          required
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary flex-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "…" : "Inscribir"}
      </button>

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-error">
          {state.error}
        </p>
      )}
      {state.success && <p className="w-full font-body text-xs text-miel-800">{state.success}</p>}
    </form>
  );
}

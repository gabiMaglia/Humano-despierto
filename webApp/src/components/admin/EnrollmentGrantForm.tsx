"use client";

import { useActionState } from "react";
import { grantEnrollmentByEmailAction } from "@/app/(app)/panel/admin/actions";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";

const INPUT_CLASS =
  "w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-xs text-ink outline-none transition-colors focus:border-lila-300/50 focus:bg-cosmos-0";

/** T-049: mail y slug en vez de dos <select> con todas las cuentas y cursos; los resuelve el servidor. */
export default function EnrollmentGrantForm() {
  const [state, formAction, isPending] = useActionState(grantEnrollmentByEmailAction, ADMIN_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="cosmos-card flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-[180px] flex-1">
        <span className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">Mail de la alumna/o</span>
        <input type="email" name="email" required maxLength={320} autoComplete="off" className={INPUT_CLASS} />
      </label>

      <label className="min-w-[180px] flex-1">
        <span className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">Slug del curso</span>
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
        className="btn-ritual btn-ritual-primary flex-none rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "…" : "Inscribir"}
      </button>

      {state.error && (
        <p role="alert" className="w-full font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && <p className="w-full font-body text-xs text-lila-300">{state.success}</p>}
    </form>
  );
}

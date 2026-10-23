"use client";

import { useActionState, useState } from "react";
import { deletePostAction } from "@/app/(app)/panel/docente/diario/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

interface Props {
  postId: string;
  postTitle: string;
}

// Mismo patrón que `DangerZone` (borrar curso, T-005): escribir el título en vez de un
// `confirm()` que se acepta por reflejo.
export default function DeletePostControl({ postId, postTitle }: Props) {
  const [state, formAction, isPending] = useActionState(deletePostAction, TEACHER_ACTION_INITIAL_STATE);
  const [confirmacion, setConfirmacion] = useState("");
  const coincide = confirmacion.trim() === postTitle.trim();

  return (
    <section className="rounded-md border border-error bg-error/5">
      <header className="border-b border-error px-5 py-3">
        <h2 className="font-display text-eyebrow tracking-wide text-error">Zona de peligro</h2>
      </header>

      <div className="px-5 py-5">
        <h3 className="mb-1 font-display text-base tracking-wide text-tinta">Borrar este post</h3>
        <p className="mb-5 font-body text-sm text-error">Esta acción no se puede deshacer.</p>

        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="postId" value={postId} />
          <label className="flex-1">
            <span className="mb-1.5 block font-display text-eyebrow tracking-wide text-suave">
              Escribí <span className="text-tinta">{postTitle}</span> para confirmar
            </span>
            <input
              type="text"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              autoComplete="off"
              aria-label={`Escribí ${postTitle} para confirmar el borrado`}
              className="w-full rounded-md border border-linea bg-fondo px-3 py-2 font-body text-sm text-tinta outline-none transition-colors focus:border-error"
            />
          </label>
          <button
            type="submit"
            disabled={!coincide || isPending}
            className="rounded-md border border-error px-4 py-2 font-display text-eyebrow tracking-wide text-error transition-colors hover:enabled:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Borrando…" : "Borrar post"}
          </button>
        </form>

        {state.error && (
          <p role="alert" className="mt-3 font-body text-sm text-error">
            {state.error}
          </p>
        )}
      </div>
    </section>
  );
}

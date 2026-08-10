"use client";

import { useActionState, useState } from "react";
import { deleteCourseAction } from "@/app/(app)/panel/docente/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";

interface Props {
  courseId: string;
  courseTitle: string;
  moduleCount: number;
  lessonCount: number;
}

/**
 * Zona de peligro, al pie del editor y separada de las acciones cotidianas.
 * Antes "Borrar curso" vivía en el header, al lado de publicar/despublicar: una
 * acción irreversible a un click de distancia de una que se usa todos los días.
 *
 * Sigue el patrón de GitHub por tres cosas, no solo por el recuadro rojo:
 * enumera lo que se va a destruir, exige escribir el título para confirmar —un
 * `confirm()` se acepta por reflejo, escribir el nombre no— y mantiene el botón
 * deshabilitado hasta que coincide.
 */
export default function DangerZone({ courseId, courseTitle, moduleCount, lessonCount }: Props) {
  const [state, formAction, isPending] = useActionState(deleteCourseAction, TEACHER_ACTION_INITIAL_STATE);
  const [confirmacion, setConfirmacion] = useState("");
  const coincide = confirmacion.trim() === courseTitle.trim();

  return (
    <section className="rounded-ritual border border-red-400/40 bg-red-400/[0.04]">
      <header className="border-b border-red-400/25 px-5 py-3">
        <h2 className="font-display text-eyebrow tracking-cosmic text-red-400">Zona de peligro</h2>
      </header>

      <div className="px-5 py-5">
        <h3 className="mb-1 font-display text-base tracking-wide text-ink">Borrar este curso</h3>
        <p className="mb-1 font-body text-sm text-ink-soft">
          Se borra el curso junto con {moduleCount === 1 ? "su módulo" : `sus ${moduleCount} módulos`}
          {lessonCount > 0 && ` y ${lessonCount === 1 ? "su lección" : `sus ${lessonCount} lecciones`}`}
          , con los capítulos, recursos, notas y el progreso de quienes lo estén cursando.
        </p>
        <p className="mb-5 font-body text-sm text-red-400/90">Esta acción no se puede deshacer.</p>

        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="courseId" value={courseId} />
          <label className="flex-1">
            <span className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-faint">
              Escribí <span className="text-ink">{courseTitle}</span> para confirmar
            </span>
            <input
              type="text"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              autoComplete="off"
              aria-label={`Escribí ${courseTitle} para confirmar el borrado`}
              className="w-full rounded-ritual border border-lila-300/25 bg-cosmos-0 px-3 py-2 font-body text-sm text-ink outline-none transition-colors focus:border-red-400/60"
            />
          </label>
          <button
            type="submit"
            disabled={!coincide || isPending}
            className="rounded-ritual border border-red-400/50 px-4 py-2 font-display text-eyebrow tracking-cosmic text-red-400 transition-colors hover:enabled:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Borrando…" : "Borrar curso"}
          </button>
        </form>

        {state.error && (
          <p role="alert" className="mt-3 font-body text-sm text-red-400">
            {state.error}
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useActionState, useState } from "react";
import SignedImage from "@/components/atoms/SignedImage";
import FormStatus from "@/components/molecules/FormStatus";
import {
  removeCourseCoverAction,
  uploadCourseCoverAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import { IMAGE_ACCEPT, exceedsCoverLimit } from "@/lib/validation/image";

interface Props {
  courseId: string;
  coverUrl: string | null;
  courseTitle: string;
}

export default function CoverForm({ courseId, coverUrl, courseTitle }: Props) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadCourseCoverAction, TEACHER_ACTION_INITIAL_STATE);
  const [removeState, removeAction, removing] = useActionState(removeCourseCoverAction, TEACHER_ACTION_INITIAL_STATE);
  // Aviso temprano: el servidor rechaza igual, pero asi la docente no sube 3 MB para nada.
  const [tooBig, setTooBig] = useState(false);

  return (
    <section aria-labelledby="cover-title" className="tarjeta flex flex-col gap-4 p-6">
      <h2 id="cover-title" className="font-display text-lg tracking-wide text-tinta">Portada</h2>
      {coverUrl ? (
        <SignedImage
          src={coverUrl}
          alt={`Portada de ${courseTitle}`}
          loading="eager"
          className="aspect-[4/3] w-full max-w-sm rounded-sm object-cover"
        />
      ) : (
        <div aria-hidden className="aspect-[4/3] w-full max-w-sm rounded-sm bg-salvia-100" />
      )}
      <form action={uploadAction} className="flex flex-col items-start gap-3">
        <input type="hidden" name="courseId" value={courseId} />
        <label htmlFor="cover" className="font-body text-xs text-suave">
          Elegir portada (JPG, PNG o WEBP, hasta 3 MB)
        </label>
        <input
          id="cover"
          name="cover"
          type="file"
          accept={IMAGE_ACCEPT}
          required
          onChange={(e) => setTooBig(exceedsCoverLimit(e.currentTarget.files?.[0]?.size ?? 0))}
          className="max-w-full font-body text-xs text-suave"
        />
        {tooBig && <p role="alert" className="font-body text-xs text-red-400">La imagen pesa más de 3 MB.</p>}
        <button type="submit" disabled={uploading || tooBig} className="btn btn-primary">
          {uploading ? "Subiendo…" : "Subir portada"}
        </button>
        <FormStatus state={uploadState} />
      </form>
      {coverUrl && (
        <form action={removeAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <button type="submit" disabled={removing} className="btn btn-outline">
            Quitar portada
          </button>
        </form>
      )}
      {/* Fuera del bloque condicional: al quitar, `coverUrl` pasa a null y el aviso se iria con el form. */}
      <FormStatus state={removeState} />
    </section>
  );
}

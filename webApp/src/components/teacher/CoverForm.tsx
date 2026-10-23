"use client";

import { useActionState, useId, useState } from "react";
import SignedImage from "@/components/atoms/SignedImage";
import Button from "@/components/atoms/Button";
import ErrorMark from "@/components/atoms/ErrorMark";
import StatusMessage from "@/components/panel/StatusMessage";
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
  const fileId = useId();
  const errorId = `${fileId}-error`;
  const fileError = tooBig ? "La imagen pesa más de 3 MB." : uploadState.error;

  return (
    <section aria-labelledby="cover-title" className="tarjeta flex flex-col gap-5 p-6">
      <h2 id="cover-title" className="text-xl font-semibold text-bosque">Portada</h2>
      {coverUrl ? (
        <SignedImage
          src={coverUrl}
          alt={`Portada de ${courseTitle}`}
          loading="eager"
          className="aspect-[4/3] w-full max-w-sm rounded-md object-cover"
        />
      ) : (
        <div aria-hidden className="aspect-[4/3] w-full max-w-sm rounded-md bg-salvia-100" />
      )}
      <form action={uploadAction} className="flex flex-col items-start gap-3">
        <input type="hidden" name="courseId" value={courseId} />
        <label htmlFor={fileId} className="text-sm font-semibold text-tinta">
          Elegir portada (JPG, PNG o WEBP, hasta 3 MB)
        </label>
        <input
          id={fileId}
          name="cover"
          type="file"
          accept={IMAGE_ACCEPT}
          required
          aria-invalid={fileError ? true : undefined}
          aria-describedby={fileError ? errorId : undefined}
          onChange={(e) => setTooBig(exceedsCoverLimit(e.currentTarget.files?.[0]?.size ?? 0))}
          className="max-w-full text-sm text-tinta file:mr-4 file:min-h-10 file:cursor-pointer file:rounded-pill file:border-0 file:bg-salvia-100 file:px-4 file:text-sm file:font-semibold file:text-bosque"
        />
        {fileError && (
          <p id={errorId} role="alert" className="flex items-start gap-2 text-sm font-medium text-error">
            <ErrorMark />
            <span>{fileError}</span>
          </p>
        )}
        <Button type="submit" disabled={uploading || tooBig} aria-busy={uploading}>
          {uploading ? "Subiendo…" : "Subir portada"}
        </Button>
        <StatusMessage success={uploadState.success} />
      </form>
      {coverUrl && (
        <form action={removeAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit" variant="outline" disabled={removing}>
            Quitar portada
          </Button>
        </form>
      )}
      {/* Fuera del bloque condicional: al quitar, `coverUrl` pasa a null y el aviso se iria con el form. */}
      <StatusMessage error={removeState.error} success={removeState.success} />
    </section>
  );
}

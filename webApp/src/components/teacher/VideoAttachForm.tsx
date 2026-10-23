"use client";

import { useActionState, useRef, useEffect } from "react";
import { attachLessonVideoAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonPreview } from "@/lib/server/teacher";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  courseId: string;
  lessonId: string;
  durationSeconds: number;
  preview: TeacherLessonPreview | null;
}

// c.4/c.4b: la docente pega la URL, el servidor extrae el `video_id` y resuelve
// `duration_seconds` contra YouTube — ella nunca ve ni escribe esos dos campos a mano
// (`attachLessonVideoAction`, service_role). Los 5 casos de error de `resolveYoutubeVideo`
// (URL inválida, privado/borrado/inexistente, cuota agotada, duración 0) llegan acá tal cual
// los redactó el servidor — sin genérico "algo salió mal".
//
// La vista embebida de abajo ES la solución al caveat heredado de T-006: una docente dueña
// pero sin inscripción no ve su video por `/leccion/[id]` (ADR-003 solo cubre inscripción
// activa o `is_preview`). En vez de tocar el reproductor de alumno — que no es de este
// ticket y mezclaría dos superficies de acceso distintas — esta página ya verificó
// titularidad de servidor para poder editar la lección, así que sirve su propia vista previa
// ahí mismo, sin pasar por `getLessonPlayerData`.
export default function VideoAttachForm({ courseId, lessonId, durationSeconds, preview }: Props) {
  const [state, formAction, isPending] = useActionState(attachLessonVideoAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section aria-labelledby="video-titulo" className="tarjeta space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="video-titulo" className="text-xl font-semibold text-bosque">Video de YouTube</h2>
        {durationSeconds > 0 ? (
          <StatusChip tone="ok">
            Cargado · <span className="tabular-nums">{formatDuration(durationSeconds)}</span>
          </StatusChip>
        ) : (
          <StatusChip tone="error">Sin video</StatusChip>
        )}
      </div>

      <form ref={formRef} action={formAction} className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <PanelInput
          className="min-w-64 flex-1"
          label="Link de YouTube"
          hint="Vale el link de watch, youtu.be o embed."
          name="url"
          required
          placeholder="https://www.youtube.com/watch?v=…"
          error={state.error}
        />
        <Button type="submit" disabled={isPending} aria-busy={isPending} className="sm:mt-[1.625rem]">
          {isPending ? "Consultando YouTube…" : durationSeconds > 0 ? "Reemplazar video" : "Cargar video"}
        </Button>
      </form>
      <StatusMessage success={state.success} />

      {preview && (
        <div>
          <p className="mb-2 text-sm font-semibold text-tinta">Vista previa (sólo la ves vos, como dueña de la lección)</p>
          <div className="aspect-video w-full overflow-hidden rounded-md border border-linea">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${preview.videoId}`}
              title="Vista previa de la lección"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}

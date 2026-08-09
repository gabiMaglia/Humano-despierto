"use client";

import { useActionState, useRef, useEffect } from "react";
import { attachLessonVideoAction } from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
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
    <div className="cosmos-card space-y-4 p-6">
      <h3 className="font-display text-sm tracking-wide text-ink">Video de YouTube</h3>

      {durationSeconds > 0 ? (
        <p className="font-body text-xs text-lila-300">
          Cargado — duración {formatDuration(durationSeconds)}.
        </p>
      ) : (
        <p className="font-body text-xs text-ink-faint">Todavía no tiene video cargado.</p>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <div className="min-w-[260px] flex-1">
          <label className="mb-1.5 block font-display text-eyebrow tracking-cosmic text-ink-soft">
            Link de YouTube (watch, youtu.be o embed)
          </label>
          <input
            name="url"
            required
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-lila-300/50 focus:bg-cosmos-0"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-primary rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Consultando YouTube…" : durationSeconds > 0 ? "Reemplazar video" : "Cargar video"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
      {state.success && <p className="font-body text-xs text-lila-300">{state.success}</p>}

      {preview && (
        <div>
          <p className="mb-2 font-display text-eyebrow tracking-cosmic text-ink-soft">
            Vista previa (solo la ves vos, como dueña de la lección)
          </p>
          <div className="aspect-video w-full overflow-hidden rounded-ritual border border-lila-300/20">
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
    </div>
  );
}

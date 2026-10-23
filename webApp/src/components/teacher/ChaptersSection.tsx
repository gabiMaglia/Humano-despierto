"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonChapter } from "@/lib/server/teacher";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ChapterRow({ courseId, lessonId, chapter }: { courseId: string; lessonId: string; chapter: TeacherLessonChapter }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateChapterAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteChapterAction, TEACHER_ACTION_INITIAL_STATE);

  if (editing) {
    return (
      <li>
        <form action={updateAction} className="flex flex-wrap items-start gap-x-3 gap-y-3 rounded-md border border-linea bg-papel p-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="chapterId" value={chapter.id} />
          <PanelInput className="w-28" label="Minuto" name="timestamp" defaultValue={formatClock(chapter.startSeconds)} invalid={Boolean(updateState.error)} />
          <PanelInput className="min-w-48 flex-1" label="Etiqueta" name="label" defaultValue={chapter.label} error={updateState.error} />
          <div className="flex items-center gap-2 sm:mt-[1.625rem]">
            <Button type="submit" size="sm" disabled={updatePending}>
              Guardar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-linea bg-papel px-3 py-2">
      <span className="w-14 flex-none text-sm font-semibold tabular-nums text-miel-800">{formatClock(chapter.startSeconds)}</span>
      <span className="min-w-0 flex-1 basis-40 text-tinta [overflow-wrap:anywhere]">{chapter.label}</span>
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Editar
      </Button>
      <form action={deleteAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="chapterId" value={chapter.id} />
        <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
          Borrar
        </Button>
      </form>
      <StatusMessage error={deleteState.error} className="w-full" />
    </li>
  );
}

export default function ChaptersSection({ courseId, lessonId, chapters }: { courseId: string; lessonId: string; chapters: TeacherLessonChapter[] }) {
  const [state, formAction, isPending] = useActionState(createChapterAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section aria-labelledby="capitulos-titulo" className="tarjeta space-y-4 p-6">
      <h2 id="capitulos-titulo" className="text-xl font-semibold text-bosque">Capítulos</h2>
      <ul className="space-y-2">
        {chapters.map((c) => (
          <ChapterRow key={c.id} courseId={courseId} lessonId={lessonId} chapter={c} />
        ))}
        {chapters.length === 0 && <li className="text-sm text-suave">Sin capítulos todavía.</li>}
      </ul>

      <form ref={formRef} action={formAction} className="flex flex-wrap items-start gap-x-3 gap-y-3 border-t border-linea pt-4">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <PanelInput className="w-28" label="Minuto" name="timestamp" required placeholder="mm:ss" inputMode="numeric" invalid={Boolean(state.error)} />
        <PanelInput className="min-w-48 flex-1" label="Etiqueta del capítulo" name="label" required error={state.error} />
        <Button type="submit" variant="outline" disabled={isPending} aria-busy={isPending} className="sm:mt-[1.625rem]">
          {isPending ? "Agregando…" : "+ Capítulo"}
        </Button>
      </form>
    </section>
  );
}

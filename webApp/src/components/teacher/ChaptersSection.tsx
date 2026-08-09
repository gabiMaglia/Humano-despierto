"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonChapter } from "@/lib/server/teacher";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ChapterRow({
  courseId,
  lessonId,
  chapter,
}: {
  courseId: string;
  lessonId: string;
  chapter: TeacherLessonChapter;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateChapterAction,
    TEACHER_ACTION_INITIAL_STATE
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteChapterAction,
    TEACHER_ACTION_INITIAL_STATE
  );

  if (editing) {
    return (
      <li>
        <form action={updateAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="chapterId" value={chapter.id} />
          <input
            name="timestamp"
            defaultValue={formatClock(chapter.startSeconds)}
            className="w-20 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-1.5 font-body text-xs text-ink outline-none focus:border-lila-300/50"
          />
          <input
            name="label"
            defaultValue={chapter.label}
            className="min-w-[160px] flex-1 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-1.5 font-body text-xs text-ink outline-none focus:border-lila-300/50"
          />
          <button
            type="submit"
            disabled={updatePending}
            className="btn-ritual btn-ritual-primary rounded-pill text-[10px] disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="font-body text-xs text-ink-faint hover:text-ink"
          >
            Cancelar
          </button>
          {updateState.error && <p className="w-full font-body text-xs text-red-400">{updateState.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-ritual border border-lila-300/12 bg-cosmos-0/40 px-3 py-2">
      <span className="font-body text-xs text-lila-300">{formatClock(chapter.startSeconds)}</span>
      <span className="min-w-0 flex-1 font-body text-sm text-ink">{chapter.label}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-ritual btn-ritual-ghost rounded-pill px-2 py-1 text-[10px]"
      >
        Editar
      </button>
      <form action={deleteAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="chapterId" value={chapter.id} />
        <button
          type="submit"
          disabled={deletePending}
          className="btn-ritual btn-ritual-ghost rounded-pill px-2 py-1 text-[10px] text-red-400 disabled:opacity-40"
        >
          Borrar
        </button>
      </form>
      {deleteState.error && <p className="w-full font-body text-xs text-red-400">{deleteState.error}</p>}
    </li>
  );
}

export default function ChaptersSection({
  courseId,
  lessonId,
  chapters,
}: {
  courseId: string;
  lessonId: string;
  chapters: TeacherLessonChapter[];
}) {
  const [state, formAction, isPending] = useActionState(createChapterAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="cosmos-card space-y-3 p-6">
      <h3 className="font-display text-sm tracking-wide text-ink">Capítulos</h3>
      <ul className="space-y-1.5">
        {chapters.map((c) => (
          <ChapterRow key={c.id} courseId={courseId} lessonId={lessonId} chapter={c} />
        ))}
        {chapters.length === 0 && <li className="font-body text-xs text-ink-faint">Sin capítulos todavía.</li>}
      </ul>

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input
          name="timestamp"
          required
          placeholder="mm:ss"
          className="w-20 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50"
        />
        <input
          name="label"
          required
          placeholder="Etiqueta del capítulo"
          className="min-w-[160px] flex-1 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:opacity-60"
        >
          {isPending ? "…" : "+ Capítulo"}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="font-body text-xs text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}

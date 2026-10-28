"use client";

import { useState } from "react";
import { deleteLessonNote, saveLessonNote, updateLessonNote } from "@/app/leccion/[id]/actions";
import type { PlayerNote } from "@/lib/server/lesson-player";

const byTime = (a: PlayerNote, b: PlayerNote) => a.atSeconds - b.atSeconds;

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export interface LessonNotes {
  notes: PlayerNote[];
  busy: boolean;
  /** `scope` es "add" o el id de la nota: así cada campo muestra sólo SU error. */
  error: { scope: string; message: string } | null;
  add: (atSeconds: number, body: string) => Promise<boolean>;
  edit: (id: string, body: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

/** Estado y llamadas de las notas de una lección; cada operación devuelve si salió bien. */
export function useLessonNotes(lessonId: string, initial: PlayerNote[]): LessonNotes {
  const [notes, setNotes] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LessonNotes["error"]>(null);

  async function run(scope: string, fallback: string, op: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await op();
      return true;
    } catch (e) {
      setError({ scope, message: messageOf(e, fallback) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    notes,
    busy,
    error,
    add: (atSeconds, body) =>
      run("add", "No se pudo guardar la nota.", async () => {
        const note = await saveLessonNote(lessonId, atSeconds, body);
        setNotes((prev) => [...prev, note].sort(byTime));
      }),
    edit: (id, body) =>
      run(id, "No se pudo editar la nota.", async () => {
        const note = await updateLessonNote(id, body);
        setNotes((prev) => prev.map((n) => (n.id === id ? note : n)).sort(byTime));
      }),
    remove: (id) =>
      run(id, "No se pudo borrar la nota.", async () => {
        await deleteLessonNote(id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }),
  };
}

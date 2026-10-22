"use client";

import { useState } from "react";
import { formatClock } from "@/components/player/formatClock";
import type { LessonNotes } from "@/components/player/useLessonNotes";
import type { PlayerNote } from "@/lib/server/lesson-player";

const LINK_BTN =
  "font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors disabled:opacity-40 disabled:hover:text-bosque";

function NoteItem({ note, api }: { note: PlayerNote; api: LessonNotes }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  async function save() {
    if (await api.edit(note.id, draft)) setEditing(false);
  }

  return (
    <li className="border-l-2 border-linea pl-3">
      <span className="block font-display text-eyebrow tracking-wide text-miel-800 mb-1">
        {formatClock(note.atSeconds)}
      </span>
      {editing ? (
        <div>
          <textarea
            aria-label="Editar nota"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-linea bg-transparent p-2 font-body text-xs text-tinta outline-none resize-none"
          />
          <div className="mt-1 flex gap-4">
            <button type="button" onClick={save} disabled={api.busy || !draft.trim()} className={LINK_BTN}>
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(note.body);
                setEditing(false);
              }}
              className={LINK_BTN}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-body text-xs text-suave leading-relaxed">{note.body}</p>
          <div className="mt-1 flex gap-4">
            <button type="button" onClick={() => setEditing(true)} className={LINK_BTN}>
              Editar
            </button>
            <button type="button" onClick={() => api.remove(note.id)} disabled={api.busy} className={LINK_BTN}>
              Borrar
            </button>
          </div>
        </>
      )}
    </li>
  );
}

interface Props {
  isAuthenticated: boolean;
  /** Falso para la dueña y el admin: ven el player sin cursarlo (T-030). */
  canTakeNotes: boolean;
  currentTime: number;
  api: LessonNotes;
}

export default function NotesTab({ isAuthenticated, canTakeNotes, currentTime, api }: Props) {
  const [draft, setDraft] = useState("");

  if (!isAuthenticated) {
    return <p className="font-body text-xs italic text-suave">Iniciá sesión para tomar notas en esta lección.</p>;
  }
  if (!canTakeNotes) {
    return <p className="font-body text-xs italic text-suave">Las notas son de quien cursa esta lección.</p>;
  }

  async function add() {
    const body = draft.trim();
    if (!body) return;
    if (await api.add(currentTime, body)) setDraft("");
  }

  return (
    <div>
      <div className="mb-4 rounded-md border border-linea bg-papel p-3">
        <textarea
          aria-label="Nueva nota"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Anotá un momento, un símbolo, una sospecha..."
          rows={3}
          className="w-full bg-transparent font-body text-sm text-tinta placeholder:text-suave outline-none resize-none"
        />
        <div className="flex items-center justify-between border-t border-linea pt-2 mt-2">
          <span className="font-display text-eyebrow tracking-wide text-suave">⌘ {formatClock(currentTime)}</span>
          <button type="button" onClick={add} disabled={api.busy || !draft.trim()} className={LINK_BTN}>
            {api.busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {api.error && (
          <p role="alert" className="mt-2 font-body text-xs text-red-400">
            {api.error}
          </p>
        )}
      </div>
      <ul className="space-y-3">
        {api.notes.map((n) => (
          <NoteItem key={n.id} note={n} api={api} />
        ))}
      </ul>
      {api.notes.length === 0 && (
        <p className="font-body text-xs italic text-suave">Todavía no tenés notas en esta lección.</p>
      )}
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import Button from "@/components/atoms/Button";
import FormField, { FieldError } from "@/components/molecules/FormField";
import { formatClock } from "@/components/player/formatClock";
import type { LessonNotes } from "@/components/player/useLessonNotes";
import type { PlayerNote } from "@/lib/server/lesson-player";
import { cn } from "@/lib/utils/cn";

function NoteItem({ note, api }: { note: PlayerNote; api: LessonNotes }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const id = useId();
  const noteError = api.error?.scope === note.id ? api.error.message : null;

  async function save() {
    if (await api.edit(note.id, draft)) setEditing(false);
  }

  return (
    <li className="rounded-md border border-linea p-4">
      {/* El reloj es el primer span del ítem: e2e lo compara antes y después de editar. */}
      <span className="mb-2 inline-flex rounded-pill bg-miel-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-miel-800">
        {formatClock(note.atSeconds)}
      </span>
      {editing ? (
        <div>
          <FormField id={`${id}-editar`} label="Editar nota" hideLabel error={noteError}>
            {(c) => (
              <textarea {...c} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className={cn(c.className, "resize-y text-sm")} />
            )}
          </FormField>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={api.busy || !draft.trim()}>
              Guardar cambios
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(note.body);
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta">{note.body}</p>
          <div className="-ml-3.5 mt-1 flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => api.remove(note.id)} disabled={api.busy}>
              Borrar
            </Button>
          </div>
          <FieldError id={`${id}-error`} error={noteError} />
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
    return <p className="text-sm text-suave">Iniciá sesión para tomar notas en esta lección.</p>;
  }
  if (!canTakeNotes) {
    return <p className="text-sm text-suave">Las notas son de quien cursa esta lección.</p>;
  }

  async function add() {
    const body = draft.trim();
    if (!body) return;
    if (await api.add(currentTime, body)) setDraft("");
  }

  return (
    <div>
      <div className="mb-5 rounded-md bg-fondo p-4">
        <FormField id="nueva-nota" label="Nueva nota" error={api.error?.scope === "add" ? api.error.message : null}>
          {(c) => (
            <textarea
              {...c}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Anotá un momento, un símbolo, una sospecha..."
              rows={3}
              className={cn(c.className, "resize-y text-sm")}
            />
          )}
        </FormField>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm text-suave">
            Se guarda en el minuto <span className="font-semibold tabular-nums text-bosque">{formatClock(currentTime)}</span>
          </span>
          <Button size="sm" onClick={add} disabled={api.busy || !draft.trim()} aria-busy={api.busy}>
            {api.busy ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
      <ul className="space-y-3">
        {api.notes.map((n) => (
          <NoteItem key={n.id} note={n} api={api} />
        ))}
      </ul>
      {api.notes.length === 0 && <p className="text-sm text-suave">Todavía no tenés notas en esta lección.</p>}
    </div>
  );
}

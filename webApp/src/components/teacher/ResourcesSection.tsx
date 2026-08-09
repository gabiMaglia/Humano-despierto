"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonResource } from "@/lib/server/teacher";

const RESOURCE_TYPES: TeacherLessonResource["type"][] = ["pdf", "audio", "texto", "link"];

function ResourceRow({
  courseId,
  lessonId,
  resource,
}: {
  courseId: string;
  lessonId: string;
  resource: TeacherLessonResource;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateResourceAction,
    TEACHER_ACTION_INITIAL_STATE
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteResourceAction,
    TEACHER_ACTION_INITIAL_STATE
  );

  if (editing) {
    return (
      <li>
        <form action={updateAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="resourceId" value={resource.id} />
          <select
            name="type"
            defaultValue={resource.type}
            className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-1.5 font-body text-xs text-ink outline-none focus:border-lila-300/50"
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="name"
            defaultValue={resource.name}
            className="min-w-[160px] flex-1 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-1.5 font-body text-xs text-ink outline-none focus:border-lila-300/50"
          />
          <input
            name="sizeLabel"
            defaultValue={resource.sizeLabel ?? ""}
            placeholder="2.4 MB"
            className="w-24 rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-1.5 font-body text-xs text-ink outline-none focus:border-lila-300/50"
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
      <span className="rounded-pill border border-lila-300/25 px-2 py-0.5 font-display text-[10px] tracking-cosmic text-ink-soft uppercase">
        {resource.type}
      </span>
      <span className="min-w-0 flex-1 font-body text-sm text-ink">{resource.name}</span>
      {resource.sizeLabel && <span className="font-body text-xs text-ink-faint">{resource.sizeLabel}</span>}
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
        <input type="hidden" name="resourceId" value={resource.id} />
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

// c.5: el alta va SIEMPRE por Server Action con service_role (`lesson_resources` no tiene
// GRANT INSERT para el cliente, ni para la docente dueña). Esta lista nunca recibe ni
// muestra `drive_file_id`/`url` — `getTeacherLessonDetail` no los pide (ADR-003 regla A).
export default function ResourcesSection({
  courseId,
  lessonId,
  resources,
}: {
  courseId: string;
  lessonId: string;
  resources: TeacherLessonResource[];
}) {
  const [state, formAction, isPending] = useActionState(createResourceAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="cosmos-card space-y-3 p-6">
      <h3 className="font-display text-sm tracking-wide text-ink">Recursos (Drive)</h3>
      <ul className="space-y-1.5">
        {resources.map((r) => (
          <ResourceRow key={r.id} courseId={courseId} lessonId={lessonId} resource={r} />
        ))}
        {resources.length === 0 && <li className="font-body text-xs text-ink-faint">Sin recursos todavía.</li>}
      </ul>

      <form ref={formRef} action={formAction} className="grid gap-2 pt-1 sm:grid-cols-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <select
          name="type"
          defaultValue="pdf"
          className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50"
        >
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          name="name"
          required
          placeholder="Nombre (ej: Manual de tirada)"
          className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50"
        />
        <input
          name="link"
          required
          placeholder="Link de Drive"
          className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50 sm:col-span-2"
        />
        <input
          name="sizeLabel"
          placeholder="Tamaño (ej: 2.4 MB, opcional)"
          className="rounded-ritual border border-lila-300/20 bg-cosmos-0/60 px-2 py-2 font-body text-xs text-ink outline-none focus:border-lila-300/50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-ritual btn-ritual-ghost rounded-pill text-[10px] disabled:opacity-60"
        >
          {isPending ? "…" : "+ Recurso"}
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

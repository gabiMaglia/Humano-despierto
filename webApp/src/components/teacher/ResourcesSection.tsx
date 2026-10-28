"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput, PanelSelect } from "@/components/panel/PanelField";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherLessonResource } from "@/lib/server/teacher";

const RESOURCE_TYPES: TeacherLessonResource["type"][] = ["pdf", "audio", "texto", "link"];

function TypeOptions() {
  return RESOURCE_TYPES.map((t) => (
    <option key={t} value={t}>
      {t}
    </option>
  ));
}

function ResourceRow({ courseId, lessonId, resource }: { courseId: string; lessonId: string; resource: TeacherLessonResource }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateResourceAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteResourceAction, TEACHER_ACTION_INITIAL_STATE);

  if (editing) {
    return (
      <li>
        <form action={updateAction} className="flex flex-wrap items-start gap-x-3 gap-y-3 rounded-md border border-linea bg-papel p-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="resourceId" value={resource.id} />
          <PanelSelect className="w-28" label="Tipo" name="type" defaultValue={resource.type}>
            <TypeOptions />
          </PanelSelect>
          <PanelInput className="min-w-48 flex-1" label="Nombre" name="name" defaultValue={resource.name} error={updateState.error} />
          <PanelInput className="w-32" label="Tamaño" name="sizeLabel" defaultValue={resource.sizeLabel ?? ""} placeholder="2.4 MB" />
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
      <StatusChip tone="muted">{resource.type}</StatusChip>
      <span className="min-w-0 flex-1 basis-40 text-tinta [overflow-wrap:anywhere]">{resource.name}</span>
      {resource.sizeLabel && <span className="text-sm tabular-nums text-suave">{resource.sizeLabel}</span>}
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Editar
      </Button>
      <form action={deleteAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="resourceId" value={resource.id} />
        <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
          Borrar
        </Button>
      </form>
      <StatusMessage error={deleteState.error} className="w-full" />
    </li>
  );
}

// c.5: el alta va SIEMPRE por Server Action con service_role (`lesson_resources` no tiene
// GRANT INSERT para el cliente, ni para la docente dueña). Esta lista nunca recibe ni
// muestra `drive_file_id`/`url` — `getTeacherLessonDetail` no los pide (ADR-003 regla A).
export default function ResourcesSection({ courseId, lessonId, resources }: { courseId: string; lessonId: string; resources: TeacherLessonResource[] }) {
  const [state, formAction, isPending] = useActionState(createResourceAction, TEACHER_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section aria-labelledby="recursos-titulo" className="tarjeta space-y-4 p-6">
      <h2 id="recursos-titulo" className="text-xl font-semibold text-bosque">Recursos (Drive)</h2>
      <ul className="space-y-2">
        {resources.map((r) => (
          <ResourceRow key={r.id} courseId={courseId} lessonId={lessonId} resource={r} />
        ))}
        {resources.length === 0 && <li className="text-sm text-suave">Sin recursos todavía.</li>}
      </ul>

      <form ref={formRef} action={formAction} className="grid gap-x-4 gap-y-4 border-t border-linea pt-4 sm:grid-cols-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <PanelSelect label="Tipo" name="type" defaultValue="pdf">
          <TypeOptions />
        </PanelSelect>
        <PanelInput label="Nombre" name="name" required placeholder="Manual de tirada" />
        <PanelInput label="Link de Drive" name="link" required className="sm:col-span-2" error={state.error} />
        <PanelInput label="Tamaño (opcional)" name="sizeLabel" placeholder="2.4 MB" />
        <div className="sm:mt-[1.625rem]">
          <Button type="submit" variant="outline" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Agregando…" : "+ Recurso"}
          </Button>
        </div>
      </form>
    </section>
  );
}

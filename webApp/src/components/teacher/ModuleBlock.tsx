"use client";

import { useActionState, useState } from "react";
import {
  updateModuleAction,
  deleteModuleAction,
  moveModuleAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherModuleWithLessons } from "@/lib/server/teacher";
import LessonRow from "@/components/teacher/LessonRow";
import NewLessonForm from "@/components/teacher/NewLessonForm";

interface Props {
  courseId: string;
  module: TeacherModuleWithLessons;
  isFirst: boolean;
  isLast: boolean;
}

export default function ModuleBlock({ courseId, module: mod, isFirst, isLast }: Props) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateModuleAction, TEACHER_ACTION_INITIAL_STATE);
  const [moveState, moveAction, movePending] = useActionState(moveModuleAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteModuleAction, TEACHER_ACTION_INITIAL_STATE);

  return (
    <section aria-label={`Módulo ${mod.title}`} className="tarjeta p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        {editing ? (
          <form action={updateAction} className="min-w-0 flex-1 basis-72 space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="moduleId" value={mod.id} />
            <PanelInput label="Título del módulo" name="title" defaultValue={mod.title} required />
            <PanelInput label="Descripción (opcional)" name="description" defaultValue={mod.description ?? ""} />
            <StatusMessage error={updateState.error} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={updatePending}>
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="min-w-0 flex-1 basis-56">
            <h3 className="text-lg font-semibold text-bosque [overflow-wrap:anywhere]">{mod.title}</h3>
            {mod.description && <p className="text-sm text-suave">{mod.description}</p>}
          </div>
        )}

        <div className="flex flex-none flex-wrap items-center gap-1.5">
          <form action={moveAction} className="flex gap-1.5">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="moduleId" value={mod.id} />
            <Button type="submit" variant="outline" size="sm" name="direction" value="up" disabled={isFirst || movePending} className="w-10 !px-0" aria-label="Subir módulo">
              ↑
            </Button>
            <Button type="submit" variant="outline" size="sm" name="direction" value="down" disabled={isLast || movePending} className="w-10 !px-0" aria-label="Bajar módulo">
              ↓
            </Button>
          </form>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
          <form action={deleteAction}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="moduleId" value={mod.id} />
            <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
              Borrar módulo
            </Button>
          </form>
        </div>
      </div>
      <StatusMessage error={deleteState.error || moveState.error} className="mb-3" />

      <ul className="space-y-2">
        {mod.lessons.map((lesson, i) => (
          <LessonRow key={lesson.id} courseId={courseId} moduleId={mod.id} lesson={lesson} isFirst={i === 0} isLast={i === mod.lessons.length - 1} />
        ))}
        {mod.lessons.length === 0 && <li className="text-sm text-suave">Sin lecciones todavía.</li>}
      </ul>

      <NewLessonForm courseId={courseId} moduleId={mod.id} />
    </section>
  );
}

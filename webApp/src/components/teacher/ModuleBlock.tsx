"use client";

import { useActionState, useState } from "react";
import {
  updateModuleAction,
  deleteModuleAction,
  moveModuleAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";
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
  const [updateState, updateAction, updatePending] = useActionState(
    updateModuleAction,
    TEACHER_ACTION_INITIAL_STATE
  );
  const [moveState, moveAction, movePending] = useActionState(moveModuleAction, TEACHER_ACTION_INITIAL_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteModuleAction,
    TEACHER_ACTION_INITIAL_STATE
  );

  return (
    <section className="tarjeta p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        {editing ? (
          <form action={updateAction} className="flex-1 space-y-2">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="moduleId" value={mod.id} />
            <input
              name="title"
              defaultValue={mod.title}
              required
              className="w-full rounded-md border border-linea bg-papel px-3 py-2 font-display text-sm text-tinta outline-none focus:border-linea"
            />
            <input
              name="description"
              defaultValue={mod.description ?? ""}
              placeholder="Descripción (opcional)"
              className="w-full rounded-md border border-linea bg-papel px-3 py-2 font-body text-xs text-tinta outline-none focus:border-linea"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={updatePending}
                className="btn btn-primary text-[10px] disabled:opacity-60"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="font-body text-xs text-suave hover:text-tinta"
              >
                Cancelar
              </button>
              {updateState.error && <p className="font-body text-xs text-error">{updateState.error}</p>}
            </div>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base tracking-wide text-tinta">{mod.title}</h3>
            {mod.description && <p className="font-body text-xs text-suave">{mod.description}</p>}
          </div>
        )}

        <div className="flex flex-none items-center gap-1.5">
          <form action={moveAction} className="flex gap-1">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="moduleId" value={mod.id} />
            <button
              type="submit"
              name="direction"
              value="up"
              disabled={isFirst || movePending}
              className="btn btn-outline px-2 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Subir módulo"
            >
              ↑
            </button>
            <button
              type="submit"
              name="direction"
              value="down"
              disabled={isLast || movePending}
              className="btn btn-outline px-2 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Bajar módulo"
            >
              ↓
            </button>
          </form>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-outline px-2 py-1 text-[10px]"
            >
              Editar
            </button>
          )}
          <form action={deleteAction}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="moduleId" value={mod.id} />
            <button
              type="submit"
              disabled={deletePending}
              className="btn btn-outline px-2 py-1 text-[10px] text-error disabled:cursor-not-allowed disabled:opacity-40"
            >
              Borrar módulo
            </button>
          </form>
        </div>
      </div>
      {(deleteState.error || moveState.error) && (
        <p className="mb-2 font-body text-xs text-error">{deleteState.error || moveState.error}</p>
      )}

      <ul className="space-y-1.5">
        {mod.lessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            courseId={courseId}
            moduleId={mod.id}
            lesson={lesson}
            isFirst={i === 0}
            isLast={i === mod.lessons.length - 1}
          />
        ))}
        {mod.lessons.length === 0 && (
          <li className="font-body text-xs text-suave">Sin lecciones todavía.</li>
        )}
      </ul>

      <NewLessonForm courseId={courseId} moduleId={mod.id} />
    </section>
  );
}

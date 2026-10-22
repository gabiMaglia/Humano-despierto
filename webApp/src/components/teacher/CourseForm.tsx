"use client";

import { useActionState } from "react";
import { createCourseAction, updateCourseAction } from "@/app/(app)/panel/docente/actions";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherCourseFields } from "@/lib/server/teacher";

const inputClass =
  "w-full rounded-md border border-linea bg-papel px-3 py-2.5 font-body text-sm text-tinta outline-none transition-colors focus:border-linea focus:bg-fondo";
const labelClass = "mb-1.5 block font-display text-eyebrow tracking-wide text-suave";

interface Props {
  course?: TeacherCourseFields;
}

export default function CourseForm({ course }: Props) {
  const action = course ? updateCourseAction : createCourseAction;
  const [state, formAction, isPending] = useActionState(action, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta grid gap-4 p-6 md:grid-cols-2">
      {course && <input type="hidden" name="courseId" value={course.id} />}

      <div>
        <label className={labelClass}>Slug (URL)</label>
        <input
          name="slug"
          defaultValue={course?.slug}
          placeholder="tarot-iniciatico"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Título</label>
        <input name="title" defaultValue={course?.title} required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Título en énfasis (opcional)</label>
        <input name="titleEm" defaultValue={course?.titleEm ?? ""} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Subtítulo</label>
        <input name="subtitle" defaultValue={course?.subtitle ?? ""} className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Introducción</label>
        <textarea
          name="intro"
          defaultValue={course?.intro ?? ""}
          rows={3}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Disciplina</label>
        <input
          name="discipline"
          defaultValue={course?.discipline}
          placeholder="Tarot"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Nivel</label>
        <input
          name="level"
          defaultValue={course?.level}
          placeholder="Iniciación"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Precio</label>
        <input
          name="price"
          defaultValue={course ? (course.priceCents / 100).toFixed(2) : ""}
          placeholder="240"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Moneda</label>
        <input
          name="currency"
          defaultValue={course?.currency ?? "ARS"}
          maxLength={3}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Numeral romano (opcional)</label>
        <input name="romanNum" defaultValue={course?.romanNum ?? ""} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Glifo lunar (opcional)</label>
        <input name="moonGlyph" defaultValue={course?.moonGlyph ?? ""} className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Lo que va a aprender (un ítem por línea)</label>
        <textarea
          name="learningObjectives"
          defaultValue={(course?.learningObjectives ?? []).join("\n")}
          rows={4}
          placeholder="Leer una tirada de tres cartas con criterio propio"
          className={inputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Antes de empezar — requisitos (un ítem por línea)</label>
        <textarea
          name="prerequisites"
          defaultValue={(course?.prerequisites ?? []).join("\n")}
          rows={3}
          placeholder="Ninguno: se empieza de cero"
          className={inputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Sobre este curso (descripción larga)</label>
        <textarea
          name="description"
          defaultValue={course?.description ?? ""}
          rows={8}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Idioma (2 letras)</label>
        <input name="language" defaultValue={course?.language ?? "es"} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Video de adelanto — id de YouTube (opcional)</label>
        <input
          name="promoVideoId"
          defaultValue={course?.promoVideoId ?? ""}
          placeholder="dQw4w9WgXcQ"
          className={inputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Qué incluye (un ítem por línea)</label>
        <textarea
          name="includes"
          defaultValue={(course?.includes ?? []).join("\n")}
          rows={4}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : course ? "Guardar cambios" : "Crear curso"}
        </button>
        {state.error && (
          <p role="alert" className="font-body text-xs text-red-400">
            {state.error}
          </p>
        )}
        {state.success && <p className="font-body text-xs text-miel-800">{state.success}</p>}
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createCourseAction, updateCourseAction } from "@/app/(app)/panel/docente/actions";
import Button from "@/components/atoms/Button";
import { PanelInput, PanelTextarea } from "@/components/panel/PanelField";
import StatusMessage from "@/components/panel/StatusMessage";
import { TEACHER_ACTION_INITIAL_STATE } from "@/lib/teacher/action-state";
import type { TeacherCourseFields } from "@/lib/server/teacher";

interface Props {
  course?: TeacherCourseFields;
}

export default function CourseForm({ course }: Props) {
  const action = course ? updateCourseAction : createCourseAction;
  const [state, formAction, isPending] = useActionState(action, TEACHER_ACTION_INITIAL_STATE);

  return (
    <form action={formAction} className="tarjeta grid gap-5 p-6 md:grid-cols-2">
      {course && <input type="hidden" name="courseId" value={course.id} />}
      {/* D-65: el numeral romano ya no se pide (la acción no lo exige), pero `update` lo reescribe
          con lo que llegue: el valor que un curso ya tiene viaja oculto para no borrarlo. */}
      <input type="hidden" name="romanNum" value={course?.romanNum ?? ""} />

      <PanelInput label="Slug (URL)" name="slug" defaultValue={course?.slug} placeholder="tarot-iniciatico" required />
      <PanelInput label="Título" name="title" defaultValue={course?.title} required />
      <PanelInput label="Título en énfasis (opcional)" name="titleEm" defaultValue={course?.titleEm ?? ""} />
      <PanelInput label="Subtítulo" name="subtitle" defaultValue={course?.subtitle ?? ""} />
      <PanelTextarea label="Introducción" name="intro" defaultValue={course?.intro ?? ""} rows={3} className="md:col-span-2" />
      <PanelInput label="Disciplina" name="discipline" defaultValue={course?.discipline} placeholder="Tarot" required />
      <PanelInput label="Nivel" name="level" defaultValue={course?.level} placeholder="Iniciación" required />
      <PanelInput
        label="Precio"
        name="price"
        inputMode="decimal"
        defaultValue={course ? (course.priceCents / 100).toFixed(2) : ""}
        placeholder="240"
        required
        className="[&_input]:tabular-nums"
      />
      <PanelInput label="Moneda" name="currency" defaultValue={course?.currency ?? "ARS"} maxLength={3} required />
      <PanelInput label="Glifo lunar (opcional)" name="moonGlyph" defaultValue={course?.moonGlyph ?? ""} />
      <PanelInput label="Idioma (2 letras)" name="language" defaultValue={course?.language ?? "es"} />
      <PanelTextarea
        label="Lo que va a aprender"
        hint="Un ítem por línea."
        name="learningObjectives"
        defaultValue={(course?.learningObjectives ?? []).join("\n")}
        rows={4}
        placeholder="Leer una tirada de tres cartas con criterio propio"
        className="md:col-span-2"
      />
      <PanelTextarea
        label="Antes de empezar: requisitos"
        hint="Un ítem por línea."
        name="prerequisites"
        defaultValue={(course?.prerequisites ?? []).join("\n")}
        rows={3}
        placeholder="Ninguno: se empieza de cero"
        className="md:col-span-2"
      />
      <PanelTextarea label="Sobre este curso (descripción larga)" name="description" defaultValue={course?.description ?? ""} rows={8} className="md:col-span-2" />
      <PanelInput
        label="Video de adelanto (opcional)"
        hint="El id de YouTube, no el link entero."
        name="promoVideoId"
        defaultValue={course?.promoVideoId ?? ""}
        placeholder="dQw4w9WgXcQ"
        className="md:col-span-2"
      />
      <PanelTextarea label="Qué incluye" hint="Un ítem por línea." name="includes" defaultValue={(course?.includes ?? []).join("\n")} rows={4} className="md:col-span-2" />

      <div className="flex flex-col gap-3 md:col-span-2">
        <StatusMessage error={state.error} success={state.success} />
        <div>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Guardando…" : course ? "Guardar cambios" : "Crear curso"}
          </Button>
        </div>
      </div>
    </form>
  );
}

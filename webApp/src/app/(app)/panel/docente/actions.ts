"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireTeacher, assertOwnsCourse } from "@/lib/server/teacher";
import {
  courseFormSchema,
  priceToCents,
  includesToArray,
  firstIssueMessage,
} from "@/lib/validation/teacher";
import type { TeacherActionState } from "@/lib/teacher/action-state";

function readCourseForm(formData: FormData) {
  return courseFormSchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    titleEm: String(formData.get("titleEm") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    intro: String(formData.get("intro") ?? ""),
    discipline: String(formData.get("discipline") ?? ""),
    level: String(formData.get("level") ?? ""),
    price: String(formData.get("price") ?? ""),
    currency: String(formData.get("currency") ?? "ARS"),
    romanNum: String(formData.get("romanNum") ?? ""),
    moonGlyph: String(formData.get("moonGlyph") ?? ""),
    includes: String(formData.get("includes") ?? ""),
  });
}

// Criterio 2: crear curso. `teacher_id` viaja en el INSERT (0003 lo permite) pero
// `courses_insert_own` (RLS) exige `teacher_id = auth.uid()`, y `guard_courses_insert`
// (0006) rechaza cualquier `status` que no sea 'draft' — nace en borrador sin que este
// código tenga que declararlo dos veces.
export async function createCourseAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const parsed = readCourseForm(formData);
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error), success: null };
  }
  const v = parsed.data;

  let newCourseId: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .insert({
        slug: v.slug,
        title: v.title,
        title_em: v.titleEm || null,
        subtitle: v.subtitle || null,
        intro: v.intro || null,
        discipline: v.discipline,
        level: v.level,
        price_cents: priceToCents(v.price),
        currency: v.currency,
        roman_num: v.romanNum || null,
        moon_glyph: v.moonGlyph || null,
        includes: includesToArray(v.includes),
        teacher_id: teacher.id,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "Ya existe un curso con ese slug. Elegí otro.", success: null };
      }
      return { error: `No se pudo crear el curso: ${error.message}`, success: null };
    }
    newCourseId = data.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el curso.", success: null };
  }

  revalidatePath("/panel/docente");
  redirect(`/panel/docente/cursos/${newCourseId}`);
}

export async function updateCourseAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return { error: "Falta el curso.", success: null };

  const parsed = readCourseForm(formData);
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };
  const v = parsed.data;

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("courses")
      .update({
        slug: v.slug,
        title: v.title,
        title_em: v.titleEm || null,
        subtitle: v.subtitle || null,
        intro: v.intro || null,
        discipline: v.discipline,
        level: v.level,
        price_cents: priceToCents(v.price),
        currency: v.currency,
        roman_num: v.romanNum || null,
        moon_glyph: v.moonGlyph || null,
        includes: includesToArray(v.includes),
      })
      .eq("id", courseId);

    if (error) {
      if (error.code === "23505") return { error: "Ya existe un curso con ese slug.", success: null };
      return { error: `No se pudo guardar: ${error.message}`, success: null };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar el curso.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  revalidatePath("/panel/docente");
  return { error: null, success: "Curso actualizado." };
}

export async function deleteCourseAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return { error: "Falta el curso.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    // RLS `courses_delete_own_draft` (0004) solo deja borrar en 'draft': un curso publicado
    // no se borra desde acá (tendría inscripciones colgando) — el error de Postgres ya lo dice.
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      return {
        error: `No se pudo borrar el curso (¿está publicado?): ${error.message}`,
        success: null,
      };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo borrar el curso.", success: null };
  }

  revalidatePath("/panel/docente");
  redirect("/panel/docente");
}

// Criterio 7: publicar/despublicar un curso propio, con la validación de que no
// se publica un curso sin al menos un módulo con una lección. `courses.status` está
// fuera del grant/guard del cliente (0003 + 0005 `guard_courses`): esto SIEMPRE es
// service_role, tras verificar acá que quien pide el cambio es la dueña.
export async function setCoursePublishedAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  if (!courseId || (nextStatus !== "published" && nextStatus !== "draft")) {
    return { error: "Datos inválidos.", success: null };
  }

  try {
    await assertOwnsCourse(courseId, teacher.id);

    if (nextStatus === "published") {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId);
      if (error) return { error: `No se pudo validar el curso: ${error.message}`, success: null };
      if (!count) {
        return {
          error: "No se puede publicar: el curso necesita al menos un módulo con una lección.",
          success: null,
        };
      }
    }

    const service = createServiceRoleClient();
    const { error: updateError } = await service
      .from("courses")
      .update({ status: nextStatus })
      .eq("id", courseId);
    if (updateError) {
      return { error: `No se pudo actualizar el estado: ${updateError.message}`, success: null };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo actualizar el curso.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  revalidatePath("/panel/docente");
  revalidatePath("/cursos");
  return {
    error: null,
    success: nextStatus === "published" ? "Curso publicado." : "Curso pasado a borrador.",
  };
}

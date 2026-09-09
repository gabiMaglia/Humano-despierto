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
    description: String(formData.get("description") ?? ""),
    learningObjectives: String(formData.get("learningObjectives") ?? ""),
    prerequisites: String(formData.get("prerequisites") ?? ""),
    language: String(formData.get("language") ?? "es"),
    promoVideoId: String(formData.get("promoVideoId") ?? ""),
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
        description: v.description || null,
        learning_objectives: includesToArray(v.learningObjectives),
        prerequisites: includesToArray(v.prerequisites),
        language: v.language,
        promo_video_id: v.promoVideoId || null,
        teacher_id: teacher.id,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "Ya existe un curso con ese slug. Elegí otro.", success: null };
      }
      // El 42501 lo levanta `courses_locator_guard` (0023), no Zod: la coincidencia EXACTA de
      // ADR-009 necesita CONSULTAR `lessons`, asi que ningun schema del cliente puede replicarla.
      // Sin esta traduccion la docente ve un error crudo del motor.
      if (error.code === "42501") {
        return { error: "Alguno de los campos públicos del curso contiene el identificador de un video o de un archivo de una lección. Ese dato es de contenido pago y no puede aparecer en la ficha, que se lee sin inscripción.", success: null };
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
        description: v.description || null,
        learning_objectives: includesToArray(v.learningObjectives),
        prerequisites: includesToArray(v.prerequisites),
        language: v.language,
        promo_video_id: v.promoVideoId || null,
      })
      .eq("id", courseId);

    if (error) {
      if (error.code === "23505") return { error: "Ya existe un curso con ese slug.", success: null };
      // El 42501 lo levanta `courses_locator_guard` (0023), no Zod: la coincidencia EXACTA de
      // ADR-009 necesita CONSULTAR `lessons`, asi que ningun schema del cliente puede replicarla.
      // Sin esta traduccion la docente ve un error crudo del motor.
      if (error.code === "42501") {
        return { error: "Alguno de los campos públicos del curso contiene el identificador de un video o de un archivo de una lección. Ese dato es de contenido pago y no puede aparecer en la ficha, que se lee sin inscripción.", success: null };
      }

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

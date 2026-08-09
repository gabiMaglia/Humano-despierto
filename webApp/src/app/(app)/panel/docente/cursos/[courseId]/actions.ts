"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireTeacher, assertOwnsCourse } from "@/lib/server/teacher";
import { resolveYoutubeVideo } from "@/lib/server/youtube";
import {
  moduleFormSchema,
  lessonFormSchema,
  videoUrlSchema,
  chapterFormSchema,
  timestampToSeconds,
  resourceFormSchema,
  firstIssueMessage,
} from "@/lib/validation/teacher";
import type { TeacherActionState } from "@/lib/teacher/action-state";

const TEMP_POSITION = 999999;

function extractDriveFileId(link: string): string | null {
  const byPath = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (byPath) return byPath[1];
  const byQuery = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (byQuery) return byQuery[1];
  return null;
}

// ==================================================================== módulos

export async function createModuleAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return { error: "Falta el curso.", success: null };

  const parsed = moduleFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();

    const { data: existing, error: countError } = await supabase
      .from("course_modules")
      .select("position")
      .eq("course_id", courseId)
      .order("position", { ascending: false })
      .limit(1);
    if (countError) return { error: `No se pudo calcular el orden: ${countError.message}`, success: null };
    const nextPos = (existing?.[0]?.position ?? 0) + 1;

    const { error: insertError } = await supabase.from("course_modules").insert({
      course_id: courseId,
      position: nextPos,
      title: parsed.data.title,
      description: parsed.data.description || null,
    });
    if (insertError) return { error: `No se pudo crear el módulo: ${insertError.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el módulo.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: "Módulo agregado." };
}

export async function updateModuleAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!courseId || !moduleId) return { error: "Datos inválidos.", success: null };

  const parsed = moduleFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("course_modules")
      .update({ title: parsed.data.title, description: parsed.data.description || null })
      .eq("id", moduleId)
      .eq("course_id", courseId);
    if (error) return { error: `No se pudo guardar el módulo: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar el módulo.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: "Módulo actualizado." };
}

export async function deleteModuleAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!courseId || !moduleId) return { error: "Datos inválidos.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    // Cascada por FK (0001): borra también sus lecciones, capítulos y recursos.
    const { error } = await supabase.from("course_modules").delete().eq("id", moduleId).eq("course_id", courseId);
    if (error) return { error: `No se pudo borrar el módulo: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo borrar el módulo.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: "Módulo borrado." };
}

// Reordenar (criterio 3): `UNIQUE(course_id, position) DEFERRABLE` no sirve como target de
// `ON CONFLICT` (anotado en ADR-005/0001 para este ticket) — en vez de una migración nueva
// (fuera de alcance, los ADRs son del arquitecto), se resuelve con la técnica clásica de
// swap en 3 pasos: A → posición temporal fuera de rango, B → la posición vieja de A,
// A → la posición vieja de B. Cada paso es su propia sentencia/transacción vía PostgREST,
// y como el valor temporal nunca choca con ningún `position` real, ningún paso intermedio
// viola el UNIQUE.
export async function moveModuleAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!courseId || !moduleId || (direction !== "up" && direction !== "down")) {
    return { error: "Datos inválidos.", success: null };
  }

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { data: modules, error } = await supabase
      .from("course_modules")
      .select("id, position")
      .eq("course_id", courseId)
      .order("position");
    if (error) throw new Error(error.message);

    const list = modules ?? [];
    const idx = list.findIndex((m) => m.id === moduleId);
    if (idx === -1) return { error: "Módulo no encontrado.", success: null };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return { error: null, success: null };

    const a = list[idx];
    const b = list[swapIdx];
    const { error: e1 } = await supabase.from("course_modules").update({ position: TEMP_POSITION }).eq("id", a.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("course_modules").update({ position: a.position }).eq("id", b.id);
    if (e2) throw new Error(e2.message);
    const { error: e3 } = await supabase.from("course_modules").update({ position: b.position }).eq("id", a.id);
    if (e3) throw new Error(e3.message);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo reordenar.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: null };
}

// ==================================================================== lecciones

export async function createLessonAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!courseId || !moduleId) return { error: "Datos inválidos.", success: null };

  const parsed = lessonFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPreview: formData.get("isPreview") === "on",
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();

    const { data: moduleRow, error: moduleError } = await supabase
      .from("course_modules")
      .select("id")
      .eq("id", moduleId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (moduleError) return { error: `No se pudo verificar el módulo: ${moduleError.message}`, success: null };
    if (!moduleRow) return { error: "Ese módulo no pertenece a este curso.", success: null };

    const { data: existing, error: countError } = await supabase
      .from("lessons")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1);
    if (countError) return { error: `No se pudo calcular el orden: ${countError.message}`, success: null };
    const nextPos = (existing?.[0]?.position ?? 0) + 1;

    // `video_id`, `duration_seconds`, `is_published` NO van acá: no están en el grant de
    // INSERT (0003) y `guard_lessons` (0006) los rechaza igual si alguien los nombrara —
    // c.4b/restricción de servidor. La lección nace como esqueleto; el video se pega después.
    const { error: insertError } = await supabase.from("lessons").insert({
      course_id: courseId,
      module_id: moduleId,
      position: nextPos,
      title: parsed.data.title,
      description: parsed.data.description || null,
      video_provider: "youtube",
      is_preview: parsed.data.isPreview,
    });
    if (insertError) return { error: `No se pudo crear la lección: ${insertError.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la lección.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: "Lección agregada — ahora pegale la URL de YouTube." };
}

export async function updateLessonAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!courseId || !lessonId) return { error: "Datos inválidos.", success: null };

  const parsed = lessonFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPreview: formData.get("isPreview") === "on",
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("lessons")
      .update({
        title: parsed.data.title,
        description: parsed.data.description || null,
        is_preview: parsed.data.isPreview,
      })
      .eq("id", lessonId)
      .eq("course_id", courseId);
    if (error) return { error: `No se pudo guardar la lección: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar la lección.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Lección actualizada." };
}

export async function deleteLessonAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!courseId || !lessonId) return { error: "Datos inválidos.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId).eq("course_id", courseId);
    if (error) return { error: `No se pudo borrar la lección: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo borrar la lección.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  redirect(`/panel/docente/cursos/${courseId}`);
}

export async function moveLessonAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!courseId || !moduleId || !lessonId || (direction !== "up" && direction !== "down")) {
    return { error: "Datos inválidos.", success: null };
  }

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id, position")
      .eq("module_id", moduleId)
      .order("position");
    if (error) throw new Error(error.message);

    const list = lessons ?? [];
    const idx = list.findIndex((l) => l.id === lessonId);
    if (idx === -1) return { error: "Lección no encontrada.", success: null };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return { error: null, success: null };

    const a = list[idx];
    const b = list[swapIdx];
    const { error: e1 } = await supabase.from("lessons").update({ position: TEMP_POSITION }).eq("id", a.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("lessons").update({ position: a.position }).eq("id", b.id);
    if (e2) throw new Error(e2.message);
    const { error: e3 } = await supabase.from("lessons").update({ position: b.position }).eq("id", a.id);
    if (e3) throw new Error(e3.message);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo reordenar.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: null };
}

// ==================================================================== video (c.4 / c.4b)

export async function attachLessonVideoAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!courseId || !lessonId) return { error: "Datos inválidos.", success: null };

  const parsed = videoUrlSchema.safeParse({ url: String(formData.get("url") ?? "") });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { data: lessonRow, error: lessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (lessonError) return { error: `No se pudo verificar la lección: ${lessonError.message}`, success: null };
    if (!lessonRow) return { error: "Esa lección no pertenece a este curso.", success: null };

    // c.4b: los 5 casos (URL inválida, privado/borrado/inexistente, cuota agotada, duración
    // 0) vuelven cada uno con SU mensaje — nunca se guarda nada cuando `ok` es falso.
    const result = await resolveYoutubeVideo(parsed.data.url);
    if (!result.ok) {
      return { error: result.message, success: null };
    }

    // Único punto de esta acción que usa service_role — recién acá, con la titularidad del
    // curso y la pertenencia de la lección ya verificadas arriba con el cliente de sesión
    // (ADR-001: dos clientes, nunca mezclados; el llamador verifica antes de invocar).
    const service = createServiceRoleClient();
    const { error: updateError } = await service
      .from("lessons")
      .update({ video_id: result.videoId, duration_seconds: result.durationSeconds })
      .eq("id", lessonId)
      .eq("course_id", courseId);
    if (updateError) {
      return { error: `No se pudo guardar el video: ${updateError.message}`, success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
    revalidatePath(`/panel/docente/cursos/${courseId}`);
    const mins = Math.floor(result.durationSeconds / 60);
    const secs = result.durationSeconds % 60;
    return {
      error: null,
      success: `Video cargado — duración ${mins}:${String(secs).padStart(2, "0")}.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo cargar el video.", success: null };
  }
}

// Necesario para que el catálogo/player (T-004/T-006) lleguen a mostrar la lección: sin
// esto, `is_published` se queda en `false` para siempre y ninguna alumna la ve, aunque el
// curso esté publicado (`getCourseBySlug`/`getLessonPlayerData` filtran por `is_published`).
// No es un criterio explícito del ticket, pero `guard_lessons`/`lessons_published_needs_video`
// (0006) dejan la puerta lista para exactamente esto — sin ella el criterio 4b queda a medio
// camino: la duración se resuelve pero la lección nunca se puede mostrar.
export async function setLessonPublishedAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const nextPublished = String(formData.get("nextPublished") ?? "") === "true";
  if (!courseId || !lessonId) return { error: "Datos inválidos.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const service = createServiceRoleClient();
    const { error } = await service
      .from("lessons")
      .update({ is_published: nextPublished })
      .eq("id", lessonId)
      .eq("course_id", courseId);
    if (error) {
      if (error.code === "23514") {
        return {
          error: "No se puede publicar: cargá un video con duración válida primero.",
          success: null,
        };
      }
      return { error: `No se pudo actualizar la lección: ${error.message}`, success: null };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo actualizar la lección.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  revalidatePath(`/panel/docente/cursos/${courseId}`);
  return { error: null, success: nextPublished ? "Lección publicada." : "Lección oculta." };
}

// ==================================================================== capítulos

export async function createChapterAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!courseId || !lessonId) return { error: "Datos inválidos.", success: null };

  const parsed = chapterFormSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    timestamp: String(formData.get("timestamp") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };
  const startSeconds = timestampToSeconds(parsed.data.timestamp);
  if (Number.isNaN(startSeconds)) return { error: "Tiempo de inicio inválido.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();

    const { data: lessonRow, error: lessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (lessonError) return { error: `No se pudo verificar la lección: ${lessonError.message}`, success: null };
    if (!lessonRow) return { error: "Esa lección no pertenece a este curso.", success: null };

    const { data: existing, error: countError } = await supabase
      .from("lesson_chapters")
      .select("position")
      .eq("lesson_id", lessonId)
      .order("position", { ascending: false })
      .limit(1);
    if (countError) return { error: `No se pudo calcular el orden: ${countError.message}`, success: null };
    const nextPos = (existing?.[0]?.position ?? 0) + 1;

    // A diferencia de `lesson_resources`, `lesson_chapters` SÍ tiene GRANT INSERT para
    // `authenticated` (0003) — la fila entera es contenido pago (ADR-003 regla B) pero no
    // contiene ningún localizador, así que el cliente de sesión alcanza.
    const { error: insertError } = await supabase.from("lesson_chapters").insert({
      course_id: courseId,
      lesson_id: lessonId,
      position: nextPos,
      start_seconds: startSeconds,
      label: parsed.data.label,
    });
    if (insertError) return { error: `No se pudo crear el capítulo: ${insertError.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el capítulo.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Capítulo agregado." };
}

export async function updateChapterAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const chapterId = String(formData.get("chapterId") ?? "");
  if (!courseId || !lessonId || !chapterId) return { error: "Datos inválidos.", success: null };

  const parsed = chapterFormSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    timestamp: String(formData.get("timestamp") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };
  const startSeconds = timestampToSeconds(parsed.data.timestamp);
  if (Number.isNaN(startSeconds)) return { error: "Tiempo de inicio inválido.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("lesson_chapters")
      .update({ start_seconds: startSeconds, label: parsed.data.label })
      .eq("id", chapterId)
      .eq("lesson_id", lessonId);
    if (error) return { error: `No se pudo actualizar el capítulo: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo actualizar el capítulo.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Capítulo actualizado." };
}

export async function deleteChapterAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const chapterId = String(formData.get("chapterId") ?? "");
  if (!courseId || !lessonId || !chapterId) return { error: "Datos inválidos.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase.from("lesson_chapters").delete().eq("id", chapterId).eq("lesson_id", lessonId);
    if (error) return { error: `No se pudo borrar el capítulo: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo borrar el capítulo.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Capítulo borrado." };
}

// ==================================================================== recursos (c.5)

export async function createResourceAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!courseId || !lessonId) return { error: "Datos inválidos.", success: null };

  const parsed = resourceFormSchema.safeParse({
    type: String(formData.get("type") ?? ""),
    name: String(formData.get("name") ?? ""),
    link: String(formData.get("link") ?? ""),
    sizeLabel: String(formData.get("sizeLabel") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };
  const v = parsed.data;

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();

    const { data: lessonRow, error: lessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (lessonError) return { error: `No se pudo verificar la lección: ${lessonError.message}`, success: null };
    if (!lessonRow) return { error: "Esa lección no pertenece a este curso.", success: null };

    const { data: existing, error: countError } = await supabase
      .from("lesson_resources")
      .select("position")
      .eq("lesson_id", lessonId)
      .order("position", { ascending: false })
      .limit(1);
    if (countError) return { error: `No se pudo calcular el orden: ${countError.message}`, success: null };
    const nextPos = (existing?.[0]?.position ?? 0) + 1;

    // `lesson_resources` no tiene GRANT INSERT para `authenticated` (0003_privileges.sql,
    // "Sin INSERT para el cliente"): el alta es SIEMPRE Server Action con service_role, aun
    // para la docente dueña — restricción explícita del ticket (punto 3), no una elección de
    // este archivo. `name`/`sizeLabel` ya pasaron el guard anti-URL de Zod arriba.
    const service = createServiceRoleClient();
    const { error: insertError } = await service.from("lesson_resources").insert({
      course_id: courseId,
      lesson_id: lessonId,
      position: nextPos,
      type: v.type,
      name: v.name,
      drive_file_id: extractDriveFileId(v.link),
      url: v.link,
      size_label: v.sizeLabel || null,
    });
    if (insertError) return { error: `No se pudo crear el recurso: ${insertError.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el recurso.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Recurso agregado." };
}

// Solo `position/type/name/size_label` — nunca `drive_file_id`/`url` (ADR-003 regla A: la
// docente no los ve ni los edita después de cargados). Va por el cliente de SESIÓN: están en
// el grant de UPDATE (0003) y RLS ya acota a curso propio, pero el guard anti-URL de Zod
// sigue siendo obligatorio acá — es el punto exacto que el ticket marca como riesgo (punto 4):
// `name`/`size_label` son escribibles por la docente vía UPDATE normal, así que la única
// barrera contra "Manual — drive.google.com/…" es esta validación de app, no el esquema.
export async function updateResourceAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const resourceId = String(formData.get("resourceId") ?? "");
  if (!courseId || !lessonId || !resourceId) return { error: "Datos inválidos.", success: null };

  const parsed = resourceFormSchema.omit({ link: true }).safeParse({
    type: String(formData.get("type") ?? ""),
    name: String(formData.get("name") ?? ""),
    sizeLabel: String(formData.get("sizeLabel") ?? ""),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: null };
  const v = parsed.data;

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("lesson_resources")
      .update({ type: v.type, name: v.name, size_label: v.sizeLabel || null })
      .eq("id", resourceId)
      .eq("lesson_id", lessonId);
    if (error) return { error: `No se pudo actualizar el recurso: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo actualizar el recurso.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Recurso actualizado." };
}

export async function deleteResourceAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const resourceId = String(formData.get("resourceId") ?? "");
  if (!courseId || !lessonId || !resourceId) return { error: "Datos inválidos.", success: null };

  try {
    await assertOwnsCourse(courseId, teacher.id);
    const supabase = await createClient();
    const { error } = await supabase.from("lesson_resources").delete().eq("id", resourceId).eq("lesson_id", lessonId);
    if (error) return { error: `No se pudo borrar el recurso: ${error.message}`, success: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo borrar el recurso.", success: null };
  }

  revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
  return { error: null, success: "Recurso borrado." };
}

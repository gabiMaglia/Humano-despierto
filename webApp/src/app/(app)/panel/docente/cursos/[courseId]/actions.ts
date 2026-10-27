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
  firstIssue,
} from "@/lib/validation/teacher";
import type { TeacherActionState } from "@/lib/teacher/action-state";
import { UPLOADS_BUCKET, uploadAsServer } from "@/lib/server/uploads";
import { buildCoverPath, checkCoverBytes, IMAGE_MIME, isUuid } from "@/lib/validation/image";
import { after } from "next/server";
import { announcementSchema, idSchema, reasonSchema } from "@/lib/announcements/validation";
// La escritura vive en un .mjs para que la suite de la base la ejecute tal cual (T-031).
import {
  crearBorrador,
  editarBorrador,
  publicar,
  retirar,
  traducirErrorAnuncio,
  SIN_FILAS,
} from "@/lib/announcements/write.mjs";
import { notifyAnnouncementPublished } from "@/lib/server/mail/notify";
import { log } from "@/lib/server/log";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

const TEMP_POSITION = 999999;

/**
 * Traduce a castellano los dos errores que levanta la defensa de ADR-009, que si no llegan crudos
 * del motor a la pantalla de la docente.
 *
 * `42501` lo levanta `guard_locator_exacto` (0025) — la mitad de COINCIDENCIA EXACTA. Zod no puede
 * replicarla: necesita CONSULTAR `lessons` para saber si un id de 11 caracteres es un video real
 * del catálogo, y ningún schema del cliente puede hacer eso. `23514` es el CHECK de forma, que Zod
 * sí espeja — llega acá sólo por el camino que no pasa por el formulario.
 */
function traducirErrorDeLocalizador(
  error: { code?: string; message: string },
  fallback: string,
): string {
  if (error.code === "42501") {
    return "El texto contiene el identificador de un video o de un archivo de una lección. Ese dato es de contenido pago y no puede aparecer en un campo que se lee sin inscripción.";
  }
  if (error.code === "23514") {
    return "El texto no puede contener links.";
  }
  return fallback;
}

function extractDriveFileId(link: string): string | null {
  const byPath = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (byPath) return byPath[1];
  const byQuery = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (byQuery) return byQuery[1];
  return null;
}

// ==================================================================== módulos

export const createModuleAction = withRateLimit(
  "createModuleAction",
  async function createModuleAction(
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
      if (insertError)
        return { error: traducirErrorDeLocalizador(insertError, `No se pudo crear el módulo: ${insertError.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear el módulo.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}`);
    return { error: null, success: "Módulo agregado." };
  },
  limitedState,
);

export const updateModuleAction = withRateLimit(
  "updateModuleAction",
  async function updateModuleAction(
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
      if (error)
        return { error: traducirErrorDeLocalizador(error, `No se pudo guardar el módulo: ${error.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo guardar el módulo.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}`);
    return { error: null, success: "Módulo actualizado." };
  },
  limitedState,
);

export const deleteModuleAction = withRateLimit(
  "deleteModuleAction",
  async function deleteModuleAction(
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
  },
  limitedState,
);

// Reordenar (criterio 3): `UNIQUE(course_id, position) DEFERRABLE` no sirve como target de
// `ON CONFLICT` (anotado en ADR-005/0001 para este ticket) — en vez de una migración nueva
// (fuera de alcance, los ADRs son del arquitecto), se resuelve con la técnica clásica de
// swap en 3 pasos: A → posición temporal fuera de rango, B → la posición vieja de A,
// A → la posición vieja de B. Cada paso es su propia sentencia/transacción vía PostgREST,
// y como el valor temporal nunca choca con ningún `position` real, ningún paso intermedio
// viola el UNIQUE.
export const moveModuleAction = withRateLimit(
  "moveModuleAction",
  async function moveModuleAction(
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
  },
  limitedState,
);

// ==================================================================== lecciones

export const createLessonAction = withRateLimit(
  "createLessonAction",
  async function createLessonAction(
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
    if (!parsed.success) {
      const { field, message } = firstIssue(parsed.error);
      return { error: message, success: null, ...(field ? { field } : {}) };
    }

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
      if (insertError)
        return { error: traducirErrorDeLocalizador(insertError, `No se pudo crear la lección: ${insertError.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear la lección.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}`);
    return { error: null, success: "Lección agregada — ahora pegale la URL de YouTube." };
  },
  limitedState,
);

export const updateLessonAction = withRateLimit(
  "updateLessonAction",
  async function updateLessonAction(
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
    if (!parsed.success) {
      const { field, message } = firstIssue(parsed.error);
      return { error: message, success: null, ...(field ? { field } : {}) };
    }

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
      if (error)
        return { error: traducirErrorDeLocalizador(error, `No se pudo guardar la lección: ${error.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo guardar la lección.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}`);
    revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
    return { error: null, success: "Lección actualizada." };
  },
  limitedState,
);

export const deleteLessonAction = withRateLimit(
  "deleteLessonAction",
  async function deleteLessonAction(
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
  },
  limitedState,
);

export const moveLessonAction = withRateLimit(
  "moveLessonAction",
  async function moveLessonAction(
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
  },
  limitedState,
);

// ==================================================================== video (c.4 / c.4b)

export const attachLessonVideoAction = withRateLimit(
  "attachLessonVideoAction",
  async function attachLessonVideoAction(
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
  },
  limitedState,
);

// Necesario para que el catálogo/player (T-004/T-006) lleguen a mostrar la lección: sin
// esto, `is_published` se queda en `false` para siempre y ninguna alumna la ve, aunque el
// curso esté publicado (`getCourseBySlug`/`getLessonPlayerData` filtran por `is_published`).
// No es un criterio explícito del ticket, pero `guard_lessons`/`lessons_published_needs_video`
// (0006) dejan la puerta lista para exactamente esto — sin ella el criterio 4b queda a medio
// camino: la duración se resuelve pero la lección nunca se puede mostrar.
export const setLessonPublishedAction = withRateLimit(
  "setLessonPublishedAction",
  async function setLessonPublishedAction(
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
  },
  limitedState,
);

// ==================================================================== capítulos

export const createChapterAction = withRateLimit(
  "createChapterAction",
  async function createChapterAction(
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
      if (insertError)
        return { error: traducirErrorDeLocalizador(insertError, `No se pudo crear el capítulo: ${insertError.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear el capítulo.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
    return { error: null, success: "Capítulo agregado." };
  },
  limitedState,
);

export const updateChapterAction = withRateLimit(
  "updateChapterAction",
  async function updateChapterAction(
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
      if (error)
        return { error: traducirErrorDeLocalizador(error, `No se pudo actualizar el capítulo: ${error.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo actualizar el capítulo.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
    return { error: null, success: "Capítulo actualizado." };
  },
  limitedState,
);

export const deleteChapterAction = withRateLimit(
  "deleteChapterAction",
  async function deleteChapterAction(
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
  },
  limitedState,
);

// ==================================================================== recursos (c.5)

export const createResourceAction = withRateLimit(
  "createResourceAction",
  async function createResourceAction(
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
      if (insertError)
        return { error: traducirErrorDeLocalizador(insertError, `No se pudo crear el recurso: ${insertError.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear el recurso.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
    return { error: null, success: "Recurso agregado." };
  },
  limitedState,
);

// Solo `position/type/name/size_label` — nunca `drive_file_id`/`url` (ADR-003 regla A: la
// docente no los ve ni los edita después de cargados). Va por el cliente de SESIÓN: están en
// el grant de UPDATE (0003) y RLS ya acota a curso propio, pero el guard anti-URL de Zod
// sigue siendo obligatorio acá — es el punto exacto que el ticket marca como riesgo (punto 4):
// `name`/`size_label` son escribibles por la docente vía UPDATE normal, así que la única
// barrera contra "Manual — drive.google.com/…" es esta validación de app, no el esquema.
export const updateResourceAction = withRateLimit(
  "updateResourceAction",
  async function updateResourceAction(
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
      if (error)
        return { error: traducirErrorDeLocalizador(error, `No se pudo actualizar el recurso: ${error.message}`), success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo actualizar el recurso.", success: null };
    }

    revalidatePath(`/panel/docente/cursos/${courseId}/lecciones/${lessonId}`);
    return { error: null, success: "Recurso actualizado." };
  },
  limitedState,
);

export const deleteResourceAction = withRateLimit(
  "deleteResourceAction",
  async function deleteResourceAction(
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
  },
  limitedState,
);

// ==================================================================== portada (T-047)

function revalidateCover(courseId: string) {
  revalidatePath(`/panel/docente/cursos/${courseId}`);
  revalidatePath("/cursos");
  revalidatePath("/cursos/[slug]", "page");
  revalidatePath("/");
}

export const uploadCourseCoverAction = withRateLimit(
  "uploadCourseCoverAction",
  async function uploadCourseCoverAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const courseId = String(formData.get("courseId") ?? "");
    if (!isUuid(courseId)) return { error: "Falta el curso.", success: null };
    const file = formData.get("cover");
    if (!(file instanceof File)) return { error: "Elegí una imagen.", success: null };

    // Se valida antes de abrir sesion: un archivo invalido no tiene por que tocar Supabase (c.2).
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkCoverBytes(bytes);
    if (!check.ok) return { error: check.error, success: null };

    const teacher = await requireTeacher();
    try {
      await assertOwnsCourse(courseId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("courses").select("cover_path").eq("id", courseId).single();
      const path = buildCoverPath(courseId, crypto.randomUUID(), check.kind);

      // D-34: sube service_role, nunca la sesion (sin policy de INSERT en `uploads`). Lo que ata el
      // objeto al curso es lo de arriba: bytes validados, titularidad verificada, path armado aca
      // con un courseId que ya paso `isUuid`. El UPDATE de abajo va con la sesion y el CHECK de 0030.
      const { error: uploadError } = await uploadAsServer(path, bytes, IMAGE_MIME[check.kind]);
      if (uploadError) return { error: "No se pudo subir la portada.", success: null };

      const { error: updateError } = await supabase.from("courses").update({ cover_path: path }).eq("id", courseId);
      if (updateError) {
        await createServiceRoleClient().storage.from(UPLOADS_BUCKET).remove([path]);
        return { error: "No se pudo guardar la portada en el curso.", success: null };
      }

      // Si falla queda un objeto sin referencia; no justifica revertir una portada que ya se ve bien.
      if (current?.cover_path) {
        const { error: removeError } = await supabase.storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
        if (removeError) log.error("cover_storage_orphan", { reason: "replaced", path: current.cover_path, message: removeError.message });
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo subir la portada.", success: null };
    }

    revalidateCover(courseId);
    return { error: null, success: "Portada actualizada." };
  },
  limitedState,
);

export const removeCourseCoverAction = withRateLimit(
  "removeCourseCoverAction",
  async function removeCourseCoverAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const courseId = String(formData.get("courseId") ?? "");
    if (!isUuid(courseId)) return { error: "Falta el curso.", success: null };

    const teacher = await requireTeacher();
    try {
      await assertOwnsCourse(courseId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("courses").select("cover_path").eq("id", courseId).single();
      if (!current?.cover_path) return { error: null, success: "El curso no tenía portada." };

      const { error } = await supabase.from("courses").update({ cover_path: null }).eq("id", courseId);
      if (error) return { error: "No se pudo quitar la portada.", success: null };

      // Con la sesion: la policy `uploads_covers_delete_own` alcanza y no hace falta saltear RLS.
      const { error: removeError } = await supabase.storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
      if (removeError) log.error("cover_storage_orphan", { reason: "removed", path: current.cover_path, message: removeError.message });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo quitar la portada.", success: null };
    }

    revalidateCover(courseId);
    return { error: null, success: "Portada quitada." };
  },
  limitedState,
);

// ==================================================================== T-031 · anuncios
// Finos (patrón de circulo/actions.ts): validan forma, verifican titularidad, escriben y traducen.
// Quién puede qué lo deciden RLS, grants y los triggers de 0034.

const GENERIC_ANNOUNCEMENT_ERROR = "No se pudo guardar el anuncio. Probá de nuevo.";

function announcementFail(error: string): TeacherActionState {
  return { error, success: null };
}

function validIds(...values: string[]): boolean {
  return values.every((v) => idSchema.safeParse(v).success);
}

function revalidateAnnouncements(courseId: string): void {
  revalidatePath("/panel/docente/anuncios");
  revalidatePath(`/panel/docente/cursos/${courseId}`);
}

export const saveAnnouncementDraft = withRateLimit(
  "saveAnnouncementDraft",
  async function saveAnnouncementDraft(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const courseId = String(formData.get("courseId") ?? "");
    const announcementId = String(formData.get("announcementId") ?? "");
    if (!validIds(courseId) || (announcementId && !validIds(announcementId))) return announcementFail("Datos inválidos.");
    const parsed = announcementSchema.safeParse({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    if (!parsed.success) return announcementFail(parsed.error.issues[0]?.message ?? "Revisá el anuncio.");

    const teacher = await requireTeacher();
    try {
      await assertOwnsCourse(courseId, teacher.id);
      const supabase = await createClient();
      const { error } = announcementId
        ? await editarBorrador(supabase, { id: announcementId, courseId, ...parsed.data })
        : await crearBorrador(supabase, { courseId, authorId: teacher.id, ...parsed.data });
      if (error) {
        log.error("announcement_write_rejected", { pg_code: error.code, message: error.message });
        return announcementFail(traducirErrorAnuncio(error, GENERIC_ANNOUNCEMENT_ERROR));
      }
    } catch (err) {
      return announcementFail(err instanceof Error ? err.message : GENERIC_ANNOUNCEMENT_ERROR);
    }

    revalidateAnnouncements(courseId);
    return { error: null, success: "Borrador guardado." };
  },
  limitedState,
);

export const publishAnnouncement = withRateLimit(
  "publishAnnouncement",
  async function publishAnnouncement(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const courseId = String(formData.get("courseId") ?? "");
    const announcementId = String(formData.get("announcementId") ?? "");
    if (!validIds(courseId, announcementId)) return announcementFail("Datos inválidos.");

    const teacher = await requireTeacher();
    let publishedId: string;
    try {
      // R-4: la titularidad se verifica con la SESIÓN; recién después se usa service_role.
      await assertOwnsCourse(courseId, teacher.id);
      const { error, id } = await publicar(createServiceRoleClient(), { id: announcementId, courseId });
      if (error || !id) {
        if (error && error.code !== SIN_FILAS) log.error("announcement_publish_failed", { pg_code: error.code, message: error.message });
        return announcementFail(traducirErrorAnuncio(error, GENERIC_ANNOUNCEMENT_ERROR));
      }
      publishedId = id;
    } catch (err) {
      return announcementFail(err instanceof Error ? err.message : GENERIC_ANNOUNCEMENT_ERROR);
    }

    // `after` y no `await`: contra un SMTP mudo cada envío cuesta hasta 15 s y el botón no espera
    // (decisión 2). El id es el que devolvió la base: es el scope de mail_log.
    after(() => notifyAnnouncementPublished({ announcementId: publishedId }));

    revalidateAnnouncements(courseId);
    revalidatePath("/panel");
    revalidatePath("/cursos/[slug]", "page");
    return { error: null, success: "Anuncio publicado. El mail sale a cada inscripta activa." };
  },
  limitedState,
);

export const withdrawAnnouncement = withRateLimit(
  "withdrawAnnouncement",
  async function withdrawAnnouncement(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const courseId = String(formData.get("courseId") ?? "");
    const announcementId = String(formData.get("announcementId") ?? "");
    if (!validIds(courseId, announcementId)) return announcementFail("Datos inválidos.");
    const parsed = reasonSchema.safeParse({ reason: String(formData.get("reason") ?? "") });
    if (!parsed.success) return announcementFail(parsed.error.issues[0]?.message ?? "Retirar exige un motivo.");

    const teacher = await requireTeacher();
    try {
      const supabase = await createClient();
      const { error } = await retirar(supabase, { id: announcementId, moderatorId: teacher.id, reason: parsed.data.reason });
      if (error) {
        log.error("announcement_withdraw_rejected", { pg_code: error.code, message: error.message });
        return announcementFail(traducirErrorAnuncio(error, "No se pudo retirar el anuncio."));
      }
    } catch (err) {
      return announcementFail(err instanceof Error ? err.message : "No se pudo retirar el anuncio.");
    }

    revalidateAnnouncements(courseId);
    revalidatePath("/panel");
    revalidatePath("/cursos/[slug]", "page");
    return { error: null, success: "Anuncio retirado." };
  },
  limitedState,
);

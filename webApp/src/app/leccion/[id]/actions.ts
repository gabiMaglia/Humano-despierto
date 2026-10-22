"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureCertificate } from "@/lib/server/certificates";
import { closingHref } from "@/lib/player/navigation";
import { notifyCourseCompleted } from "@/lib/server/mail/notify";
import { revalidatePath } from "next/cache";
import { answerSchema, idSchema, moderationSchema, questionSchema } from "@/lib/lesson-qa/validation";
import type { QaActionState } from "@/lib/lesson-qa/action-state";
// La escritura vive en un .mjs para que la suite de la base la ejecute tal cual (T-030).
import {
  destacar,
  marcarResuelta,
  moderar,
  preguntar,
  quitarVoto,
  responder,
  traducirErrorQa,
  votar,
} from "@/lib/lesson-qa/write.mjs";
import { log } from "@/lib/server/log";

/**
 * Destino del cierre de la última lección. Se resuelve al terminar el video y no al renderizar:
 * el certificado recién existe cuando el flush del último tramo cruzó el 90 %. Idempotente y
 * sin efectos nuevos (el que lo emite es `ensureCertificate`, ya verificado server-side).
 */
export async function resolveClosingHref(courseId: string): Promise<string> {
  try {
    return closingHref(await ensureCertificate(courseId));
  } catch (err) {
    log.error("player_certificate_unresolved", { err });
    return closingHref(null);
  }
}

export interface ProgressResult {
  secondsWatched: number;
  completed: boolean;
  completedAt: string | null;
}

/**
 * Mail 2/4 (T-020): dispara solo la primera vez que ESTE alumno completa ESTE curso. Se
 * chequea si ya existía certificado ANTES de pedirlo — `ensureCertificate` es idempotente
 * (T-018: devuelve el código exista o no la fila), así que sin este chequeo previo se mandaría
 * el mail en cada guardado de progreso posterior de cualquier lección ya completa del curso.
 * Nunca bloquea ni puede tirar: cualquier falla queda en el log, el progreso ya se guardó arriba.
 */
async function maybeNotifyCourseCompleted(
  userId: string,
  courseId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("certificates")
      .select("code")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    // Ya había certificado, o no se pudo confirmar que NO lo había — en ambos casos no se
    // reintenta el mail: mejor un falso negativo ocasional que mandarlo de más.
    if (existingError || existing) return;

    const code = await ensureCertificate(courseId);
    if (!code) return; // esta lección lo completó todo salvo que a ensureCertificate,
    // que vuelve a verificar server-side (ADR-007), le falte alguna otra lección publicada.

    const { data: course } = await supabase
      .from("courses")
      .select("title, slug")
      .eq("id", courseId)
      .maybeSingle();

    await notifyCourseCompleted({
      userId,
      courseTitle: course?.title ?? "tu curso",
      courseSlug: course?.slug ?? null,
      certificateCode: code,
    });
  } catch (err) {
    log.error("mail_course_completed_failed", { err });
  }
}

/**
 * Persiste `seconds_watched` (T-006 c.5, con throttle del lado del cliente — este action no
 * throttlea nada, sólo escribe lo que le llega). `completed`/`completed_at` NO se mandan: son
 * columnas derivadas (ADR-007) que calcula un trigger contra `lessons.duration_seconds`; lo que
 * se devuelve acá es lo que el guard efectivamente calculó, no lo que se pidió.
 *
 * UPDATE primero, INSERT si no había fila — nunca `upsert()`: el grant de UPDATE de
 * `lesson_progress` (0003_privileges.sql) sólo cubre `seconds_watched`/`last_seen_at`, y el
 * `ON CONFLICT DO UPDATE` que genera un upsert de PostgREST intenta tocar TODAS las columnas
 * del payload (incluidas `user_id`/`course_id`/`lesson_id`), lo que exigiría UPDATE sobre
 * columnas que el cliente no tiene — 42501 aunque el valor no cambie.
 */
export async function saveLessonProgress(
  lessonId: string,
  secondsWatched: number
): Promise<ProgressResult> {
  if (!Number.isFinite(secondsWatched) || secondsWatched < 0) {
    throw new Error("seconds_watched inválido.");
  }
  const seconds = Math.floor(secondsWatched);
  const nowIso = new Date().toISOString();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: updated, error: updateError } = await supabase
    .from("lesson_progress")
    .update({ seconds_watched: seconds, last_seen_at: nowIso })
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .select("seconds_watched, completed, completed_at, course_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`No se pudo guardar el progreso: ${updateError.message}`);
  }
  if (updated) {
    if (updated.completed) {
      await maybeNotifyCourseCompleted(user.id, updated.course_id);
    }
    return {
      secondsWatched: updated.seconds_watched,
      completed: updated.completed,
      completedAt: updated.completed_at,
    };
  }

  // No había fila: primera escritura de progreso de este usuario en esta lección.
  // course_id lo resuelve el servidor (no se confía en lo que mande el cliente): sólo las
  // columnas leíbles por el grant de 0003_privileges.sql.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonError || !lesson) {
    throw new Error("Lección no encontrada.");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("lesson_progress")
    .insert({
      user_id: user.id,
      course_id: lesson.course_id,
      lesson_id: lessonId,
      seconds_watched: seconds,
      last_seen_at: nowIso,
    })
    .select("seconds_watched, completed, completed_at")
    .single();

  if (insertError) {
    // Carrera real: dos pestañas escribiendo el progreso inicial a la vez. La segunda pierde
    // el INSERT (23505, unique lesson_progress_user_lesson_key) y cae a UPDATE.
    if (insertError.code === "23505") {
      const { data: retried, error: retryError } = await supabase
        .from("lesson_progress")
        .update({ seconds_watched: seconds, last_seen_at: nowIso })
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .select("seconds_watched, completed, completed_at")
        .single();
      if (retryError) {
        throw new Error(`No se pudo guardar el progreso: ${retryError.message}`);
      }
      if (retried.completed) {
        await maybeNotifyCourseCompleted(user.id, lesson.course_id);
      }
      return {
        secondsWatched: retried.seconds_watched,
        completed: retried.completed,
        completedAt: retried.completed_at,
      };
    }
    throw new Error(`No se pudo iniciar el progreso: ${insertError.message}`);
  }

  if (inserted.completed) {
    await maybeNotifyCourseCompleted(user.id, lesson.course_id);
  }
  return {
    secondsWatched: inserted.seconds_watched,
    completed: inserted.completed,
    completedAt: inserted.completed_at,
  };
}

export interface NoteResult {
  id: string;
  atSeconds: number;
  body: string;
  createdAt: string;
}

/** Nota propia (T-006 c.7): RLS la ata a `user_id = auth.uid()` en lectura y escritura. */
export async function saveLessonNote(lessonId: string, atSeconds: number, body: string): Promise<NoteResult> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("La nota no puede estar vacía.");
  if (!Number.isFinite(atSeconds) || atSeconds < 0) {
    throw new Error("at_seconds inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonError || !lesson) {
    throw new Error("Lección no encontrada.");
  }

  const { data, error } = await supabase
    .from("lesson_notes")
    .insert({
      user_id: user.id,
      course_id: lesson.course_id,
      lesson_id: lessonId,
      at_seconds: Math.floor(atSeconds),
      body: trimmed,
    })
    .select("id, at_seconds, body, created_at")
    .single();

  if (error) {
    throw new Error(`No se pudo guardar la nota: ${error.message}`);
  }

  return { id: data.id, atSeconds: data.at_seconds, body: data.body, createdAt: data.created_at };
}

// La RLS (`user_id = auth.uid()`) es el control; el `.eq("user_id")` es defensa en profundidad.
// Una nota ajena no da 403: PostgREST filtra en silencio y devuelve 0 filas, por eso 0 filas es error.
const NOTE_NOT_FOUND = "No se encontró la nota.";

/** Edita el texto de una nota propia. `at_seconds` no está en el payload: se conserva. */
export async function updateLessonNote(noteId: string, body: string): Promise<NoteResult> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("La nota no puede estar vacía.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data, error } = await supabase
    .from("lesson_notes")
    .update({ body: trimmed })
    .eq("id", noteId)
    .eq("user_id", user.id)
    .select("id, at_seconds, body, created_at");
  if (error) throw new Error(`No se pudo editar la nota: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error(NOTE_NOT_FOUND);

  return { id: row.id, atSeconds: row.at_seconds, body: row.body, createdAt: row.created_at };
}

export async function deleteLessonNote(noteId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data, error } = await supabase
    .from("lesson_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw new Error(`No se pudo borrar la nota: ${error.message}`);
  if (!data?.length) throw new Error(NOTE_NOT_FOUND);
}

// ---------------------------------------------------------------------------------- T-030 · Q&A
// Finos a propósito (patrón de circulo/actions.ts): validan forma, escriben con el cliente de
// sesión y traducen el SQLSTATE. Quién puede qué lo deciden RLS y los guards de la migración.

const GENERIC_QA_ERROR = "No se pudo completar. Probá de nuevo.";

function qaFail(error: string): QaActionState {
  return { error, success: null };
}

async function qaSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, uid: data.user?.id ?? null };
}

function ids(...values: unknown[]): boolean {
  return values.every((v) => idSchema.safeParse(v).success);
}

function done(lessonId: string, success: string): QaActionState {
  revalidatePath(`/leccion/${lessonId}`);
  return { error: null, success };
}

function translated(error: { code?: string | null; message: string }, duplicado: string): QaActionState {
  log.error("qa_write_rejected", { pg_code: error.code, message: error.message });
  return qaFail(traducirErrorQa(error, { duplicado, fallback: GENERIC_QA_ERROR }));
}

export async function askQuestion(lessonId: string, _prev: QaActionState, formData: FormData): Promise<QaActionState> {
  if (!ids(lessonId)) return qaFail("La lección no es válida.");
  const parsed = questionSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) return qaFail(parsed.error.issues[0]?.message ?? "Revisá la pregunta.");

  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = await preguntar(supabase, { lessonId, authorId: uid, ...parsed.data });
  if (error) return translated(error, "Esa pregunta ya existe.");
  return done(lessonId, "Pregunta publicada.");
}

export async function answerQuestion(
  lessonId: string,
  questionId: string,
  _prev: QaActionState,
  formData: FormData,
): Promise<QaActionState> {
  if (!ids(lessonId, questionId)) return qaFail("La pregunta no es válida.");
  const parsed = answerSchema.safeParse({ body: String(formData.get("body") ?? "") });
  if (!parsed.success) return qaFail(parsed.error.issues[0]?.message ?? "Revisá la respuesta.");

  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = await responder(supabase, { questionId, authorId: uid, body: parsed.data.body });
  if (error) return translated(error, "Esa respuesta ya existe.");
  return done(lessonId, "Respuesta publicada.");
}

export async function voteQuestion(lessonId: string, questionId: string, vote: boolean): Promise<QaActionState> {
  if (!ids(lessonId, questionId) || typeof vote !== "boolean") return qaFail("La pregunta no es válida.");
  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = vote
    ? await votar(supabase, { questionId, userId: uid })
    : await quitarVoto(supabase, { questionId, userId: uid });
  if (error) return translated(error, "Ya votaste esta pregunta.");
  return done(lessonId, vote ? "Voto sumado." : "Voto quitado.");
}

export async function resolveQuestion(lessonId: string, questionId: string, resolved: boolean): Promise<QaActionState> {
  if (!ids(lessonId, questionId) || typeof resolved !== "boolean") return qaFail("La pregunta no es válida.");
  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = await marcarResuelta(supabase, { questionId, resolved });
  if (error) return translated(error, GENERIC_QA_ERROR);
  return done(lessonId, resolved ? "Marcada como resuelta." : "Pregunta reabierta.");
}

export async function featureAnswer(lessonId: string, answerId: string, featured: boolean): Promise<QaActionState> {
  if (!ids(lessonId, answerId) || typeof featured !== "boolean") return qaFail("La respuesta no es válida.");
  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = await destacar(supabase, { answerId, featured });
  if (error) return translated(error, "Esta pregunta ya tiene una respuesta destacada. Quitala primero.");
  return done(lessonId, featured ? "Respuesta destacada." : "Destacado quitado.");
}

async function moderate(
  tabla: "lesson_questions" | "lesson_answers",
  lessonId: string,
  id: string,
  formData: FormData,
): Promise<QaActionState> {
  if (!ids(lessonId, id)) return qaFail("El mensaje no es válido.");
  const parsed = moderationSchema.safeParse({ reason: String(formData.get("reason") ?? "") });
  if (!parsed.success) return qaFail(parsed.error.issues[0]?.message ?? "Borrar exige un motivo.");

  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = await moderar(supabase, { tabla, id, moderatorId: uid, reason: parsed.data.reason });
  if (error) return translated(error, GENERIC_QA_ERROR);
  return done(lessonId, "Mensaje borrado.");
}

export async function moderateQuestion(
  lessonId: string,
  questionId: string,
  _prev: QaActionState,
  formData: FormData,
): Promise<QaActionState> {
  return moderate("lesson_questions", lessonId, questionId, formData);
}

export async function moderateAnswer(
  lessonId: string,
  answerId: string,
  _prev: QaActionState,
  formData: FormData,
): Promise<QaActionState> {
  return moderate("lesson_answers", lessonId, answerId, formData);
}

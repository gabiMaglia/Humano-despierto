"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProgressResult {
  secondsWatched: number;
  completed: boolean;
  completedAt: string | null;
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
    .select("seconds_watched, completed, completed_at")
    .maybeSingle();

  if (updateError) {
    throw new Error(`No se pudo guardar el progreso: ${updateError.message}`);
  }
  if (updated) {
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
      return {
        secondsWatched: retried.seconds_watched,
        completed: retried.completed,
        completedAt: retried.completed_at,
      };
    }
    throw new Error(`No se pudo iniciar el progreso: ${insertError.message}`);
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

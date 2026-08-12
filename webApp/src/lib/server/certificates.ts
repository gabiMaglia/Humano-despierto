import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// T-018 · Certificado verificable (ADR-007, ADR-009, migración 0013).
//
// Dos funciones, dos audiencias:
//   · `getPublicCertificate` — la página /certificado/<código>, SIN sesión. El código es la
//     ÚNICA barrera (criterio 2): `certificates` no tiene ningún grant de SELECT para `anon`
//     (0013), así que esto usa service_role a propósito — no hay policy de RLS que comparar
//     contra un `auth.uid()` que acá no existe. Selecciona EXACTAMENTE los cuatro campos
//     públicos (criterio 4): nada de `id`/`user_id`/`course_id`/`code` sale de esta función.
//   · `ensureCertificate` — la emisión, para el alumno logueado. Verifica elegibilidad con el
//     cliente de SESIÓN (lee solo lo que el propio alumno ya puede leer) y recién con eso
//     resuelto pide el INSERT con service_role — `certificates` no tiene grant de INSERT para
//     ningún rol de cliente. El guard de la migración 0013 vuelve a verificar todo server-side y
//     sobreescribe nombre/curso/docente/fecha: esta función NO los declara, aunque quisiera.

export interface PublicCertificate {
  studentName: string;
  courseTitle: string;
  teacherName: string;
  completedAt: string;
}

const CODE_SHAPE = /^[0-9a-f]{32}$/;

/**
 * Lee el certificado público por su código. `null` si no existe — misma respuesta para
 * "no existe" y para "código con forma imposible", nada que confirmar desde afuera.
 */
export async function getPublicCertificate(code: string): Promise<PublicCertificate | null> {
  if (!CODE_SHAPE.test(code)) return null;

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("certificates")
    .select("student_name, course_title, teacher_name, completed_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el certificado: ${error.message}`);
  }
  if (!data) return null;

  return {
    studentName: data.student_name,
    courseTitle: data.course_title,
    teacherName: data.teacher_name,
    completedAt: data.completed_at,
  };
}

/**
 * Emite (o recupera) el certificado del usuario logueado para `courseId`, solo si ya completó
 * TODAS las lecciones publicadas del curso (ADR-007: derivado, nunca declarado — acá tampoco).
 * `null` sin sesión, sin lecciones publicadas, o si todavía no completó el curso.
 */
export async function ensureCertificate(courseId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing, error: existingError } = await supabase
    .from("certificates")
    .select("code")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existingError) {
    throw new Error(`No se pudo leer el certificado: ${existingError.message}`);
  }
  if (existing) return existing.code;

  const { data: publishedLessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);
  if (lessonsError) {
    throw new Error(`No se pudieron leer las lecciones del curso: ${lessonsError.message}`);
  }
  const publishedIds = (publishedLessons ?? []).map((l) => l.id as string);
  if (publishedIds.length === 0) return null;

  const { count: completedCount, error: progressError } = await supabase
    .from("lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("completed", true)
    .in("lesson_id", publishedIds);
  if (progressError) {
    throw new Error(`No se pudo leer el progreso del curso: ${progressError.message}`);
  }
  if ((completedCount ?? 0) < publishedIds.length) return null;

  // Recién acá service_role: la elegibilidad ya se verificó con lo que el propio alumno puede
  // leer. El guard de 0013 la vuelve a verificar de todos modos (no confía en este chequeo) y
  // sobreescribe los cuatro campos públicos y el código — este INSERT no los manda.
  const service = createServiceRoleClient();
  const { data: inserted, error: insertError } = await service
    .from("certificates")
    .insert({ user_id: user.id, course_id: courseId })
    .select("code")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // Carrera real: dos pestañas piden el certificado a la vez. La segunda pierde el INSERT
      // (unique_violation sobre `certificates_user_course_key`) y recupera el de la primera.
      const { data: retried, error: retryError } = await service
        .from("certificates")
        .select("code")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .single();
      if (retryError) {
        throw new Error(`No se pudo recuperar el certificado: ${retryError.message}`);
      }
      return retried.code;
    }
    throw new Error(`No se pudo emitir el certificado: ${insertError.message}`);
  }

  return inserted.code;
}

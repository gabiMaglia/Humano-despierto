"use server";

import type { RateLimitFields } from "@/lib/rate-limit/core";
import { revalidatePath } from "next/cache";
import { revalidateLanding } from "@/lib/server/landing-cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { noLocator } from "@/lib/validation/teacher";
// La lógica de escritura vive en un .mjs para que la suite de la base la ejecute tal cual
// (ver `lib/reviews/write.mjs`).
import {
  guardarResena,
  reportarResena,
  responderResena,
  traducirErrorReporte,
  traducirErrorResena,
} from "@/lib/reviews/write.mjs";
import {
  ENROLLMENT_COPY,
  duplicateEnrollmentMessage,
  translateEnrollmentError,
  type EnrollmentRequestState,
} from "@/lib/enrollment/messages";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

export interface ReviewActionState extends RateLimitFields {
  error: string | null;
  success: string | null;
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Elegí una puntuación.").max(5),
  // Opcional a proposito: se puede puntuar sin escribir (criterio 2).
  body: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "reseña"),
});

export const saveReviewAction = withRateLimit(
  "saveReviewAction",
  async function saveReviewAction(
    courseId: string,
    slug: string,
    _prev: ReviewActionState,
    formData: FormData,
  ): Promise<ReviewActionState> {
    const parsed = reviewSchema.safeParse({
      rating: formData.get("rating"),
      body: String(formData.get("body") ?? ""),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Revisá los datos.", success: null };
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return { error: "Necesitás iniciar sesión.", success: null };

    // RLS decide si puede (inscripción activa); acá solo se elige insert-o-update y se traduce.
    const { error, created } = await guardarResena(supabase, {
      courseId,
      userId: uid,
      rating: parsed.data.rating,
      body: parsed.data.body || null,
    });

    if (error) {
      return { error: traducirErrorResena(error, `No se pudo guardar la reseña: ${error.message}`), success: null };
    }

    revalidatePath(`/cursos/${slug}`);
    // Una reseña de 5 con texto es candidata a testimonio de la portada.
    revalidateLanding();
    return { error: null, success: created ? "Gracias por dejar tu reseña." : "Reseña actualizada." };
  },
  limitedState,
);

export const respondReviewAction = withRateLimit(
  "respondReviewAction",
  async function respondReviewAction(
    reviewId: string,
    slug: string,
    _prev: ReviewActionState,
    formData: FormData,
  ): Promise<ReviewActionState> {
    const parsed = noLocator(z.string().trim().min(1, "La respuesta no puede estar vacía.").max(2000), "respuesta")
      .safeParse(String(formData.get("response") ?? ""));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Revisá el texto.", success: null };
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return { error: "Necesitás iniciar sesión.", success: null };

    // Solo el texto: la firma (`responded_by`/`responded_at`) la pone el guard (0026). Una guía
    // que no es dueña afecta 0 filas y eso vuelve como error, no como éxito.
    const { error } = await responderResena(supabase, { reviewId, response: parsed.data });

    if (error) {
      return { error: traducirErrorResena(error, `No se pudo responder: ${error.message}`), success: null };
    }

    revalidatePath(`/cursos/${slug}`);
    return { error: null, success: "Respuesta publicada." };
  },
  limitedState,
);

const reviewIdSchema = z.uuid();
const reportReasonSchema = z
  .string()
  .trim()
  .min(1, "Contá brevemente por qué la reportás.")
  .max(1000, "El motivo no puede superar los 1000 caracteres.");

/** T-037 · la guía dueña (o el admin) reporta una reseña. El que reporta sale de la sesión. */
export const reportReviewAction = withRateLimit(
  "reportReviewAction",
  async function reportReviewAction(
    reviewId: string,
    slug: string,
    _prev: ReviewActionState,
    formData: FormData,
  ): Promise<ReviewActionState> {
    if (!reviewIdSchema.safeParse(reviewId).success) return { error: "Reseña inválida.", success: null };
    const parsed = reportReasonSchema.safeParse(String(formData.get("reason") ?? ""));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Revisá el motivo.", success: null };
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return { error: "Necesitás iniciar sesión.", success: null };

    // Quién puede reportar lo decide RLS (`can_report_review`): la guía dueña o el admin.
    const { error } = await reportarResena(supabase, { reviewId, reporterId: uid, reason: parsed.data });
    if (error) {
      return { error: traducirErrorReporte(error, "No se pudo enviar el reporte. Probá de nuevo."), success: null };
    }

    revalidatePath(`/cursos/${slug}`);
    revalidatePath("/panel/admin/resenas");
    revalidatePath("/panel/docente");
    return { error: null, success: "Reporte enviado. Lo revisa el equipo de administración." };
  },
  limitedState,
);

/**
 * T-043 · la alumna pide un curso. Cliente de SESIÓN: quién puede lo deciden grant + policy +
 * guard (0029), no esta función. El curso se resuelve acá desde el slug de la URL y la alumna
 * desde la sesión: el formulario no manda ningún id, así que no hay nada que falsificar en él.
 * `status` no se manda: la base lo fuerza a `requested`.
 */
export const requestEnrollmentAction = withRateLimit(
  "requestEnrollmentAction",
  async function requestEnrollmentAction(
    slug: string,
    _prev: EnrollmentRequestState,
    _formData: FormData,
  ): Promise<EnrollmentRequestState> {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return { error: ENROLLMENT_COPY.needsLogin, success: null };

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (courseError) return { error: ENROLLMENT_COPY.generic, success: null };
    if (!course) return { error: ENROLLMENT_COPY.courseUnavailable, success: null };

    const { error } = await supabase.from("enrollments").insert({ user_id: uid, course_id: course.id });
    if (error?.code === "23505") {
      // `enrollments_read` sólo devuelve la fila propia; si la lectura falla, el texto genérico de duplicado.
      const { data: existing } = await supabase
        .from("enrollments")
        .select("status")
        .eq("course_id", course.id)
        .eq("user_id", uid)
        .maybeSingle();
      return { error: duplicateEnrollmentMessage(existing?.status), success: null };
    }
    if (error) return { error: translateEnrollmentError(error), success: null };

    revalidatePath(`/cursos/${slug}`);
    revalidatePath("/panel");
    return { error: null, success: ENROLLMENT_COPY.requested };
  },
  limitedState,
);

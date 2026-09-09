"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { noLocator } from "@/lib/validation/teacher";

export interface ReviewActionState {
  error: string | null;
  success: string | null;
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Elegí una puntuación.").max(5),
  // Opcional a proposito: se puede puntuar sin escribir (criterio 2).
  body: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "reseña"),
});

/** El 42501 lo levanta `guard_course_reviews` (0024) y el 23514 el CHECK de forma: la
 *  coincidencia EXACTA de ADR-009 necesita consultar `lessons` y ningún schema del cliente puede
 *  replicarla. Sin traducir, la alumna ve un error crudo del motor. */
function traducir(code: string | undefined, fallback: string): string {
  if (code === "42501") {
    return "El texto contiene el identificador de un video o archivo del curso. Ese dato es de contenido pago y no puede aparecer en una reseña, que se lee sin inscripción.";
  }
  if (code === "23514") {
    return "El texto no puede contener links.";
  }
  if (code === "23505") {
    return "Ya dejaste una reseña de este curso. Editá la que tenés.";
  }
  return fallback;
}

export async function saveReviewAction(
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

  // `upsert` sobre la clave (user_id, course_id): una sola reseña por alumna y curso, y editarla
  // es el mismo camino que crearla. Quien NO tiene inscripcion activa rebota en RLS igual —
  // este action no vuelve a autorizar nada, solo traduce.
  const { error } = await supabase
    .from("course_reviews")
    .upsert(
      { course_id: courseId, user_id: uid, rating: parsed.data.rating, body: parsed.data.body || null },
      { onConflict: "user_id,course_id" },
    );

  if (error) {
    return { error: traducir(error.code, `No se pudo guardar la reseña: ${error.message}`), success: null };
  }

  revalidatePath(`/cursos/${slug}`);
  return { error: null, success: "Gracias por dejar tu reseña." };
}

export async function respondReviewAction(
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

  // Quien no es la guía dueña rebota en RLS (`course_reviews_respond_owner`), y si intentara
  // tocar rating o body lo frena el guard. Acá no se re-autoriza nada.
  const { error } = await supabase
    .from("course_reviews")
    .update({ response: parsed.data, responded_at: new Date().toISOString(), responded_by: uid })
    .eq("id", reviewId);

  if (error) {
    return { error: traducir(error.code, `No se pudo responder: ${error.message}`), success: null };
  }

  revalidatePath(`/cursos/${slug}`);
  return { error: null, success: "Respuesta publicada." };
}

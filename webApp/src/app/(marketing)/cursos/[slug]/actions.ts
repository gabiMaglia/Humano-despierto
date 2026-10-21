"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { noLocator } from "@/lib/validation/teacher";
// La lógica de escritura vive en un .mjs para que la suite de la base la ejecute tal cual
// (ver `lib/reviews/write.mjs`).
import { guardarResena, responderResena, traducirErrorResena } from "@/lib/reviews/write.mjs";

export interface ReviewActionState {
  error: string | null;
  success: string | null;
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Elegí una puntuación.").max(5),
  // Opcional a proposito: se puede puntuar sin escribir (criterio 2).
  body: noLocator(z.string().trim().max(4000).optional().or(z.literal("")), "reseña"),
});

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
  return { error: null, success: created ? "Gracias por dejar tu reseña." : "Reseña actualizada." };
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

  // Solo el texto: la firma (`responded_by`/`responded_at`) la pone el guard (0026). Una guía
  // que no es dueña afecta 0 filas y eso vuelve como error, no como éxito.
  const { error } = await responderResena(supabase, { reviewId, response: parsed.data });

  if (error) {
    return { error: traducirErrorResena(error, `No se pudo responder: ${error.message}`), success: null };
  }

  revalidatePath(`/cursos/${slug}`);
  return { error: null, success: "Respuesta publicada." };
}

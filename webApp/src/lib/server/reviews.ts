import "server-only";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import { createClient } from "@/lib/supabase/server";

export interface CourseReview {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  response: string | null;
  respondedAt: string | null;
}

export interface CourseRatingSummary {
  average: number;
  total: number;
  /** Conteo por estrella, indice 0 = 1★ … indice 4 = 5★. */
  distribution: [number, number, number, number, number];
}

export interface CourseReviewsData {
  summary: CourseRatingSummary;
  reviews: CourseReview[];
  /** La reseña de quien mira, si tiene una. Null si no hay sesión o no reseñó. */
  own: CourseReview | null;
  /** Si puede reseñar: inscripción activa. Lo decide RLS igual; esto es solo para la UI. */
  canReview: boolean;
}

interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  author: { full_name: string } | { full_name: string }[] | null;
}

function firstAuthor(a: ReviewRow["author"]): { full_name: string } | null {
  if (!a) return null;
  return Array.isArray(a) ? (a[0] ?? null) : a;
}

const EMPTY_SUMMARY: CourseRatingSummary = { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };

/**
 * El promedio y la distribución se DERIVAN de las filas, no se guardan: una columna
 * `average_rating` es mentira en cuanto alguien edita su reseña. Misma doctrina que
 * `completed` (ADR-007) y que `studentCount` (T-027).
 *
 * Las ocultas no llegan acá: la política `course_reviews_read` las filtra con
 * `hidden_at is null`, así que no hay que acordarse de excluirlas en cada consulta.
 */
export async function getCourseReviews(courseId: string): Promise<CourseReviewsData> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select(
      `id, user_id, rating, body, response, responded_at, created_at, updated_at,
       author:profiles!course_reviews_user_id_fkey(full_name)`
    )
    .eq("course_id", courseId)
    .order("updated_at", { ascending: false });

  if (error) {
    // Una ficha de curso no se cae porque la sección de reseñas falle.
    console.error(`[reviews] no se pudieron leer las reseñas de ${courseId}: ${error.message}`);
    return { summary: EMPTY_SUMMARY, reviews: [], own: null, canReview: false };
  }

  const rows = (data ?? []) as unknown as ReviewRow[];
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let suma = 0;
  for (const r of rows) {
    distribution[r.rating - 1] += 1;
    suma += r.rating;
  }
  const total = rows.length;
  const summary: CourseRatingSummary = {
    average: total > 0 ? Math.round((suma / total) * 10) / 10 : 0,
    total,
    distribution,
  };

  const reviews: CourseReview[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    authorName: firstAuthor(r.author)?.full_name ?? "Alumna",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    response: r.response,
    respondedAt: r.responded_at,
  }));

  // Quién mira y si ya reseñó. Con el cliente de sesión, no el público.
  let own: CourseReview | null = null;
  let canReview = false;
  try {
    const sesion = await createClient();
    const { data: userData } = await sesion.auth.getUser();
    const uid = userData.user?.id ?? null;
    if (uid) {
      const propia = rows.find((r) => r.user_id === uid);
      own = propia ? (reviews.find((x) => x.id === propia.id) ?? null) : null;
      const { count } = await sesion
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("user_id", uid)
        .eq("status", "active");
      canReview = (count ?? 0) > 0;
    }
  } catch {
    // Sin sesión no hay reseña propia ni permiso — el estado por defecto ya es ese.
  }

  return { summary, reviews, own, canReview };
}

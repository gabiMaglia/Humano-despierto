import "server-only";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import { createClient } from "@/lib/supabase/server";
import { roundAverage } from "@/lib/reviews/rating";
import { elegirDestacada } from "@/lib/reviews/featured.mjs";
import { reportStatus, type ReportStatus } from "@/lib/reviews/report-status";
import { log } from "@/lib/server/log";

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
  /** Si puede reseñar: inscripción activa y no ser la guía dueña (D-20). Lo decide la base igual;
   *  esto es solo para la UI. */
  canReview: boolean;
  /** La reseña destacada (c.4): la más reciente con 4-5 estrellas y texto. Null si no hay. */
  featured: CourseReview | null;
  /** Quien mira es la guía dueña: ve el formulario para responder. RLS y el guard deciden igual. */
  viewerIsOwner: boolean;
  /** Guía dueña o admin: ve "Reportar al admin". RLS (`can_report_review`) decide igual. */
  viewerCanReport: boolean;
  /** Reportes propios de quien mira sobre las reseñas visibles, por id de reseña. */
  viewerReports: Record<string, ReportStatus>;
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
    log.error("reviews_read_failed", { course_id: courseId, message: error.message });
    return {
      summary: EMPTY_SUMMARY,
      reviews: [],
      own: null,
      canReview: false,
      featured: null,
      viewerIsOwner: false,
      viewerCanReport: false,
      viewerReports: {},
    };
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
    average: roundAverage(suma, total),
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
  let viewerIsOwner = false;
  let viewerCanReport = false;
  const viewerReports: Record<string, ReportStatus> = {};
  try {
    const sesion = await createClient();
    const { data: userData } = await sesion.auth.getUser();
    const uid = userData.user?.id ?? null;
    if (uid) {
      const propia = rows.find((r) => r.user_id === uid);
      own = propia ? (reviews.find((x) => x.id === propia.id) ?? null) : null;
      const [{ count }, { data: curso }, { data: perfil }] = await Promise.all([
        sesion
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("user_id", uid)
          .eq("status", "active"),
        sesion.from("courses").select("teacher_id").eq("id", courseId).maybeSingle(),
        sesion.from("profiles").select("role").eq("id", uid).maybeSingle(),
      ]);
      viewerIsOwner = curso?.teacher_id === uid;
      // D-20: la guía no reseña su propio curso aunque esté inscripta; el guard lo rechaza igual.
      canReview = (count ?? 0) > 0 && !viewerIsOwner;
      viewerCanReport = viewerIsOwner || perfil?.role === "admin";
      if (viewerCanReport && rows.length > 0) {
        const { data: propios } = await sesion
          .from("course_review_reports")
          .select("review_id, resolution")
          .eq("reporter_id", uid)
          .in(
            "review_id",
            rows.map((r) => r.id),
          );
        for (const p of (propios ?? []) as { review_id: string; resolution: string | null }[]) {
          viewerReports[p.review_id] = reportStatus(p.resolution);
        }
      }
    }
  } catch {
    // Sin sesión no hay reseña propia ni permiso: el estado por defecto ya es ese.
  }

  return {
    summary,
    reviews,
    own,
    canReview,
    featured: elegirDestacada(reviews),
    viewerIsOwner,
    viewerCanReport,
    viewerReports,
  };
}

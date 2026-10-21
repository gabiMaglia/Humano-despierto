import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { reportStatus, type ReportStatus } from "@/lib/reviews/report-status";

// Lecturas con service_role. Quien llama verificó antes: `requireAdmin()` para las dos primeras,
// `requireTeacher()` para la última, que además filtra por el id de la sesión.

export interface ModerationReview {
  id: string;
  rating: number;
  body: string | null;
  response: string | null;
  authorName: string;
  courseTitle: string;
  courseSlug: string;
  updatedAt: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
}

export interface PendingReport {
  id: string;
  reason: string;
  createdAt: string;
  reporterName: string;
  review: ModerationReview | null;
}

export interface OwnReport {
  id: string;
  createdAt: string;
  status: ReportStatus;
  courseTitle: string | null;
}

type Embed<T> = T | T[] | null;
function one<T>(v: Embed<T>): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Hints de FK: `course_reviews` y `course_review_reports` tienen más de una FK a `profiles`.
const REVIEW_COLUMNS = `id, rating, body, response, updated_at, hidden_at, hidden_reason,
  author:profiles!course_reviews_user_id_fkey(full_name), course:courses(title, slug)`;

interface ReviewRow {
  id: string;
  rating: number;
  body: string | null;
  response: string | null;
  updated_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  author: Embed<{ full_name: string }>;
  course: Embed<{ title: string; slug: string }>;
}

function toReview(r: ReviewRow): ModerationReview {
  const course = one(r.course);
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    response: r.response,
    authorName: one(r.author)?.full_name || "Alumna",
    courseTitle: course?.title ?? "Curso",
    courseSlug: course?.slug ?? "",
    updatedAt: r.updated_at,
    hiddenAt: r.hidden_at,
    hiddenReason: r.hidden_reason,
  };
}

export async function listPendingReports(): Promise<PendingReport[]> {
  const { data, error } = await getAdminSupabaseClient()
    .from("course_review_reports")
    .select(
      `id, reason, created_at,
       reporter:profiles!course_review_reports_reporter_id_fkey(full_name),
       review:course_reviews(${REVIEW_COLUMNS})`,
    )
    .is("resolved_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudo leer la cola de reportes: ${error.message}`);

  type Row = {
    id: string;
    reason: string;
    created_at: string;
    reporter: Embed<{ full_name: string }>;
    review: Embed<ReviewRow>;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const review = one(r.review);
    return {
      id: r.id,
      reason: r.reason,
      createdAt: r.created_at,
      reporterName: one(r.reporter)?.full_name || "Sin nombre",
      review: review ? toReview(review) : null,
    };
  });
}

export async function listRecentReviews(limit = 50): Promise<ModerationReview[]> {
  const { data, error } = await getAdminSupabaseClient()
    .from("course_reviews")
    .select(REVIEW_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudieron leer las reseñas: ${error.message}`);
  return ((data ?? []) as unknown as ReviewRow[]).map(toReview);
}

// Solo lo que la guía puede saber (ADR-012 flujo 4): cuándo, en qué curso y cómo terminó. Ni
// `resolved_by` ni `hidden_reason` salen de esta función.
export async function listOwnReviewReports(reporterId: string): Promise<OwnReport[]> {
  const { data, error } = await getAdminSupabaseClient()
    .from("course_review_reports")
    .select("id, created_at, resolution, review:course_reviews(course:courses(title))")
    .eq("reporter_id", reporterId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`No se pudieron leer tus reportes: ${error.message}`);

  type Row = {
    id: string;
    created_at: string;
    resolution: string | null;
    review: Embed<{ course: Embed<{ title: string }> }>;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    status: reportStatus(r.resolution),
    courseTitle: one(one(r.review)?.course ?? null)?.title ?? null,
  }));
}

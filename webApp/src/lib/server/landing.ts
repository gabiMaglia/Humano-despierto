import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import {
  buildHeroStats,
  disciplineCounts,
  type DisciplineCount,
  type HeroStat,
} from "@/lib/landing";

export interface LandingTestimonial {
  id: string;
  quote: string;
  who: string;
  role: string;
}

export interface LandingData {
  stats: HeroStat[];
  disciplines: DisciplineCount[];
  testimonials: LandingTestimonial[];
}

// Las inscriptas activas solo las lee service_role (RLS de enrollments); aca salen como
// conteo, nunca como filas.
async function readCourseAggregates() {
  const admin = getAdminSupabaseClient();
  const { data: courses, error } = await admin
    .from("courses")
    .select("teacher_id, discipline")
    .eq("status", "published");
  if (error) throw new Error(error.message);
  const { data: enr, error: enrError } = await admin
    .from("enrollments")
    .select("user_id")
    .eq("status", "active");
  if (enrError) throw new Error(enrError.message);
  const rows = courses ?? [];
  return {
    counts: {
      courses: rows.length,
      teachers: new Set(rows.map((c) => c.teacher_id)).size,
      students: new Set((enr ?? []).map((e) => e.user_id)).size,
    },
    disciplines: disciplineCounts(rows.map((c) => c.discipline)),
  };
}

interface TestimonialRow {
  id: string;
  body: string;
  author: { full_name: string } | { full_name: string }[] | null;
  course: { title: string } | { title: string }[] | null;
}

function first<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Cliente publico: la politica `course_reviews_read` ya excluye ocultas y cursos no publicados.
async function readTestimonials(): Promise<LandingTestimonial[]> {
  const { data, error } = await getPublicSupabaseClient()
    .from("course_reviews")
    .select(
      `id, body, author:profiles!course_reviews_user_id_fkey(full_name),
       course:courses!course_reviews_course_id_fkey(title)`
    )
    .eq("rating", 5)
    .not("body", "is", null)
    .neq("body", "")
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as TestimonialRow[]).map((r) => ({
    id: r.id,
    quote: r.body,
    who: first(r.author)?.full_name ?? "Alumna",
    role: first(r.course)?.title ?? "",
  }));
}

// Una seccion que falla se omite: la portada no se cae por un conteo.
export async function getLandingData(): Promise<LandingData> {
  const [agg, testimonials] = await Promise.allSettled([readCourseAggregates(), readTestimonials()]);
  if (agg.status === "rejected") console.error(`[landing] agregados: ${agg.reason}`);
  if (testimonials.status === "rejected") console.error(`[landing] testimonios: ${testimonials.reason}`);
  return {
    stats: agg.status === "fulfilled" ? buildHeroStats(agg.value.counts) : [],
    disciplines: agg.status === "fulfilled" ? agg.value.disciplines : [],
    testimonials: testimonials.status === "fulfilled" ? testimonials.value : [],
  };
}

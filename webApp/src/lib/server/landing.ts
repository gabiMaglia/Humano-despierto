import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import {
  buildHeroStats,
  disciplineCounts,
  type DisciplineCount,
  type HeroStat,
} from "@/lib/landing";
import { log } from "@/lib/server/log";

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

// Diez minutos: la portada no necesita cifras al segundo y son cuatro consultas por visita (D-40).
// Cada lector se cachea por separado y lanza al fallar: `unstable_cache` no guarda un rechazo, así
// que una sección caída no queda vacía diez minutos.
const LANDING_CACHE = { revalidate: 600, tags: ["landing"] };

const HEAD = { count: "exact", head: true } as const;

// Las inscriptas activas solo las lee service_role (RLS de enrollments); aca salen como
// conteo, nunca como filas. `count` + `head` porque PostgREST corta las filas en 1000 (D-41); guías
// y alumnas son PERFILES con al menos una fila (`!inner`), así una alumna en dos cursos cuenta una vez.
async function readCourseAggregates() {
  const admin = getAdminSupabaseClient();
  const [courses, teachers, students, disciplines] = await Promise.all([
    admin.from("courses").select("id", HEAD).eq("status", "published"),
    admin
      .from("profiles")
      .select("id, courses!courses_teacher_id_fkey!inner(id)", HEAD)
      .eq("courses.status", "published"),
    admin
      .from("profiles")
      .select("id, enrollments!enrollments_user_id_fkey!inner(id)", HEAD)
      .eq("enrollments.status", "active"),
    // Filas, no conteo: hace falta cada disciplina. Son cursos publicados, lejos del corte de 1000.
    admin.from("courses").select("discipline").eq("status", "published"),
  ]);
  for (const r of [courses, teachers, students, disciplines]) if (r.error) throw new Error(r.error.message);
  return {
    counts: { courses: courses.count ?? 0, teachers: teachers.count ?? 0, students: students.count ?? 0 },
    disciplines: disciplineCounts((disciplines.data ?? []).map((c) => c.discipline)),
  };
}

const cachedCourseAggregates = unstable_cache(readCourseAggregates, ["landing-aggregates"], LANDING_CACHE);

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

const cachedTestimonials = unstable_cache(readTestimonials, ["landing-testimonials"], LANDING_CACHE);

// Una seccion que falla se omite: la portada no se cae por un conteo.
export async function getLandingData(): Promise<LandingData> {
  const [agg, testimonials] = await Promise.allSettled([cachedCourseAggregates(), cachedTestimonials()]);
  if (agg.status === "rejected") log.error("landing_aggregates_failed", { err: agg.reason });
  if (testimonials.status === "rejected") log.error("landing_testimonials_failed", { err: testimonials.reason });
  return {
    stats: agg.status === "fulfilled" ? buildHeroStats(agg.value.counts) : [],
    disciplines: agg.status === "fulfilled" ? agg.value.disciplines : [],
    testimonials: testimonials.status === "fulfilled" ? testimonials.value : [],
  };
}

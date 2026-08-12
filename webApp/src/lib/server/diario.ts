import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";

// T-022 · Diario — reemplaza `src/lib/mocks/blog.ts`. Lectura pública (sin sesión, `getPublicSupabaseClient`)
// y lectura/escritura del panel docente (cliente de sesión, RLS `diario_posts_*`, migración 0018)
// conviven en el mismo módulo — mismo criterio que `lib/server/campus.ts` (un solo dominio).

export interface PublicDiarioPostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  teacherName: string;
  teacherSlug: string | null;
  teacherGlyph: string | null;
}

export interface PublicDiarioPost extends PublicDiarioPostSummary {
  body: string;
}

interface TeacherRef {
  full_name: string;
  slug: string | null;
  glyph: string | null;
}

interface PostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  teacher: TeacherRef | TeacherRef[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toSummary(row: PostRow): PublicDiarioPostSummary {
  const teacher = firstOf(row.teacher);
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    // `status = 'published'` ya garantiza `published_at is not null` (CHECK de la migración
    // 0018) — el `!` es seguro, no un supuesto.
    publishedAt: row.published_at!,
    teacherName: teacher?.full_name ?? "—",
    teacherSlug: teacher?.slug ?? null,
    teacherGlyph: teacher?.glyph ?? null,
  };
}

/** Criterio 2: `/diario` lista solo publicados, más recientes primero. */
export async function getPublishedPosts(): Promise<PublicDiarioPostSummary[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select(
      `slug, title, excerpt, published_at, teacher:profiles!diario_posts_teacher_id_fkey(full_name, slug, glyph)`
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw new Error(`No se pudo leer el diario: ${error.message}`);
  return ((data ?? []) as unknown as PostRow[]).map(toSummary);
}

/**
 * Criterio 2: `null` si no existe O si existe pero no está publicado — misma no-distinción que
 * `getCourseBySlug`/`getTeacherBySlug` (T-017): quien pide `/diario/<slug>` de un borrador ajeno
 * no puede usar la diferencia de respuesta para enumerar. La página hace `notFound()` con esto.
 */
export async function getPostBySlug(slug: string): Promise<PublicDiarioPost | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select(
      `slug, title, excerpt, body, published_at, teacher:profiles!diario_posts_teacher_id_fkey(full_name, slug, glyph)`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el post "${slug}": ${error.message}`);
  if (!data) return null;

  const row = data as unknown as PostRow & { body: string };
  return { ...toSummary(row), body: row.body };
}

// ==================================================================== panel docente

export interface TeacherDiarioPostSummary {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
}

export interface TeacherDiarioPostFields {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: "draft" | "published";
  teacherId: string;
}

interface TeacherPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: "draft" | "published";
  teacher_id: string;
  published_at: string | null;
  updated_at: string;
}

/** Criterio 1: solo los posts DE la docente autenticada — `diario_posts_read` (RLS) ya filtra. */
export async function listTeacherPosts(teacherId: string): Promise<TeacherDiarioPostSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select("id, slug, title, status, published_at, updated_at")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`No se pudieron leer tus posts: ${error.message}`);
  return ((data ?? []) as unknown as TeacherPostRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Post propio completo para el editor. `null` si no existe o no es de la docente que llama —
 * misma no-distinción que `getTeacherCourseDetail` (criterio 6 de T-005).
 */
export async function getTeacherPost(postId: string, teacherId: string): Promise<TeacherDiarioPostFields | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select("id, slug, title, excerpt, body, status, teacher_id")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el post: ${error.message}`);
  if (!data || data.teacher_id !== teacherId) return null;

  const row = data as unknown as Omit<TeacherPostRow, "published_at" | "updated_at">;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    teacherId: row.teacher_id,
  };
}

/**
 * Confirma titularidad con el cliente de SESIÓN — mismo patrón que `assertOwnsCourse`: los
 * Server Actions de escritura con `service_role` (publicar/despublicar) no pueden confiar en
 * que RLS los proteja, porque ELLOS son el bypass.
 */
export async function assertOwnsPost(postId: string, teacherId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select("id")
    .eq("id", postId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo verificar la titularidad del post: ${error.message}`);
  if (!data) throw new Error("No autorizado: ese post no te pertenece.");
}

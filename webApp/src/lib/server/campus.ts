import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/server/auth";
import type { AppRole } from "@/lib/stores/useAuthStore";

// T-021 · Campus — un hilo por curso + un hilo general (migración 0014).
// Este módulo solo LEE con el cliente de sesión: RLS decide qué filas vuelven
// (ADR-002). Los flags `canWrite`/`canModerate`/`isOwn` que calcula acá son
// para la UI (mostrar u ocultar el compositor / el botón de borrar) — la
// autoridad real, si alguien las esquiva, es `campus_posts_guard` (0014) y
// nadie puede tocar más de lo que esas mismas columnas ya permiten.

export interface CampusThreadSummary {
  /** `null` = hilo general. */
  courseId: string | null;
  slug: string | null;
  title: string;
  subtitle: string;
  glyph: string;
}

export interface CampusPost {
  id: string;
  authorId: string;
  authorName: string;
  authorGlyph: string | null;
  authorRole: AppRole;
  body: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedReason: string | null;
  deletedByName: string | null;
  isOwn: boolean;
  canModerate: boolean;
}

export interface CampusThreadData {
  thread: CampusThreadSummary;
  canWrite: boolean;
  posts: CampusPost[];
}

const GENERAL_THREAD: CampusThreadSummary = {
  courseId: null,
  slug: null,
  title: "Plaza mayor",
  subtitle: "El hilo general — sin inscripción, con sesión",
  glyph: "✦",
};

interface ProfileRef {
  full_name: string;
  glyph: string | null;
  role: AppRole;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Los hilos a los que la sesión actual tiene alguna relación: el general
 * (siempre) + un hilo por curso donde es alumna inscripta activa, docente
 * dueña, o —si es admin— todo curso publicado (mismo criterio de superusuario
 * que el resto del esquema, ver 0014). Sin sesión, solo el general no tiene
 * sentido mostrarlo — el layout de `(app)` ya exige sesión antes de llegar acá.
 */
export async function getCampusSidebar(): Promise<CampusThreadSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [GENERAL_THREAD];

  const supabase = await createClient();
  const courseThreads: CampusThreadSummary[] = [];

  if (user.role === "admin") {
    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, title, title_em, discipline, moon_glyph")
      .eq("status", "published")
      .order("title", { ascending: true });
    if (error) throw new Error(`No se pudieron leer los cursos: ${error.message}`);
    for (const c of data ?? []) {
      courseThreads.push({
        courseId: c.id,
        slug: c.slug,
        title: [c.title, c.title_em].filter(Boolean).join(" "),
        subtitle: c.discipline,
        glyph: c.moon_glyph || "○",
      });
    }
  } else if (user.role === "teacher") {
    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, title, title_em, discipline, moon_glyph")
      .eq("teacher_id", user.id)
      .order("title", { ascending: true });
    if (error) throw new Error(`No se pudieron leer tus cursos: ${error.message}`);
    for (const c of data ?? []) {
      courseThreads.push({
        courseId: c.id,
        slug: c.slug,
        title: [c.title, c.title_em].filter(Boolean).join(" "),
        subtitle: c.discipline,
        glyph: c.moon_glyph || "○",
      });
    }
  } else {
    const { data, error } = await supabase
      .from("enrollments")
      .select("course:courses(id, slug, title, title_em, discipline, moon_glyph)")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (error) throw new Error(`No se pudieron leer tus inscripciones: ${error.message}`);
    interface Row {
      course:
        | { id: string; slug: string; title: string; title_em: string | null; discipline: string; moon_glyph: string | null }
        | { id: string; slug: string; title: string; title_em: string | null; discipline: string; moon_glyph: string | null }[]
        | null;
    }
    for (const row of (data ?? []) as unknown as Row[]) {
      const c = firstOf(row.course);
      if (!c) continue;
      courseThreads.push({
        courseId: c.id,
        slug: c.slug,
        title: [c.title, c.title_em].filter(Boolean).join(" "),
        subtitle: c.discipline,
        glyph: c.moon_glyph || "○",
      });
    }
  }

  return [GENERAL_THREAD, ...courseThreads];
}

/**
 * El contenido de UN hilo. `courseSlug === null` pide el hilo general.
 * `null` de retorno = "no existe o no tenés acceso" — misma no-distinción
 * deliberada que `getLessonPlayerData` (T-006 c.2/c.3): la ruta hace
 * `notFound()` sin filtrar cuál de las dos fue.
 *
 * Envuelta en `cache()` porque el layout del segmento la llama para decidir el 404 y la página
 * la vuelve a llamar para renderizar: con la deduplicación de React es una sola consulta por
 * request. Sin ella serían dos idénticas.
 */
export const getCampusThread = cache(async function getCampusThread(
  courseSlug: string | null,
): Promise<CampusThreadData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  let thread: CampusThreadSummary = GENERAL_THREAD;
  let canWrite = true;
  let isModeratorOfThread = user.role === "admin";

  if (courseSlug !== null) {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, slug, title, title_em, discipline, moon_glyph, teacher_id")
      .eq("slug", courseSlug)
      .maybeSingle();
    if (courseError) throw new Error(`No se pudo leer el curso: ${courseError.message}`);
    if (!course) return null;

    const isOwner = course.teacher_id === user.id;
    let isEnrolled = false;
    if (!isOwner) {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (enrollmentError) throw new Error(`No se pudo verificar la inscripción: ${enrollmentError.message}`);
      isEnrolled = Boolean(enrollment);
    }
    const hasAccess = isOwner || isEnrolled || user.role === "admin";
    if (!hasAccess) return null;

    thread = {
      courseId: course.id,
      slug: course.slug,
      title: [course.title, course.title_em].filter(Boolean).join(" "),
      subtitle: course.discipline,
      glyph: course.moon_glyph || "○",
    };
    // Espejo exacto de `can_write_campus_post` (0014): inscripción activa o docente dueña.
    // El admin puede LEER cualquier hilo (moderación) pero no queda habilitado a escribir en
    // un curso ajeno solo por ser admin — mismo criterio documentado en la migración.
    canWrite = isOwner || isEnrolled;
    isModeratorOfThread = isOwner || user.role === "admin";
  }

  // `moderator:profiles!...` SÍ se puede embeber directo: quien modera es siempre docente dueña
  // o admin (0014), y esas filas ya son públicas por `profiles_read_public` (0004). El AUTOR de
  // un mensaje puede ser cualquier alumna, y `profiles_read_public` no expone filas de alumnas
  // entre sí a propósito ("el padrón no es dato público") — por eso el nombre del autor se
  // resuelve aparte, con `campus_post_authors()` (0014), que solo devuelve nombre/glyph/rol de
  // quien escribió en un hilo que la sesión actual puede leer, nada más de la ficha.
  const postsQuery = supabase
    .from("campus_posts")
    .select(
      `id, author_id, body, created_at, updated_at, deleted_at, deleted_reason,
       moderator:profiles!campus_posts_deleted_by_fkey(full_name)`
    )
    .order("created_at", { ascending: true });

  const { data, error } =
    thread.courseId === null
      ? await postsQuery.is("course_id", null)
      : await postsQuery.eq("course_id", thread.courseId);

  if (error) throw new Error(`No se pudo leer el hilo: ${error.message}`);

  interface PostRow {
    id: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    deleted_reason: string | null;
    moderator: { full_name: string } | { full_name: string }[] | null;
  }

  const rows = (data ?? []) as unknown as PostRow[];
  const authorIds = [...new Set(rows.map((r) => r.author_id))];

  const authorsById = new Map<string, ProfileRef>();
  if (authorIds.length > 0) {
    const { data: authors, error: authorsError } = await supabase.rpc("campus_post_authors", {
      p_ids: authorIds,
    });
    if (authorsError) throw new Error(`No se pudieron leer las autoras del hilo: ${authorsError.message}`);
    for (const a of (authors ?? []) as { id: string; full_name: string; glyph: string | null; role: AppRole }[]) {
      authorsById.set(a.id, { full_name: a.full_name, glyph: a.glyph, role: a.role });
    }
  }

  const posts: CampusPost[] = rows.map((row) => {
    const author = authorsById.get(row.author_id);
    const moderator = firstOf(row.moderator);
    return {
      id: row.id,
      authorId: row.author_id,
      authorName: author?.full_name || "—",
      authorGlyph: author?.glyph ?? null,
      authorRole: author?.role ?? "student",
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: row.deleted_at !== null,
      deletedReason: row.deleted_reason,
      deletedByName: moderator?.full_name ?? null,
      isOwn: row.author_id === user.id,
      canModerate: isModeratorOfThread,
    };
  });

  return { thread, canWrite, posts };
});

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AnnouncementView,
  ModerationAnnouncementView,
  TeacherAnnouncementView,
} from "@/lib/announcements/types";

// Todo con el cliente de SESIÓN: quién ve qué lo decide `course_announcements_read` (0034). Los
// filtros de estado de abajo no son la autoridad; existen porque la dueña también puede ser
// alumna en /panel y ahí no tiene que ver sus propios borradores.

interface CourseRef {
  title: string;
  slug: string;
}

interface PublishedRow {
  id: string;
  title: string;
  body: string;
  published_at: string;
  course?: CourseRef | CourseRef[] | null;
}

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toView(row: PublishedRow): AnnouncementView {
  return { id: row.id, title: row.title, body: row.body, publishedAt: row.published_at, course: firstOf(row.course) };
}

/** Ficha del curso (solo se llama con `access.hasAccess`). Degrada a vacío: un bloque secundario no
 * tira abajo la página de venta (decisión 13). */
export async function getCourseAnnouncements(courseId: string): Promise<AnnouncementView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_announcements")
    .select("id, title, body, published_at")
    .eq("course_id", courseId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error(`[anuncios] no se pudieron leer los de ${courseId}: ${error.message}`);
    return [];
  }
  return ((data ?? []) as PublishedRow[]).map((r) => toView({ ...r, course: null }));
}

/** /panel · "Novedades de tus cursos": los 5 más nuevos de sus inscripciones activas. */
export async function getRecentAnnouncementsForStudent(courseIds: string[]): Promise<AnnouncementView[]> {
  if (courseIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_announcements")
    .select("id, title, body, published_at, course:courses!course_announcements_course_id_fkey(title, slug)")
    .in("course_id", courseIds)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(5);
  if (error) {
    console.error(`[anuncios] no se pudieron leer las novedades: ${error.message}`);
    return [];
  }
  return ((data ?? []) as unknown as PublishedRow[]).map(toView);
}

/** Panel docente: todo lo del curso, borradores y retirados incluidos. Acá sí lanza. */
export async function getTeacherAnnouncements(courseId: string): Promise<TeacherAnnouncementView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_announcements")
    .select("id, title, body, status, published_at, created_at, deleted_at, deleted_reason")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer los anuncios del curso: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status as "draft" | "published",
    publishedAt: r.published_at,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
    deletedReason: r.deleted_reason,
  }));
}

/** Panel admin: los 30 publicados más nuevos, retirados incluidos (se ve el motivo). */
export async function listAnnouncementsForModeration(): Promise<ModerationAnnouncementView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_announcements")
    .select("id, title, body, published_at, deleted_at, deleted_reason, course:courses!course_announcements_course_id_fkey(title, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(`No se pudieron leer los anuncios: ${error.message}`);
  return ((data ?? []) as unknown as (PublishedRow & { deleted_at: string | null; deleted_reason: string | null })[]).map(
    (r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      publishedAt: r.published_at,
      courseTitle: firstOf(r.course)?.title ?? "—",
      deletedAt: r.deleted_at,
      deletedReason: r.deleted_reason,
    }),
  );
}

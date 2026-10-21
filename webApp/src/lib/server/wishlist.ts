import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SavedCourse } from "@/lib/learning/tabs";

interface WishlistRow {
  course_id: string;
  course: { slug: string; title: string } | { slug: string; title: string }[] | null;
}

/**
 * Ids guardados por la alumna, en UNA consulta (el catálogo tiene N cards, no N lecturas).
 * `null` = sin sesión: la card dibuja un link a /entrar, no un botón que guarda.
 */
export async function getWishlistIds(): Promise<Set<string> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("course_wishlist").select("course_id").eq("user_id", user.id);
  if (error) throw new Error(`No se pudieron leer los guardados: ${error.message}`);
  return new Set((data ?? []).map((r) => r.course_id as string));
}

/** Los guardados con lo mínimo para listarlos, el último guardado primero. */
export async function getWishlist(): Promise<SavedCourse[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("course_wishlist")
    .select("course_id, course:courses(slug, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer los guardados: ${error.message}`);

  return ((data ?? []) as unknown as WishlistRow[]).flatMap((row) => {
    const course = Array.isArray(row.course) ? row.course[0] : row.course;
    // Un curso despublicado deja de ser legible por RLS: no hay a dónde linkear.
    return course ? [{ courseId: row.course_id, slug: course.slug, title: course.title }] : [];
  });
}

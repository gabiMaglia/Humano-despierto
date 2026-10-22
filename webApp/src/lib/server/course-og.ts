import "server-only";
import type { CourseOgInput } from "@/lib/og/brand";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import { UPLOADS_BUCKET } from "@/lib/server/uploads";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { COVER_PATH_RE, MAX_COVER_BYTES, detectImageKind, type ImageKind } from "@/lib/validation/image";

// webp queda afuera: satori la reconoce pero resvg la omite y la imagen sale 200 con la portada
// ausente (chequeo real de T-052). Un webp cae a la tarjeta generativa.
export const OG_COVER_KINDS: ImageKind[] = ["jpg", "png"];

export interface CourseOgData extends CourseOgInput {
  coverPath: string | null;
}

type Row = {
  title: string;
  title_em: string | null;
  discipline: string | null;
  roman_num: string | null;
  cover_path: string | null;
  teacher: { full_name: string | null } | { full_name: string | null }[] | null;
};

export async function getCourseOgData(slug: string): Promise<CourseOgData | null> {
  const { data, error } = await getPublicSupabaseClient()
    .from("courses")
    .select("title, title_em, discipline, roman_num, cover_path, teacher:profiles!courses_teacher_id_fkey(full_name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el curso "${slug}" para la imagen OG: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as Row;
  const teacher = Array.isArray(row.teacher) ? row.teacher[0] : row.teacher;
  return {
    title: row.title,
    titleEm: row.title_em,
    discipline: row.discipline,
    romanNum: row.roman_num,
    teacherName: teacher?.full_name ?? null,
    coverPath: row.cover_path,
  };
}

/**
 * Bytes de la portada para componerla en la imagen OG. service_role porque `anon` no lee
 * storage.objects; el path sale de una fila publicada que `anon` ya ve (getCourseOgData), nunca
 * del request. Cualquier falla devuelve null: la imagen cae a la tarjeta generativa, no a un 500.
 */
export async function loadCoverForOg(path: string | null): Promise<ArrayBuffer | null> {
  if (!path || !COVER_PATH_RE.test(path)) return null;
  try {
    const { data, error } = await createServiceRoleClient().storage.from(UPLOADS_BUCKET).download(path);
    if (error || !data || data.size > MAX_COVER_BYTES) return null;
    const buffer = await data.arrayBuffer();
    const kind = detectImageKind(new Uint8Array(buffer));
    return kind && OG_COVER_KINDS.includes(kind) ? buffer : null;
  } catch {
    return null;
  }
}

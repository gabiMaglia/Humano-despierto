import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";

export type GrantTarget = { ok: true; userId: string; courseId: string } | { ok: false; error: string };

/** El formulario de inscribir ya no recibe la lista de todas las cuentas y cursos (T-049):
 *  el admin escribe mail y slug, y el servidor los resuelve. */
export async function resolveGrantTarget(input: { email: string; courseSlug: string }): Promise<GrantTarget> {
  const db = getAdminSupabaseClient();
  const [{ data: users, error: userError }, { data: course, error: courseError }] = await Promise.all([
    db.rpc("admin_user_by_email", { p_email: input.email }),
    db.from("courses").select("id").eq("slug", input.courseSlug).maybeSingle(),
  ]);
  if (userError) throw new Error(`No se pudo buscar la cuenta: ${userError.message}`);
  if (courseError) throw new Error(`No se pudo buscar el curso: ${courseError.message}`);

  const user = Array.isArray(users) ? (users[0] as { id: string } | undefined) : undefined;
  if (!user) return { ok: false, error: "No hay ninguna cuenta con ese mail." };
  if (!course) return { ok: false, error: "No hay ningún curso con ese slug." };
  return { ok: true, userId: user.id, courseId: course.id };
}

import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import type { AppRole } from "@/lib/stores/useAuthStore";

// `AdminActionState` / `ADMIN_ACTION_INITIAL_STATE` viven en
// `@/lib/admin/action-state` (sin `server-only`): los componentes cliente
// necesitan el valor inicial, y cualquier import de valor desde este archivo
// arrastra el sentinel `server-only` al bundle del browser. Los tipos de
// abajo son solo forma de datos (sin secretos) — los componentes cliente los
// importan con `import type`, que no genera un import en runtime.

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  createdAt: string;
}

/**
 * Lectura administrativa: junta `profiles` (rol, nombre) con el email de
 * `auth.users` (solo accesible vía `auth.admin`, service_role). Es lectura
 * privilegiada a propósito — la pantalla es exclusiva de `admin`, verificado
 * por quien llama antes de invocar esto (nunca acá).
 */
export async function listAllUsers(): Promise<AdminUserRow[]> {
  const db = getAdminSupabaseClient();

  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  if (profilesError) {
    throw new Error(`No se pudo leer profiles: ${profilesError.message}`);
  }

  const { data: authList, error: authError } = await db.auth.admin.listUsers({
    perPage: 1000,
  });

  if (authError) {
    throw new Error(`No se pudo leer usuarios de auth: ${authError.message}`);
  }

  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? null]));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? null,
    fullName: p.full_name || "—",
    role: p.role as AppRole,
    createdAt: p.created_at,
  }));
}

export async function countAdmins(): Promise<number> {
  const db = getAdminSupabaseClient();
  const { count, error } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) {
    throw new Error(`No se pudo contar administradores: ${error.message}`);
  }
  return count ?? 0;
}

export type CourseStatus = "draft" | "published" | "archived";

export interface AdminCourseRow {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  teacherName: string;
}

interface TeacherRow {
  full_name: string;
}

interface AdminCourseQueryRow {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  teacher: TeacherRow | TeacherRow[] | null;
}

function firstTeacher(teacher: TeacherRow | TeacherRow[] | null): TeacherRow | null {
  if (!teacher) return null;
  return Array.isArray(teacher) ? (teacher[0] ?? null) : teacher;
}

export async function listAllCourses(): Promise<AdminCourseRow[]> {
  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("courses")
    .select(
      "id, slug, title, status, teacher:profiles!courses_teacher_id_fkey(full_name)"
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer cursos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as AdminCourseQueryRow[];
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    teacherName: firstTeacher(row.teacher)?.full_name ?? "—",
  }));
}

export type EnrollmentStatus = "active" | "revoked";

export interface AdminEnrollmentRow {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  grantedByName: string | null;
}

interface AdminEnrollmentQueryRow {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  student: TeacherRow | TeacherRow[] | null;
  course: { title: string } | { title: string }[] | null;
  granted_by_profile: TeacherRow | TeacherRow[] | null;
}

export async function listAllEnrollments(): Promise<AdminEnrollmentRow[]> {
  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("enrollments")
    .select(
      `id, user_id, course_id, status, enrolled_at,
       student:profiles!enrollments_user_id_fkey(full_name),
       course:courses!enrollments_course_id_fkey(title),
       granted_by_profile:profiles!enrollments_granted_by_fkey(full_name)`
    )
    .order("enrolled_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudo leer inscripciones: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as AdminEnrollmentQueryRow[];
  return rows.map((row) => {
    const course = Array.isArray(row.course) ? (row.course[0] ?? null) : row.course;
    return {
      id: row.id,
      userId: row.user_id,
      userName: firstTeacher(row.student)?.full_name ?? "—",
      courseId: row.course_id,
      courseTitle: course?.title ?? "—",
      status: row.status,
      enrolledAt: row.enrolled_at,
      grantedByName: firstTeacher(row.granted_by_profile)?.full_name ?? null,
    };
  });
}

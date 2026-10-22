import "server-only";
import { getCurrentUser } from "@/lib/server/auth";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import type { AppRole, AuthUser } from "@/lib/stores/useAuthStore";

// `AdminActionState` / `ADMIN_ACTION_INITIAL_STATE` viven en
// `@/lib/admin/action-state` (sin `server-only`): los componentes cliente
// necesitan el valor inicial, y cualquier import de valor desde este archivo
// arrastra el sentinel `server-only` al bundle del browser. Los tipos de
// abajo son solo forma de datos (sin secretos) — los componentes cliente los
// importan con `import type`, que no genera un import en runtime.

/**
 * Puerta única de todo lo de admin: Server Actions y Server Components que leen con service_role.
 * El rol sale de `profiles` (ADR-006), nunca del claim del JWT: un admin recién degradado cuyo
 * token todavía dice "admin" no pasa. Vive acá y no en `actions.ts` porque un archivo "use server"
 * expone como acción todo lo que exporta.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("No autorizado: se requiere rol admin.");
  }
  return user;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  createdAt: string;
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
  createdAt: string;
}

interface TeacherRow {
  full_name: string;
}

function firstTeacher(teacher: TeacherRow | TeacherRow[] | null): TeacherRow | null {
  if (!teacher) return null;
  return Array.isArray(teacher) ? (teacher[0] ?? null) : teacher;
}

export type EnrollmentStatus = "requested" | "active" | "revoked" | "rejected";

export interface AdminEnrollmentRow {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  grantedByName: string | null;
  decidedReason: string | null;
}

export interface AdminEnrollmentRequestRow {
  id: string;
  userName: string;
  courseTitle: string;
  requestedAt: string;
}

interface AdminEnrollmentRequestQueryRow {
  id: string;
  requested_at: string;
  student: TeacherRow | TeacherRow[] | null;
  course: { title: string } | { title: string }[] | null;
}

/** T-043 · la cola: solicitudes `requested`, la más vieja primero (se atiende en orden). */
export async function listPendingEnrollmentRequests(): Promise<AdminEnrollmentRequestRow[]> {
  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("enrollments")
    .select(
      `id, requested_at,
       student:profiles!enrollments_user_id_fkey(full_name),
       course:courses!enrollments_course_id_fkey(title)`
    )
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron leer las solicitudes: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as AdminEnrollmentRequestQueryRow[];
  return rows.map((row) => {
    const course = Array.isArray(row.course) ? (row.course[0] ?? null) : row.course;
    return {
      id: row.id,
      userName: firstTeacher(row.student)?.full_name ?? "—",
      courseTitle: course?.title ?? "—",
      requestedAt: row.requested_at,
    };
  });
}

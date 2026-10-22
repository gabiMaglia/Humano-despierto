import "server-only";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { PAGE_SIZE, splitPage, type ListParams } from "@/lib/admin/list-params";
import { invitationStatus, type InvitationStatus } from "@/lib/admin/invitation-status";
import type { AdminCourseRow, AdminEnrollmentRow, AdminUserRow, CourseStatus, EnrollmentStatus } from "@/lib/server/admin";
import type { AppRole } from "@/lib/stores/useAuthStore";

// Lecturas del admin: quien llama ya pasó por el layout de /panel/admin (profiles.role) y las
// funciones SQL solo las ejecuta service_role. Las fechas quedan como string de Postgres: el
// cursor las necesita con microsegundos.

export interface Page<T> {
  items: T[];
  next: string | null;
}

export interface AdminInvitationRow {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedByName: string | null;
  status: InvitationStatus;
}

async function callList<T>(fn: string, { q, after }: ListParams): Promise<T[]> {
  const db = getAdminSupabaseClient();
  const args = { p_q: q, p_after_at: after?.at ?? null, p_after_id: after?.id ?? null, p_limit: PAGE_SIZE + 1 };
  const { data, error } = await db.rpc(fn, args);
  if (!error) return (data ?? []) as T[];
  // c.9: un cursor con forma válida que Postgres igual rechaza (30 de febrero) no es un 500.
  if (after) {
    const retry = await db.rpc(fn, { ...args, p_after_at: null, p_after_id: null });
    if (!retry.error) return (retry.data ?? []) as T[];
  }
  throw new Error(`No se pudo leer ${fn}: ${error.message}`);
}

interface UserRpcRow {
  id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  created_at: string;
}
interface CourseRpcRow {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  teacher_name: string | null;
  created_at: string;
}
interface EnrollmentRpcRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  course_id: string;
  course_title: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  decided_reason: string | null;
  granted_by_name: string | null;
}
interface InvitationRpcRow {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by_name: string | null;
}

export async function listUsersPage(params: ListParams): Promise<Page<AdminUserRow>> {
  const rows = (await callList<UserRpcRow>("admin_list_users", params)).map((r) => ({
    id: r.id,
    fullName: r.full_name || "—",
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
  }));
  return splitPage(rows, (u) => ({ at: u.createdAt, id: u.id }));
}

export async function listCoursesPage(params: ListParams): Promise<Page<AdminCourseRow>> {
  const rows = (await callList<CourseRpcRow>("admin_list_courses", params)).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    teacherName: r.teacher_name ?? "—",
    createdAt: r.created_at,
  }));
  return splitPage(rows, (c) => ({ at: c.createdAt, id: c.id }));
}

export async function listEnrollmentsPage(params: ListParams): Promise<Page<AdminEnrollmentRow>> {
  const rows = (await callList<EnrollmentRpcRow>("admin_list_enrollments", params)).map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name || "—",
    courseId: r.course_id,
    courseTitle: r.course_title,
    status: r.status,
    enrolledAt: r.enrolled_at,
    grantedByName: r.granted_by_name,
    decidedReason: r.decided_reason,
  }));
  return splitPage(rows, (e) => ({ at: e.enrolledAt, id: e.id }));
}

export async function listInvitationsPage(params: ListParams, now: Date = new Date()): Promise<Page<AdminInvitationRow>> {
  const rows = (await callList<InvitationRpcRow>("admin_list_invitations", params)).map((r) => {
    const row = {
      id: r.id,
      email: r.email,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      acceptedAt: r.accepted_at,
      revokedAt: r.revoked_at,
      invitedByName: r.invited_by_name,
    };
    return { ...row, status: invitationStatus(row, now) };
  });
  return splitPage(rows, (i) => ({ at: i.createdAt, id: i.id }));
}

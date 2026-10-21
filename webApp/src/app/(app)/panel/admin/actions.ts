"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/server/auth";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { notifyEnrollmentActivated } from "@/lib/server/mail/notify";
import type { AdminActionState } from "@/lib/admin/action-state";
import type { AppRole } from "@/lib/stores/useAuthStore";

const ROLES: AppRole[] = ["student", "teacher", "admin"];
const COURSE_STATUSES = ["draft", "published", "archived"] as const;
const ENROLLMENT_STATUSES = ["active", "revoked"] as const;

/**
 * Puerta única de todo Server Action de este archivo. La sesión se lee del
 * lado del servidor y `getCurrentUser` resuelve el rol contra `profiles`
 * (autoridad — ADR-006), nunca del claim del JWT: un admin recién degradado
 * cuyo token todavía dice "admin" no pasa acá.
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("No autorizado: se requiere rol admin.");
  }
  return user;
}

export async function updateUserRoleAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("role") ?? "") as AppRole;

  if (!userId || !ROLES.includes(nextRole)) {
    return { error: "Datos inválidos.", success: null };
  }

  const db = getAdminSupabaseClient();

  const { data: target, error: targetError } = await db
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .single();

  if (targetError || !target) {
    return { error: "Usuario no encontrado.", success: null };
  }

  // Criterio 5: nadie puede dejar al sistema sin un solo admin. No importa
  // si quien lo intenta es el propio admin u otro: si el objetivo es el
  // único admin que queda, el downgrade se rechaza acá — no hay forma de
  // recuperarlo después desde la aplicación.
  if (target.role === "admin" && nextRole !== "admin") {
    const { count, error: countError } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return { error: "No se pudo verificar cuántos admins quedan.", success: null };
    }
    if ((count ?? 0) <= 1) {
      return {
        error: "No se puede quitar el rol admin: es el único administrador del sistema.",
        success: null,
      };
    }
  }

  const { error: updateError } = await db
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", userId);

  if (updateError) {
    return { error: `No se pudo actualizar el rol: ${updateError.message}`, success: null };
  }

  revalidatePath("/panel/admin");
  return {
    error: null,
    success: `${target.full_name || "Usuario"} ahora es ${nextRole}.`,
  };
}

export async function setEnrollmentAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (
    !userId ||
    !courseId ||
    !(ENROLLMENT_STATUSES as readonly string[]).includes(status)
  ) {
    return { error: "Datos inválidos.", success: null };
  }

  const db = getAdminSupabaseClient();

  const { error } = await db
    .from("enrollments")
    .upsert(
      { user_id: userId, course_id: courseId, status, granted_by: admin.id },
      { onConflict: "user_id,course_id" }
    );

  if (error) {
    return { error: `No se pudo actualizar la inscripción: ${error.message}`, success: null };
  }

  // El mail se dispara DESPUÉS de que la inscripción ya quedó otorgada, y esta llamada nunca
  // tira (T-020 criterio 2, garantizado en `notify.ts`/`send.ts`) — un SMTP caído no puede
  // deshacer lo de arriba ni impedir el `return` de éxito de abajo.
  //
  // No se lee el estado ANTERIOR para decidir si notificar (T-020, juez ciego D3): esa lectura
  // seguida de este upsert es exactamente la carrera que dos activaciones concurrentes pueden
  // ganar las dos. `notifyEnrollmentActivated` se llama siempre que el estado nuevo es "active"
  // — es `claimMailSlot` (UNIQUE de `mail_log`, migración 0019), no esta lectura, quien decide
  // atómicamente si el mail ya se mandó antes para este (alumna, curso).
  if (status === "active") {
    await notifyEnrollmentActivated({ studentId: userId, courseId });
  }

  revalidatePath("/panel/admin");
  return {
    error: null,
    success: status === "active" ? "Inscripción activada." : "Inscripción dada de baja.",
  };
}

export async function setCourseStatusAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const courseId = String(formData.get("courseId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!courseId || !(COURSE_STATUSES as readonly string[]).includes(status)) {
    return { error: "Datos inválidos.", success: null };
  }

  const db = getAdminSupabaseClient();

  const { error } = await db
    .from("courses")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", courseId);

  if (error) {
    return { error: `No se pudo actualizar el curso: ${error.message}`, success: null };
  }

  revalidatePath("/panel/admin");
  revalidatePath("/cursos");
  return { error: null, success: "Estado del curso actualizado." };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyEnrollmentActivated, notifyEnrollmentRejected } from "@/lib/server/mail/notify";
import { hasLocator } from "@/lib/validation/locator.mjs";
import { ENROLLMENT_COPY, NO_ROWS, REASON_MAX, translateEnrollmentError } from "@/lib/enrollment/messages";
import { requireAdmin } from "@/lib/server/admin";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { resolveGrantTarget } from "@/lib/server/enrollment-grant";
import { normalizeEmail } from "@/lib/admin/email";
import type { AdminActionState } from "@/lib/admin/action-state";
import { createClient } from "@/lib/supabase/server";
import { idSchema, reasonSchema as announcementReasonSchema } from "@/lib/announcements/validation";
import { retirar, traducirErrorAnuncio } from "@/lib/announcements/write.mjs";
import type { AppRole } from "@/lib/stores/useAuthStore";

const ROLES: AppRole[] = ["student", "teacher", "admin"];
const COURSE_STATUSES = ["draft", "published", "archived"] as const;
const ENROLLMENT_STATUSES = ["active", "revoked"] as const;

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

  revalidatePath("/panel/admin", "layout");
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
      // `decided_reason: null`: el upsert a `active` sobre una fila `rejected` con motivo violaría
      // `enrollments_decided_reason_consistency` (0029). Activar o dar de baja acá es una decisión
      // sin motivo escrito.
      {
        user_id: userId,
        course_id: courseId,
        status,
        granted_by: admin.id,
        decided_at: new Date().toISOString(),
        decided_reason: null,
      },
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

  revalidatePath("/panel/admin", "layout");
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

  revalidatePath("/panel/admin", "layout");
  revalidatePath("/cursos");
  return { error: null, success: "Estado del curso actualizado." };
}

const enrollmentIdSchema = z.uuid();

const reasonSchema = z
  .string()
  .trim()
  .max(REASON_MAX, ENROLLMENT_COPY.reasonTooLong)
  .refine((v) => !hasLocator(v), ENROLLMENT_COPY.reasonHasLink);

/**
 * T-043 · aprobar. El estado de ORIGEN va en el WHERE: si otra admin ya resolvió la fila, el
 * UPDATE no la encuentra, no hay mail desde acá y se avisa (c.6). `rejected` también es origen
 * válido: el admin puede reconsiderar un rechazo (c.9). El mail lo deduplica igual `mail_log`.
 */
export async function approveEnrollmentRequestAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const id = enrollmentIdSchema.safeParse(formData.get("enrollmentId"));
  if (!id.success) return { error: ENROLLMENT_COPY.invalidData, success: null };

  const db = getAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("enrollments")
    .update({ status: "active", granted_by: admin.id, enrolled_at: now, decided_at: now, decided_reason: null })
    .eq("id", id.data)
    .in("status", ["requested", "rejected"])
    .select("user_id, course_id");

  if (error) return { error: translateEnrollmentError(error), success: null };
  const row = data?.[0];
  if (!row) return { error: translateEnrollmentError({ code: NO_ROWS, message: "" }), success: null };

  // Después de guardar y sin try/catch: `notify*` atrapa todo (T-020), un SMTP caído no deshace
  // la aprobación ni cambia esta respuesta (c.11).
  await notifyEnrollmentActivated({ studentId: row.user_id, courseId: row.course_id });

  revalidatePath("/panel/admin", "layout");
  revalidatePath("/cursos/[slug]", "page");
  return { error: null, success: ENROLLMENT_COPY.approved };
}

/** T-043 · rechazar, con motivo opcional que lee la alumna (R-3 en las dos mitades). */
export async function rejectEnrollmentRequestAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const id = enrollmentIdSchema.safeParse(formData.get("enrollmentId"));
  if (!id.success) return { error: ENROLLMENT_COPY.invalidData, success: null };

  const reason = reasonSchema.safeParse(String(formData.get("reason") ?? ""));
  if (!reason.success) {
    return { error: reason.error.issues[0]?.message ?? ENROLLMENT_COPY.invalidData, success: null };
  }
  const decidedReason = reason.data === "" ? null : reason.data;

  const db = getAdminSupabaseClient();
  const { data, error } = await db
    .from("enrollments")
    .update({ status: "rejected", decided_at: new Date().toISOString(), decided_reason: decidedReason })
    .eq("id", id.data)
    .eq("status", "requested")
    .select("user_id, course_id");

  if (error) return { error: translateEnrollmentError(error), success: null };
  const row = data?.[0];
  if (!row) return { error: translateEnrollmentError({ code: NO_ROWS, message: "" }), success: null };

  await notifyEnrollmentRejected({ studentId: row.user_id, courseId: row.course_id, reason: decidedReason });

  revalidatePath("/panel/admin", "layout");
  revalidatePath("/cursos/[slug]", "page");
  return { error: null, success: ENROLLMENT_COPY.rejected };
}

// ---------------------------------------------------------------- T-037 · moderación de reseñas

function moderationError(code: string | undefined, fallback: string): string {
  if (code === "P0002") return "Esa reseña ya no existe.";
  if (code === "42501") return "No autorizado.";
  if (code === "22023") return "El motivo va de 1 a 1000 caracteres.";
  return fallback;
}

function revalidateModeration() {
  revalidatePath("/cursos/[slug]", "page");
  revalidatePath("/cursos");
  revalidatePath("/panel/admin/resenas");
  revalidatePath("/panel/docente");
}

const moderationIdSchema = z.uuid();
const MODERATION_REASON_MAX = 1000;

// Toda la moderación pasa por `moderate_*` (0032): ocultar y resolver los reportes es una
// transacción, y es el único código que escribe `hidden_*`/`resolved_*` (ADR-012 c.6). El id del
// admin sale de la sesión; con service_role `auth.uid()` es nulo y la base no sabe quién llamó.
export async function hideReviewAction(
  reviewId: string,
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!moderationIdSchema.safeParse(reviewId).success) return { error: "Reseña inválida.", success: null };
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length === 0 || reason.length > MODERATION_REASON_MAX) {
    return { error: "El motivo va de 1 a 1000 caracteres.", success: null };
  }

  const { data, error } = await getAdminSupabaseClient().rpc("moderate_hide_review", {
    p_review_id: reviewId,
    p_admin_id: admin.id,
    p_reason: reason,
  });
  if (error) {
    console.error(`[moderacion] ocultar ${reviewId}: ${error.code}`);
    return { error: moderationError(error.code, "No se pudo ocultar la reseña."), success: null };
  }

  revalidateModeration();
  const n = Number(data ?? 0);
  const detalle = n === 0 ? "" : n === 1 ? " Se resolvió 1 reporte." : ` Se resolvieron ${n} reportes.`;
  return { error: null, success: `Reseña oculta.${detalle}` };
}

export async function unhideReviewAction(
  reviewId: string,
  _prevState: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!moderationIdSchema.safeParse(reviewId).success) return { error: "Reseña inválida.", success: null };

  const { data, error } = await getAdminSupabaseClient().rpc("moderate_unhide_review", {
    p_review_id: reviewId,
    p_admin_id: admin.id,
  });
  if (error) {
    console.error(`[moderacion] desocultar ${reviewId}: ${error.code}`);
    return { error: moderationError(error.code, "No se pudo volver a mostrar la reseña."), success: null };
  }
  if (data !== true) return { error: "La reseña no estaba oculta.", success: null };

  revalidateModeration();
  return { error: null, success: "La reseña vuelve a estar visible." };
}

export async function dismissReportAction(
  reportId: string,
  _prevState: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!moderationIdSchema.safeParse(reportId).success) return { error: "Reporte inválido.", success: null };

  const { data, error } = await getAdminSupabaseClient().rpc("moderate_dismiss_report", {
    p_report_id: reportId,
    p_admin_id: admin.id,
  });
  if (error) {
    console.error(`[moderacion] desestimar ${reportId}: ${error.code}`);
    return { error: moderationError(error.code, "No se pudo desestimar el reporte."), success: null };
  }
  if (data !== true) return { error: "Ese reporte ya estaba resuelto.", success: null };

  revalidateModeration();
  return { error: null, success: "Reporte desestimado. La reseña sigue visible." };
}

/**
 * T-031 · moderar un anuncio. Con el cliente de SESIÓN, no con service_role: así el guard exige y
 * firma `deleted_by = auth.uid()` y RLS decide por `profiles.role` (ADR-012, R-2), igual que Campus.
 */
export async function moderateAnnouncement(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const announcementId = String(formData.get("announcementId") ?? "");
  if (!idSchema.safeParse(announcementId).success) return { error: "Datos inválidos.", success: null };
  const parsed = announcementReasonSchema.safeParse({ reason: String(formData.get("reason") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Retirar exige un motivo.", success: null };

  const supabase = await createClient();
  const { error } = await retirar(supabase, { id: announcementId, moderatorId: admin.id, reason: parsed.data.reason });
  if (error) {
    console.error("[anuncios] moderación rechazada:", error.code, error.message);
    return { error: traducirErrorAnuncio(error, "No se pudo retirar el anuncio."), success: null };
  }

  revalidatePath("/panel/admin/anuncios");
  revalidatePath("/panel");
  revalidatePath("/cursos/[slug]", "page");
  return { error: null, success: "Anuncio retirado." };
}

const COURSE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** T-049: el formulario ya no recibe todas las cuentas y cursos; resuelve mail y slug en el
 *  servidor y delega en setEnrollmentAction, que sigue siendo el único que inscribe. */
export async function grantEnrollmentByEmailAction(
  prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const email = normalizeEmail(formData.get("email"));
  const courseSlug = String(formData.get("courseSlug") ?? "").trim().toLowerCase();
  if (!email || courseSlug.length > 120 || !COURSE_SLUG.test(courseSlug)) {
    return { error: "Datos inválidos.", success: null };
  }
  const target = await resolveGrantTarget({ email, courseSlug });
  if (!target.ok) return { error: target.error, success: null };

  const delegated = new FormData();
  delegated.set("userId", target.userId);
  delegated.set("courseId", target.courseId);
  delegated.set("status", "active");
  return setEnrollmentAction(prevState, delegated);
}

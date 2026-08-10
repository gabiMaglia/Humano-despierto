import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de service_role (bypassa RLS) — ADR-001: nunca se mezcla con el de sesión.
 * Uso EXCLUSIVO: leer/escribir columnas localizadoras de contenido pago
 * (`lessons.video_id`, `lesson_resources.drive_file_id`/`.url`) y otros campos de servidor
 * (`courses.status`, `lessons.is_published`/`duration_seconds`, `enrollments`,
 * `profiles.role`) — ADR-003 regla A. Cualquier otro uso de este cliente anula RLS sin que
 * nadie lo note; el llamador es responsable de verificar el permiso ANTES de invocarlo (este
 * cliente no verifica nada por sí mismo, sólo bypassa).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getLessonAccess } from "@/lib/server/lesson-player";

// Misma clase que extractDriveFileId (panel docente): lo que no tiene esa forma no se
// interpola en la URL de Drive, para que un valor raro no agregue parametros.
const DRIVE_FILE_ID = /^[A-Za-z0-9_-]{10,}$/;

/**
 * Destino del 302. `drive_file_id` gana porque es el que la docente cargo como archivo de
 * Drive (`url` guarda ademas el link original). Filas anteriores a la validacion del alta
 * pueden traer cualquier texto en `url`: solo http(s), o se deniega.
 */
export function resourceRedirectTarget(locator: { driveFileId: string | null; url: string | null }): string | null {
  if (locator.driveFileId && DRIVE_FILE_ID.test(locator.driveFileId)) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(locator.driveFileId)}`;
  }
  if (!locator.url) return null;
  try {
    const parsed = new URL(locator.url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * ADR-003 regla A + R-8: el localizador se lee con service_role solo despues de que
 * getLessonAccess (cliente de sesion) dio acceso. Sin acceso no se consulta `lesson_resources`:
 * "no existe", "es de otro curso" y "es de esta leccion" recorren las mismas consultas.
 * `null` = denegar; el handler no distingue el motivo.
 */
export async function getLessonResourceRedirect(lessonId: string, resourceId: string): Promise<string | null> {
  const access = await getLessonAccess(lessonId);
  if (!access?.hasAccess) return null;

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("lesson_resources")
    .select("lesson_id, drive_file_id, url")
    .eq("id", resourceId)
    .maybeSingle();

  // El mensaje de Postgres no sale de aca: el handler lo loguea y responde 403 vacio.
  if (error) throw new Error(`No se pudo leer el recurso (${error.code ?? "sin código"})`);
  // Un id de recurso ajeno colgado de una leccion propia no abre nada.
  if (!data || data.lesson_id !== access.lessonId) return null;

  return resourceRedirectTarget({ driveFileId: data.drive_file_id, url: data.url });
}

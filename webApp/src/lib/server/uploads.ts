import "server-only";
import { connection } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { log } from "@/lib/server/log";

// Bucket privado unico (S-D): `avatars/<uid>/` (T-042) y `covers/<course_id>/` (T-047).
export const UPLOADS_BUCKET = "uploads";

// Una hora. Ninguna pagina que muestre una URL firmada puede cachearse mas que esto, y ninguna
// puede prerenderizarse: por eso la firma publica pasa por `connection()`.
export const SIGNED_URL_TTL_SECONDS = 3600;

type StorageClient = Pick<SupabaseClient, "storage">;

export async function signUploadUrl(client: StorageClient, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage.from(UPLOADS_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return error ? null : data.signedUrl;
}

/** Una llamada por pagina, no una por card. Un objeto que falta solo saca SU url del mapa. */
export async function signUploadUrls(client: StorageClient, paths: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data, error } = await client.storage.from(UPLOADS_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    log.error("uploads_sign_failed", { message: error?.message });
    return urls;
  }
  for (const item of data) if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  return urls;
}

/**
 * Firma para paginas publicas. service_role porque `anon` no tiene SELECT sobre storage.objects.
 * El llamador garantiza que cada path salio de una fila que `anon` ya puede leer (curso publicado,
 * ficha de docente); nunca se firma un path que vino del request.
 */
export async function signPublicUploadUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  await connection();
  return signUploadUrls(createServiceRoleClient(), paths);
}

/**
 * Sube con service_role (D-34: ninguna sesion escribe en `uploads`). El llamador ya valido los
 * bytes, la pertenencia y armo el path; aca no se verifica nada de eso.
 */
export async function uploadAsServer(path: string, bytes: Uint8Array, contentType: string) {
  return createServiceRoleClient().storage.from(UPLOADS_BUCKET).upload(path, bytes, { contentType, upsert: false });
}

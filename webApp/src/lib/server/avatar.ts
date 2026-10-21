import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "uploads";

// Una hora: `/guias/[slug]` no puede cachearse mas que esto o sirve una imagen que ya no abre.
export const AVATAR_URL_TTL_SECONDS = 3600;

/**
 * Firma el avatar con el cliente que le pasen. El de sesion firma lo propio (policy de SELECT de
 * 0028); la ficha publica usa service_role porque `anon` no tiene SELECT sobre `storage.objects`.
 * El path ya paso por el guard de carpeta: firmarlo no puede exponer el archivo de otra persona.
 */
export async function signAvatarUrl(
  client: Pick<SupabaseClient, "storage">,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage.from(AVATAR_BUCKET).createSignedUrl(path, AVATAR_URL_TTL_SECONDS);
  return error ? null : data.signedUrl;
}

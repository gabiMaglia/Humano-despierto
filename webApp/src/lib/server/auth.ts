import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, AuthUser } from "@/lib/stores/useAuthStore";

/**
 * Lee la sesión real en el servidor y resuelve el rol contra `profiles.role`
 * (autoridad de permisos — ADR-006, nunca el claim del JWT). `null` si no hay
 * sesión válida o el perfil no existe.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, glyph, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    glyph: profile.glyph,
    role: profile.role as AppRole,
  };
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signAvatarUrl } from "@/lib/server/avatar";
import type { AppRole } from "@/lib/stores/useAuthStore";

export interface OwnProfile {
  id: string;
  role: AppRole;
  fullName: string;
  bio: string | null;
  glyph: string | null;
  phone: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
}

interface PrivateRow {
  phone: string | null;
  birth_date: string | null;
}

export async function getOwnProfile(): Promise<OwnProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // `phone` y `birth_date` no tienen grant de SELECT (0028): su unica lectura es la funcion.
  const [profileRes, privateRes] = await Promise.all([
    supabase.from("profiles").select("full_name, bio, glyph, role, avatar_path").eq("id", user.id).single(),
    supabase.rpc("my_private_profile").maybeSingle<PrivateRow>(),
  ]);

  if (profileRes.error || !profileRes.data) return null;
  if (privateRes.error) {
    throw new Error(`No se pudieron leer tus datos privados: ${privateRes.error.message}`);
  }

  const p = profileRes.data;
  return {
    id: user.id,
    role: p.role as AppRole,
    fullName: p.full_name,
    bio: p.bio,
    glyph: p.glyph,
    phone: privateRes.data?.phone ?? null,
    birthDate: privateRes.data?.birth_date ?? null,
    avatarUrl: await signAvatarUrl(supabase, p.avatar_path),
  };
}

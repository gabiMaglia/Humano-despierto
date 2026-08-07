"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type AppRole } from "@/lib/stores/useAuthStore";

interface ProfileRow {
  full_name: string | null;
  glyph: string | null;
  role: AppRole;
}

/**
 * Puebla `useAuthStore` con la sesión real vía `onAuthStateChange` (dispara
 * de inmediato con el estado actual al suscribirse — cubre login, logout y
 * refresh de token sin recargar). Solo pinta UI (Nav): la autoridad de
 * permisos vive en el servidor contra `profiles.role`, nunca acá.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      const authedUser = session.user;

      void supabase
        .from("profiles")
        .select("full_name, glyph, role")
        .eq("id", authedUser.id)
        .single()
        .then(({ data: profile }: { data: ProfileRow | null }) => {
          setUser({
            id: authedUser.id,
            email: authedUser.email ?? null,
            fullName: profile?.full_name ?? null,
            glyph: profile?.glyph ?? null,
            role: profile?.role ?? "student",
          });
        });
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}

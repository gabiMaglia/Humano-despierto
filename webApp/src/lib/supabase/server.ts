import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de sesión (anon key + JWT del usuario, sujeto a RLS) para Server
 * Components / Server Actions / Route Handlers. NUNCA service_role — ADR-001.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llamó desde un Server Component (no puede escribir cookies).
            // El middleware ya se encarga de refrescar la sesión en cada request.
          }
        },
      },
    },
  );
}

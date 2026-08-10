import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de SERVICE_ROLE (bypassa RLS por completo — ADR-001, ADR-002).
 * Uso exclusivo: las operaciones que el esquema le niega al cliente —
 * `profiles.role`, `enrollments`, `courses.status` — y solo después de que
 * quien llama verificó `role === 'admin'` contra `profiles` (nunca el claim
 * del JWT, ADR-006). Nunca se usa para servir lectura ordinaria: eso anula
 * RLS sin que nadie lo note (T-001).
 *
 * `import 'server-only'` es la única barrera entre esta key y el bundle del
 * browser: cualquier archivo bajo `src/lib/server/` que la importe debe
 * empezar igual.
 */
export function getAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente de LECTURA PUBLICA (anon key, sujeto a RLS + grants por columna de
// supabase/migrations/…0003_privileges.sql). Sirve el catalogo y el detalle de curso, que
// no requieren sesion. NO es el cliente de sesion del usuario (JWT + cookies) que T-002
// va a introducir para las rutas que sí necesitan "quién sos" — no lo reemplaza ni lo
// anticipa; si T-002 ya trae uno cuando esto se mergee, unificar ahí (ADR-001 solo pide
// no mezclar este cliente con el de service_role, no prohíbe tener más de un cliente
// anon). NUNCA usar service_role acá: este archivo es de lectura pública, sin excepción.
export function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno."
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

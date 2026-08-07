import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de sesión (anon key + JWT del usuario, sujeto a RLS) para el browser.
 * Singleton: evita el warning "Multiple GoTrueClient instances" al reusar la
 * misma instancia en vez de crear una por componente.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}

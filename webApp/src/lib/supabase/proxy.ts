import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión (si hace falta) contra las cookies del request y devuelve
 * las claims del JWT ya validado. Autoridad "orientativa" (ADR-006): sirve
 * para ruteo/UI en el proxy (`src/proxy.ts`), nunca para decidir permisos
 * sobre datos.
 */
export async function updateSession(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          proxyResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            proxyResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : (data?.claims ?? null);

  return { proxyResponse, claims };
}

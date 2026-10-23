import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/server/supabase-admin";
import { acceptInvitation } from "@/lib/server/invitations";
import { resolveInvitationVisit } from "@/lib/server/invitation-visit";
import { withRateLimit } from "@/lib/server/rate-limit";
import type { RateLimitDenied } from "@/lib/rate-limit/core";

// El token va en el path: que no quede en caches compartidas ni salga como Referer.
const HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

function tooManyRequests(rejected: RateLimitDenied): Response {
  return new Response(null, { status: 429, headers: { ...HEADERS, "Retry-After": String(rejected.retryAfter) } });
}

// Route Handler y no página: después de aceptar hay que reescribir las cookies de sesión
// (refreshSession), y un Server Component no puede escribir cookies.
export const GET = withRateLimit(
  "invitationGet",
  async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
    const { token } = await params;
    const supabase = await createClient();

    const destination = await resolveInvitationVisit(token, {
      userId: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
      accept: (t, userId) => acceptInvitation({ token: t, userId }),
      refreshSession: async () => {
        const { error } = await supabase.auth.refreshSession();
        if (error) throw error;
      },
      roleOf: async (userId) => {
        const { data } = await getAdminSupabaseClient().from("profiles").select("role").eq("id", userId).maybeSingle();
        return data?.role ?? null;
      },
    });

    const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));
    for (const [k, v] of Object.entries(HEADERS)) response.headers.set(k, v);
    return response;
  },
  tooManyRequests,
);

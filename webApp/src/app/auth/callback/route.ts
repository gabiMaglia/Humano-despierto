import { after, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthCallback } from "@/lib/server/auth-callback";
import { notifyWelcome } from "@/lib/server/mail/notify";

// Único lugar donde una sesión nace de un link de mail (confirmación, recuperación y, en T-041,
// Google). Por eso la bienvenida sale de acá: `mail_log` (scope "account") la deja en una por cuenta.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const outcome = await resolveAuthCallback(supabase, request.nextUrl.searchParams);

  if (outcome.kind === "session" && outcome.sendWelcome) {
    const { userId } = outcome;
    // `after` y no una promesa suelta: el redirect no espera al SMTP y el envío no muere con la respuesta.
    after(() => notifyWelcome({ userId }));
  }

  return NextResponse.redirect(new URL(outcome.destination, request.nextUrl.origin));
}

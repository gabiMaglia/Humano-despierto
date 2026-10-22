"use server";

import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { getSiteUrl } from "@/lib/server/site-url";
import { emailSchema } from "@/lib/validation/auth";
import { firstIssueMessage } from "@/lib/validation/teacher";
import { AUTH_COPY } from "@/lib/auth/messages";
import { RECOVERY_NEXT, callbackUrl } from "@/lib/auth/paths";
import type { ResetRequestState } from "@/lib/auth/action-state";
import { log } from "@/lib/server/log";

export async function requestPasswordResetAction(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "invalid", message: firstIssueMessage(parsed.error) };

  // La llamada se hace siempre y su resultado no cambia la respuesta: ni el texto ni el camino
  // de código delatan si la cuenta existe (c.5). Un 429 tampoco.
  try {
    const supabase = await createClient();
    // Origen confiable + safeNext (regla de la ronda 2): nunca el header Origin, que un POST
    // directo controla. Si el navegador usa otro host que SITE_URL, el canje falla cerrado
    // en /entrar?error=link porque la cookie del verificador PKCE no viaja.
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: callbackUrl(getSiteUrl(), safeNext(RECOVERY_NEXT)),
    });
    if (error) log.error("auth_reset_password_failed", { pg_code: error.code ?? error.status });
  } catch (err) {
    log.error("auth_reset_password_threw", { err });
  }

  return { status: "sent", message: AUTH_COPY.resetSent };
}

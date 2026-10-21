"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/server/site-url";
import { emailSchema } from "@/lib/validation/auth";
import { firstIssueMessage } from "@/lib/validation/teacher";
import { AUTH_COPY } from "@/lib/auth/messages";
import { RECOVERY_NEXT, callbackUrl } from "@/lib/auth/paths";
import type { ResetRequestState } from "@/lib/auth/action-state";

// El verificador PKCE queda en una cookie del origen que hizo el pedido; el link tiene que volver
// a ese mismo origen o el canje falla. Next ya rechaza Server Actions cuyo Origin no coincide con
// el Host, y GoTrue solo redirige a URLs de `additional_redirect_urls`.
async function requestOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin && /^https?:\/\/[^/\s]+$/.test(origin) ? origin : getSiteUrl();
}

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
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: callbackUrl(await requestOrigin(), RECOVERY_NEXT),
    });
    if (error) console.error(`[auth] resetPasswordForEmail: ${error.code ?? error.status}`);
  } catch (err) {
    console.error("[auth] resetPasswordForEmail lanzó:", err instanceof Error ? err.message : err);
  }

  return { status: "sent", message: AUTH_COPY.resetSent };
}

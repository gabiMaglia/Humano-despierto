import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/safe-next";
import { LINK_ERROR_PATH, RECOVERY_NEXT } from "@/lib/auth/paths";

// Solo el método que se usa: el test pasa un fake con este único método.
export interface ExchangeClient {
  auth: Pick<SupabaseClient["auth"], "exchangeCodeForSession">;
}

export type CallbackOutcome =
  | { kind: "session"; destination: string; userId: string; sendWelcome: boolean }
  | { kind: "error"; destination: string };

const LINK_ERROR: CallbackOutcome = { kind: "error", destination: LINK_ERROR_PATH };

export async function resolveAuthCallback(
  supabase: ExchangeClient,
  params: URLSearchParams,
): Promise<CallbackOutcome> {
  const code = params.get("code");
  if (!code) return LINK_ERROR;

  // auth-js solo agrega sb_flow_id con un flag experimental; sin él lee la cookie legacy del
  // verificador. Reenviarlo cuando viene evita quemar el code con el verificador de otro flujo.
  const flowId = params.get("sb_flow_id");

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error || !data.user) {
      console.error(`[auth] callback rechazado: ${error?.code ?? "sin usuario"}`);
      return LINK_ERROR;
    }
    const destination = safeNext(params.get("next"));
    // Pedir un reset no es darse de alta: una cuenta anterior a T-020 sin fila `welcome` no
    // tiene que recibir "Bienvenida" por olvidarse la clave.
    return { kind: "session", destination, userId: data.user.id, sendWelcome: destination !== RECOVERY_NEXT };
  } catch (err) {
    console.error("[auth] callback lanzó:", err instanceof Error ? err.message : err);
    return LINK_ERROR;
  }
}

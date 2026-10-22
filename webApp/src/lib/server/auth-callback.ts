import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { internalNext } from "@/lib/auth/safe-next";
import { DEFAULT_NEXT, LINK_ERROR_PATH, RECOVERY_NEXT, homeForRole } from "@/lib/auth/paths";
import { log } from "@/lib/server/log";

// Solo lo que se usa: el test pasa un fake con el canje y la lectura de `profiles`.
export interface ExchangeClient {
  auth: Pick<SupabaseClient["auth"], "exchangeCodeForSession">;
  from: SupabaseClient["from"];
}

export type CallbackOutcome =
  | { kind: "session"; destination: string; userId: string; sendWelcome: boolean }
  | { kind: "error"; destination: string };

const LINK_ERROR: CallbackOutcome = { kind: "error", destination: LINK_ERROR_PATH };

// c.9 de T-040 para todo login que pasa por acá (Google, confirmación de mail). El rol sale de
// `profiles` (R-2), no del claim del JWT recién emitido. La sesión ya existe, así que un fallo de
// lectura no es un error de link: cae en el panel que sirve a cualquier rol.
async function homeFromProfile(supabase: ExchangeClient, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (error) {
      log.error("auth_callback_role_missing", { pg_code: error.code ?? "desconocido" });
      return DEFAULT_NEXT;
    }
    return homeForRole(data?.role);
  } catch (err) {
    log.error("auth_callback_role_threw", { err });
    return DEFAULT_NEXT;
  }
}

export async function resolveAuthCallback(
  supabase: ExchangeClient,
  params: URLSearchParams,
): Promise<CallbackOutcome> {
  const code = params.get("code");
  if (!code) return LINK_ERROR;

  // auth-js solo agrega sb_flow_id con un flag experimental; sin él lee la cookie legacy del
  // verificador. Reenviarlo cuando viene evita quemar el code con el verificador de otro flujo.
  const flowId = params.get("sb_flow_id");

  let userId: string;
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error || !data.user) {
      log.error("auth_callback_rejected", { pg_code: error?.code ?? "sin usuario" });
      return LINK_ERROR;
    }
    userId = data.user.id;
  } catch (err) {
    log.error("auth_callback_threw", { err });
    return LINK_ERROR;
  }

  const next = internalNext(params.get("next"));
  const destination = next ?? (await homeFromProfile(supabase, userId));
  // Pedir un reset no es darse de alta: una cuenta anterior a T-020 sin fila `welcome` no tiene
  // que recibir "Bienvenida" por olvidarse la clave. Se decide sobre el `next` pedido.
  return { kind: "session", destination, userId, sendWelcome: next !== RECOVERY_NEXT };
}

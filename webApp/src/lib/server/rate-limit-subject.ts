import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { clientIpFrom, type RateLimitSubject } from "@/lib/rate-limit/core";

/**
 * Quién gasta el cupo: el `sub` del JWT verificado si hay sesión, si no la IP. `getClaims()` verifica
 * la firma localmente con clave asimétrica y cae a `getUser()` con HS256 (stack local): un `sub`
 * inventado no consigue un cupo nuevo. Cualquier falla acá cuenta como anónimo, nunca corta la action.
 */
export async function currentRateLimitSubject(): Promise<RateLimitSubject> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (typeof sub === "string" && sub.length > 0) return { kind: "user", id: sub };
  } catch {
    // Sin cookies legibles o GoTrue caído: se limita por IP.
  }
  try {
    return { kind: "ip", ip: clientIpFrom(await headers()) };
  } catch {
    return { kind: "ip", ip: "unknown" };
  }
}

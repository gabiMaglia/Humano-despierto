"use server";

import { getCurrentUser } from "@/lib/server/auth";
import { internalNext } from "@/lib/auth/safe-next";
import { homeForRole } from "@/lib/auth/paths";

/**
 * c.9: adónde va el login. Corre después de `signInWithPassword`, así que la cookie de sesión ya
 * viaja en este request. El rol sale de `profiles.role` vía `getCurrentUser` (R-2): el claim del
 * JWT recién emitido podría estar viejo si el rol cambió. `next` se vuelve a sanear acá porque
 * lo manda el cliente.
 */
export async function postLoginDestinationAction(rawNext: string | null): Promise<string> {
  const next = internalNext(rawNext);
  if (next) return next;
  const user = await getCurrentUser();
  return homeForRole(user?.role);
}

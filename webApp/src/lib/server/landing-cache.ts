import "server-only";
import { revalidateTag } from "next/cache";

export const LANDING_TAG = "landing";

/** Lo llama toda action que cambia lo que leen los lectores cacheados de la portada (conteos,
 *  disciplinas, testimonios). `expire: 0`: un testimonio oculto por moderación no puede seguir
 *  visible mientras la caché se renueva en segundo plano. */
export function revalidateLanding(): void {
  revalidateTag(LANDING_TAG, { expire: 0 });
}

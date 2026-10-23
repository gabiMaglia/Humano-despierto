"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/server/rate-limit";

export interface WishlistResult {
  ok: boolean;
  /** El estado que quedó en la base; el botón se alinea con esto, no con lo que pidió. */
  saved: boolean;
}

const idSchema = z.string().uuid();
const UNIQUE_VIOLATION = "23505";

/**
 * T-033 · guardar o quitar. Cliente de SESIÓN: la dueña y "curso publicado" las deciden grant +
 * RLS (0033), no esta función. Idempotente a propósito: recibe el estado deseado, no "invertir",
 * así un doble click o un botón desactualizado no deja la base al revés de lo que se ve.
 */
export const setWishlistAction = withRateLimit(
  "setWishlistAction",
  async function setWishlistAction(courseId: string, save: boolean): Promise<WishlistResult> {
    const failed: WishlistResult = { ok: false, saved: !save };
    if (!idSchema.safeParse(courseId).success) return failed;

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return failed;

    const { error } = save
      ? await supabase.from("course_wishlist").insert({ user_id: uid, course_id: courseId })
      : await supabase.from("course_wishlist").delete().eq("user_id", uid).eq("course_id", courseId);

    // Guardar lo ya guardado es el resultado que se pidió.
    if (error && error.code !== UNIQUE_VIOLATION) return failed;

    revalidatePath("/panel");
    return { ok: true, saved: save };
  },
  (_denied, [, save]) => ({ ok: false, saved: !save }),
);

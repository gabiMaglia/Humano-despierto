/**
 * Forma de retorno de un Server Action usado con `useActionState`. Sin `server-only`: los Client
 * Components importan el valor inicial. `TeacherActionState` y el de admin tienen la misma forma;
 * unificarlos queda como deuda (no es alcance de T-042).
 */
import type { RateLimitFields } from "@/lib/rate-limit/core";
export interface ActionState extends RateLimitFields {
  error: string | null;
  success: string | null;
}

export const ACTION_INITIAL_STATE: ActionState = { error: null, success: null };

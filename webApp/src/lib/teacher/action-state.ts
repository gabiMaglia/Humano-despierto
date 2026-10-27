/**
 * Shape de retorno de los Server Actions del panel docente (T-005), usado con
 * `useActionState`. Sin `server-only` a propósito — mismo motivo que
 * `lib/admin/action-state.ts` (T-008): es solo forma de datos, y los
 * componentes cliente necesitan importar `TEACHER_ACTION_INITIAL_STATE` por
 * su VALOR. Importar un valor desde un módulo `server-only` (como
 * `lib/server/teacher.ts`) rompe el build de Next apenas un Client Component
 * lo toca.
 */
import type { RateLimitFields } from "@/lib/rate-limit/core";
export interface TeacherActionState extends RateLimitFields {
  error: string | null;
  success: string | null;
  /** `name` del campo culpable de `error`; ausente si el error es del formulario entero (D-100). */
  field?: string;
}

export const TEACHER_ACTION_INITIAL_STATE: TeacherActionState = { error: null, success: null };

/** El error de `state` si es de este campo; si no, null. */
export function fieldError(state: TeacherActionState, field: string): string | null {
  return state.field === field ? state.error : null;
}

/** El error que no es de ningún campo: el que va junto al botón. */
export function formError(state: TeacherActionState): string | null {
  return state.field ? null : state.error;
}

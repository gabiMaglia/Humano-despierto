/**
 * Shape de retorno de los Server Actions del panel docente (T-005), usado con
 * `useActionState`. Sin `server-only` a propósito — mismo motivo que
 * `lib/admin/action-state.ts` (T-008): es solo forma de datos, y los
 * componentes cliente necesitan importar `TEACHER_ACTION_INITIAL_STATE` por
 * su VALOR. Importar un valor desde un módulo `server-only` (como
 * `lib/server/teacher.ts`) rompe el build de Next apenas un Client Component
 * lo toca.
 */
export interface TeacherActionState {
  error: string | null;
  success: string | null;
}

export const TEACHER_ACTION_INITIAL_STATE: TeacherActionState = { error: null, success: null };

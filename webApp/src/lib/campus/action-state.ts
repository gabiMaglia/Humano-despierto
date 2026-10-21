/**
 * Shape de retorno de los Server Actions de `circulo/actions.ts`, usado con
 * `useActionState` en los componentes cliente. Sin `server-only` a propósito
 * — mismo patrón que `lib/admin/action-state.ts` / `lib/teacher/action-state.ts`:
 * es solo forma de datos, y los componentes cliente importan el valor
 * `CAMPUS_ACTION_INITIAL_STATE` (importar eso desde un módulo `server-only`
 * arrastraría ese sentinel al bundle del browser, que Next rechaza en build).
 */
export interface CampusActionState {
  error: string | null;
  success: string | null;
}

export const CAMPUS_ACTION_INITIAL_STATE: CampusActionState = { error: null, success: null };

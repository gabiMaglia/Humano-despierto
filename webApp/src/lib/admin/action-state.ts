/**
 * Shape de retorno de los Server Actions de `panel/admin/actions.ts`, usado
 * con `useActionState` en los formularios cliente. Vive en un archivo SIN
 * `server-only` a propósito: es solo forma de datos, sin secreto ni acceso a
 * `service_role`, y los componentes cliente lo importan por su valor
 * (`ADMIN_ACTION_INITIAL_STATE`). Importar ese valor desde
 * `src/lib/server/admin.ts` arrastraría todo ese módulo —y su sentinel
 * `server-only`— al bundle del browser, que Next rechaza en build (falla
 * real medida, no hipotética).
 */
export interface AdminActionState {
  error: string | null;
  success: string | null;
}

export const ADMIN_ACTION_INITIAL_STATE: AdminActionState = { error: null, success: null };

// Fuera del archivo "use server": ahí solo se exportan funciones async y los formularios cliente
// necesitan el estado inicial como valor.
export interface QaActionState {
  error: string | null;
  success: string | null;
}

export const QA_ACTION_INITIAL_STATE: QaActionState = { error: null, success: null };

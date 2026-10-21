// Fuera de los archivos "use server": esos solo pueden exportar funciones async, y los
// formularios cliente necesitan el estado inicial como valor.
export interface ResetRequestState {
  status: "idle" | "invalid" | "sent";
  message: string | null;
}
export const RESET_REQUEST_INITIAL_STATE: ResetRequestState = { status: "idle", message: null };

export interface PasswordUpdateState {
  error: string | null;
}
export const PASSWORD_UPDATE_INITIAL_STATE: PasswordUpdateState = { error: null };

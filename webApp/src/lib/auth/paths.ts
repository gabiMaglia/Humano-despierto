// Sin `server-only`: lo usan el formulario cliente de /entrar, las Server Actions y el callback.
export const DEFAULT_NEXT = "/panel";
export const RECOVER_PATH = "/entrar/recuperar";
export const RECOVERY_NEXT = "/entrar/nueva-clave";
export const LINK_ERROR_PATH = "/entrar?error=link";

export function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

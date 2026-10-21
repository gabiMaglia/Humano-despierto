// Sin `server-only`: lo usan el formulario cliente de /entrar, las Server Actions y el callback.
export const DEFAULT_NEXT = "/panel";
export const RECOVER_PATH = "/entrar/recuperar";
export const RECOVERY_NEXT = "/entrar/nueva-clave";
export const LINK_ERROR_PATH = "/entrar?error=link";

export function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

// c.9: destino tras login sin `next`. El rol tiene que venir de `profiles` (R-2), no del claim.
export function homeForRole(role: string | null | undefined): string {
  if (role === "admin") return "/panel/admin";
  if (role === "teacher") return "/panel/docente";
  return DEFAULT_NEXT;
}

// Sin `server-only`: lo usan el formulario cliente de /entrar, las Server Actions y el callback.
export const DEFAULT_NEXT = "/panel";
export const RECOVER_PATH = "/entrar/recuperar";
export const RECOVERY_NEXT = "/entrar/nueva-clave";
export const LINK_ERROR_PATH = "/entrar?error=link";

// `null` deja el callback sin `next` para que elija por `profiles.role` (c.9); `**` en
// `additional_redirect_urls` también acepta la URL sin query.
export function callbackUrl(origin: string, next: string | null): string {
  const base = `${origin}/auth/callback`;
  return next === null ? base : `${base}?next=${encodeURIComponent(next)}`;
}

// c.9: destino tras login sin `next`. El rol tiene que venir de `profiles` (R-2), no del claim.
export function homeForRole(role: string | null | undefined): string {
  if (role === "admin") return "/panel/admin";
  if (role === "teacher") return "/panel/docente";
  return DEFAULT_NEXT;
}

export const INVITATION_PREFIX = "/invitacion/";

// T-049: /invitacion/<token> es un Route Handler que escribe cookies y redirige; el router del
// cliente lo pediría como payload RSC. Se navega como documento.
export function needsDocumentNavigation(path: string): boolean {
  return path.startsWith(INVITATION_PREFIX);
}

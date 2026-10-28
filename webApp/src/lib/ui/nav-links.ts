import type { AppRole } from "@/lib/stores/useAuthStore";

export interface NavLink {
  label: string;
  href: string;
}

const PUBLIC: NavLink[] = [
  { label: "Cursos", href: "/cursos" },
  { label: "Guías", href: "/guias" },
  { label: "Diario", href: "/diario" },
  { label: "Tarot", href: "/tarot" },
];

/** Una sola lista para el header de escritorio y el menú móvil: lo que se ve en uno existe en el
 *  otro. El rol sólo decide qué se pinta; la autoridad es `profiles.role` en el servidor. */
export function headerLinks(session: { role: AppRole } | null): NavLink[] {
  if (!session) return PUBLIC;
  const own: NavLink[] = [{ label: "Círculo", href: "/circulo" }];
  if (session.role === "teacher") own.push({ label: "Panel docente", href: "/panel/docente" });
  if (session.role === "admin") own.push({ label: "Panel admin", href: "/panel/admin" });
  return [...PUBLIC, ...own];
}

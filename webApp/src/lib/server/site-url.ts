import 'server-only';

/** `SITE_URL` (server-only, sin `NEXT_PUBLIC_`) es la única fuente del host absoluto que sale de
 * este servidor: los links DENTRO de un mail y las URLs canónicas del sitemap y del Open Graph.
 * Nunca el host del request que lo disparó — en dev es el puerto suelto de cada worktree y en
 * producción sería el URL interno equivocado. Sin la env seteada nada se rompe, pero el link no
 * sirve fuera de esta máquina: por eso el fallback queda, y nunca en silencio. */
export function getSiteUrl(): string {
  const configured = process.env.SITE_URL;
  if (!configured) {
    console.error("[site-url] SITE_URL no está seteada — los links absolutos apuntan a localhost.");
  }
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}

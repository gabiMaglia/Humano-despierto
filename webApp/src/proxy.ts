import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// T-006 (rechazo 1): `/leccion` sale de acá. El proxy no puede saber sin ir a la base si una
// lección es `is_preview` (T-004 ya promete que una vista previa se ve sin inscripción), y una
// consulta por request en el middleware sale cara. La página ya resuelve el acceso del lado del
// servidor (`getLessonPlayerData`: inscripción activa o `is_preview`, ADR-003) — la decisión
// queda donde ya está la lógica, no duplicada acá. Por eso además `leccion/[id]` se movió fuera
// del grupo `(app)`: su layout también redirigía a cualquier anónimo antes de llegar a la página.
const PROTECTED_PREFIXES = ["/panel", "/inscribirme"];

// Rutas de T-005/T-008 (paneles docente/admin) — el guard ya existe aunque
// las páginas todavía no. Claim del JWT (ADR-006: autoridad "orientativa"
// para ruteo, nunca para permisos sobre datos).
const ROLE_GUARDED: { prefix: string; role: string }[] = [
  { prefix: "/panel/admin", role: "admin" },
  { prefix: "/panel/docente", role: "teacher" },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return NextResponse.next();
  }

  const { proxyResponse, claims } = await updateSession(request);

  if (!claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    proxyResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const roleRule = ROLE_GUARDED.find((rule) => matchesPrefix(pathname, rule.prefix));
  if (roleRule && claims.user_role !== roleRule.role) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    const redirectResponse = NextResponse.redirect(url);
    proxyResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return proxyResponse;
}

export const config = {
  matcher: ["/panel/:path*", "/inscribirme/:path*"],
};

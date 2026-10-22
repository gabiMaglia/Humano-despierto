import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

// T-006 (rechazo 1): `/leccion` sale de acá. El proxy no puede saber sin ir a la base si una
// lección es `is_preview` (T-004 ya promete que una vista previa se ve sin inscripción), y una
// consulta por request en el middleware sale cara. La página ya resuelve el acceso del lado del
// servidor (`getLessonPlayerData`: inscripción activa o `is_preview`, ADR-003) — la decisión
// queda donde ya está la lógica, no duplicada acá. Por eso además `leccion/[id]` se movió fuera
// del grupo `(app)`: su layout también redirigía a cualquier anónimo antes de llegar a la página.
const PROTECTED_PREFIXES = ["/panel"];

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
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    siteUrl: process.env.SITE_URL,
    isDev: process.env.NODE_ENV === "development",
    enforce: process.env.CSP_ENFORCE === "true",
  });
  // Next toma el nonce de la cabecera CSP del REQUEST (CSP o CSP-Report-Only) y lo pone en sus
  // <script>. Se escribe sobre request.headers para que tambien lo vea el NextResponse.next({ request })
  // que arma updateSession al refrescar cookies.
  request.headers.set(csp.name, csp.value);
  request.headers.set("x-nonce", nonce);
  // Lo lee lib/server/log.ts para atar cada linea de log a su request (T-051).
  const requestId = crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  const response = await route(request);
  response.headers.set("x-request-id", requestId);
  // Un redirect no tiene documento: no necesita politica.
  if (!response.headers.has("location")) response.headers.set(csp.name, csp.value);
  return response;
}

async function route(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    // Sin `request` el override de cabeceras (nonce) no llega al render.
    return NextResponse.next({ request });
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
  // Todo menos estaticos: la CSP va en cada documento, y updateSession sigue corriendo solo
  // para PROTECTED_PREFIXES (ampliar el matcher no agrega una consulta a la base por request).
  // Sin `missing: next-router-prefetch`: excluir prefetches saltearia tambien el guard de auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

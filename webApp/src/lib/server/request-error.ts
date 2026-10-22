import "server-only";
import { log } from "@/lib/server/log";

type RequestInfo = { path: string; method: string; headers: unknown };
type ErrorContext = { routerKind: string; routePath: string; routeType: string };

// Punto de enganche para un tracker externo (Sentry u otro): hoy solo el log propio.
// El dia que haya DSN, el cambio es llamar al SDK aca y en global-error.tsx.
export async function reportRequestError(err: unknown, request: RequestInfo, context: ErrorContext): Promise<void> {
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  // Sin query: puede traer tokens de enlaces de correo.
  const path = request.path.split("?")[0];
  await log.error("request_error", {
    digest,
    path,
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
    err,
  });
}

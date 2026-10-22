import type { NextRequest } from "next/server";
import { getLessonResourceRedirect } from "@/lib/server/lesson-resources";
import { log } from "@/lib/server/log";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un 302 cacheado por un proxy compartido le serviria el localizador a la siguiente persona.
const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

// Una sola forma de decir que no: sin sesion, sin inscripcion, inexistente, de otro curso o
// malformado responden identico. Un 404 confirmaria que el recurso existe (T-006 c.2/c.3).
function denied(): Response {
  return new Response(null, { status: 403, headers: HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> },
): Promise<Response> {
  const { id, resourceId } = await params;
  if (!UUID.test(id) || !UUID.test(resourceId)) return denied();

  let target: string | null;
  try {
    target = await getLessonResourceRedirect(id, resourceId);
  } catch (err) {
    log.error("resource_unresolved", { resource_id: resourceId, err });
    return denied();
  }
  if (!target) return denied();

  // 302 y no NextResponse.redirect (307 por defecto): lo pide el spec y deja el handler sin runtime de Next.
  return new Response(null, { status: 302, headers: { ...HEADERS, Location: target } });
}

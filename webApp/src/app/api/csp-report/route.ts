import { NextResponse } from "next/server";
import { log } from "@/lib/server/log";
import { MAX_CSP_REPORT_BYTES, parseCspReport } from "@/lib/security/csp-report";

// Anonimo a proposito: el navegador no manda sesion con el reporte. Por eso tope de tamano,
// solo los content-type que usan los navegadores, y nada de lo recibido vuelve en la respuesta.
// Sin limite de tasa todavia: llega con T-050 (20/min por IP, spec SP-6).
const ACCEPTED = ["application/csp-report", "application/json", "application/reports+json"];

export async function POST(request: Request) {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ACCEPTED.includes(type)) return new NextResponse(null, { status: 415 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_CSP_REPORT_BYTES) return new NextResponse(null, { status: 413 });
  // El header puede mentir: se mide tambien lo leido.
  const raw = await request.text();
  if (raw.length > MAX_CSP_REPORT_BYTES) return new NextResponse(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const v = parseCspReport(body);
  if (!v) return new NextResponse(null, { status: 400 });

  await log.warn("csp_violation", {
    blocked_uri: v.blockedUri,
    violated_directive: v.violatedDirective,
    document_uri: v.documentUri,
    disposition: v.disposition,
  });
  return new NextResponse(null, { status: 204 });
}

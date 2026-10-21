// Puro y sin `server-only` para probarlo sin Next. Lo que entra aca lo manda cualquiera
// (el endpoint es anonimo): se normaliza, se trunca y se le quitan query y fragmento.

export const MAX_CSP_REPORT_BYTES = 16_384;
const MAX_FIELD = 500;

export interface CspViolation {
  blockedUri: string;
  violatedDirective: string;
  documentUri: string;
  disposition: string;
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX_FIELD) : "";
}

// Una URL firmada de Storage lleva ?token=<jwt> y /entrar/nueva-clave lleva un ?code= de un
// solo uso: nada despues de `?` o `#` llega al log.
export function redactUri(raw: string): string {
  try {
    const url = new URL(raw);
    url.search = "";
    url.hash = "";
    return url.toString().slice(0, MAX_FIELD);
  } catch {
    return raw.split(/[?#]/, 1)[0].slice(0, MAX_FIELD);
  }
}

function build(blocked: unknown, directive: unknown, doc: unknown, disposition: unknown): CspViolation | null {
  const violatedDirective = str(directive);
  if (!violatedDirective) return null;
  return {
    documentUri: redactUri(str(doc)),
    blockedUri: redactUri(str(blocked)),
    violatedDirective,
    disposition: str(disposition),
  };
}

export function parseCspReport(body: unknown): CspViolation | null {
  // report-uri (application/csp-report): { "csp-report": { ... } }
  if (isObj(body) && isObj(body["csp-report"])) {
    const r = body["csp-report"];
    return build(r["blocked-uri"], r["effective-directive"] ?? r["violated-directive"], r["document-uri"], r.disposition);
  }
  // Reporting API (application/reports+json): [{ type: "csp-violation", body: { ... } }]
  if (Array.isArray(body)) {
    const first = body.find((e) => isObj(e) && e.type === "csp-violation" && isObj(e.body));
    if (!first) return null;
    const r = (first as Obj).body as Obj;
    return build(r.blockedURL, r.effectiveDirective, r.documentURL, r.disposition);
  }
  return null;
}

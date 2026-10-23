// La politica se arma aca y no en proxy.ts para poder probarla sin levantar Next. Sin
// `server-only`: la importa el proxy, que no es un Server Component.

export const CSP_REPORT_PATH = "/api/csp-report";

export type CspHeaderName = "Content-Security-Policy" | "Content-Security-Policy-Report-Only";

export interface CspInput {
  nonce: string;
  supabaseUrl: string | undefined;
  siteUrl: string | undefined;
  isDev: boolean;
  enforce: boolean;
}

const YOUTUBE = "https://www.youtube.com";
// Vista previa de VideoAttachForm (nota QA T-027); el player usa el host de arriba.
const YOUTUBE_NOCOOKIE = "https://www.youtube-nocookie.com";
// Placeholders de fotografia (ADR-015). next/image los sirve desde /_next/image, pero un
// `unoptimized` o un fallo del optimizador cae al host original.
const UNSPLASH = "https://images.unsplash.com";
const NONCE_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function httpOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCsp(input: CspInput): { name: CspHeaderName; value: string } {
  if (!NONCE_RE.test(input.nonce)) throw new Error("CSP: nonce invalido");
  const supabase = httpOrigin(input.supabaseUrl);
  const extra = supabase ? [supabase] : [];

  const directives: string[][] = [
    ["default-src", "'self'"],
    // 'strict-dynamic' deja pasar lo que cargue un script con nonce (el iframe_api que inyecta
    // useYouTubePlayer); el host de YouTube queda para navegadores sin CSP3.
    ["script-src", "'self'", `'nonce-${input.nonce}'`, "'strict-dynamic'", YOUTUBE, ...(input.isDev ? ["'unsafe-eval'"] : [])],
    // Deliberado: hay style={{}} inline en landing y player, y un nonce aca anularia 'unsafe-inline'.
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "blob:", "data:", "https://i.ytimg.com", UNSPLASH, ...extra],
    ["font-src", "'self'"],
    ["connect-src", "'self'", ...extra],
    ["frame-src", YOUTUBE, YOUTUBE_NOCOOKIE],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'self'"],
    // Sin report-to: Chrome lo prefiere, lo manda por lotes y solo desde origen seguro.
    ["report-uri", CSP_REPORT_PATH],
  ];

  // En Report-Only el navegador la ignora, y por http local subiria Supabase a https.
  const siteIsHttps = httpOrigin(input.siteUrl)?.startsWith("https:") ?? false;
  if (input.enforce && !input.isDev && siteIsHttps) directives.push(["upgrade-insecure-requests"]);

  return {
    name: input.enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: directives.map((d) => d.join(" ")).join("; "),
  };
}

import "server-only";

// Mail con la paleta Brote (D-60): fondo cálido, papel blanco, tinta bosque, botón miel. Sin emojis
// ni imágenes remotas: el brote de la marca va como SVG inline (Gmail y Apple Mail lo muestran; los
// clientes que lo filtran, como Outlook, quedan con el nombre en texto, que está al lado). Tabla +
// estilos inline porque los clientes de mail no cargan hojas externas y Gmail poda el <style> de
// bloque. Plus Jakarta Sans solo se ve donde el cliente la tenga: el fallback es system sans.

const COLORS = {
  bg: "#FCFBF8",
  paper: "#FFFFFF",
  border: "#E8E4DA",
  ink: "#2C3A31",
  inkFaint: "#6B7A70",
  forest: "#1F2E24",
  honey: "#E6A93A",
  link: "#8A6219",
} as const;

const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// Mismo trazo que `BrandMark`; stroke fijo porque en mail no hay `currentColor` heredable.
const SPROUT_SVG = `<svg width="28" height="28" viewBox="0 0 34 34" fill="none" stroke="${COLORS.forest}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M17 30V16"/><path d="M17 20c-6 0-9-4-9-10 6 0 9 4 9 10z"/><path d="M17 16c0-6 4-9 10-9 0 6-4 9-10 9z"/></svg>`;

/** Toda cadena de origen humano (nombre, título de curso) pasa por acá antes de ir al HTML —
 * un `full_name` con `<`/`&` no debe romper el layout del mail ni, peor, inyectar markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailLayoutInput {
  /** Texto de preview que muestran Gmail/Apple Mail junto al asunto — no lo ve nadie que abra
   * el mail, así que va oculto (display:none) en vez de repetir el heading. */
  preheader: string;
  eyebrow: string;
  heading: string;
  /** Ya renderizado (párrafos <p>), con cualquier dato dinámico pasado por `escapeHtml` en el
   * template que lo arma — este layout no vuelve a escapar lo que ya es HTML de verdad. */
  bodyHtml: string;
  cta?: { label: string; url: string };
}

export function renderEmailHtml({ preheader, eyebrow, heading, bodyHtml, cta }: EmailLayoutInput): string {
  const ctaHtml = cta
    ? `
            <tr>
              <td align="center" style="padding: 28px 32px 4px;">
                <a href="${escapeHtml(cta.url)}"
                   style="display:inline-block; padding:13px 28px; border-radius:100px; background:${COLORS.honey}; color:${COLORS.forest}; font-family:${FONT}; font-size:14px; font-weight:700; text-decoration:none;">
                  ${escapeHtml(cta.label)}
                </a>
              </td>
            </tr>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0; padding:0; background:${COLORS.bg}; color:${COLORS.ink};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
      <tr>
        <td align="center" style="padding: 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${COLORS.paper}; border:1px solid ${COLORS.border}; border-radius:16px;">
            <tr>
              <td style="padding: 28px 32px 0; text-align:center; font-family:${FONT}; font-size:16px; font-weight:700; color:${COLORS.forest};">
                ${SPROUT_SVG}
                <span style="vertical-align:middle; padding-left:6px;">Humano Despierto</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 32px 0; text-align:center;">
                <p style="margin:0; font-family:${FONT}; font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:${COLORS.link};">
                  ${escapeHtml(eyebrow)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 32px 0; text-align:center;">
                <h1 style="margin:0; font-family:${FONT}; font-weight:800; font-size:24px; line-height:1.25; color:${COLORS.forest};">
                  ${escapeHtml(heading)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 32px 4px; font-family:${FONT}; font-size:15px; line-height:1.6; color:${COLORS.ink};">
                ${bodyHtml}
              </td>
            </tr>${ctaHtml}
            <tr>
              <td style="padding: 28px 32px 28px; text-align:center;">
                <div style="height:1px; background:${COLORS.border}; margin: 0 0 18px;"></div>
                <p style="margin:0; font-family:${FONT}; font-size:12px; color:${COLORS.inkFaint};">
                  Humano Despierto · escuela de oficios holísticos
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface EmailTextInput {
  eyebrow: string;
  heading: string;
  /** Líneas ya en texto plano (sin HTML) — el mismo contenido que `bodyHtml`, no un resumen. */
  bodyLines: string[];
  cta?: { label: string; url: string };
}

/** El texto plano NO es un descarte: mismo contenido, sin HTML ni glifos decorativos. */
export function renderEmailText({ eyebrow, heading, bodyLines, cta }: EmailTextInput): string {
  const lines = ["Humano Despierto", "", eyebrow.toUpperCase(), heading, "", ...bodyLines];
  if (cta) {
    lines.push("", `${cta.label}: ${cta.url}`);
  }
  lines.push("", "--", "Humano Despierto · escuela de oficios holísticos");
  return lines.join("\n");
}

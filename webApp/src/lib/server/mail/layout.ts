import "server-only";

// T-020 criterio 4 — §4 de CLAUDE.md aplicado al mail: paleta Cosmos, sin emojis (glifos
// Unicode: ☉ ☽ ✦ ◐ ◑ ○ ● ✧), sin imágenes raster. Tabla + estilos inline porque los clientes de
// mail no cargan hojas de estilo externas ni, en muchos casos, ni siquiera un <style> de bloque
// confiable (Gmail lo poda). Fuente real (Cinzel/Quicksand) no se puede exigir en un mail: se
// deja un fallback serif/sans-serif que se acerca al tono sin depender de que cargue.

const COLORS = {
  bg: "#0a0418",
  surface: "#1a0e2e",
  border: "#332255",
  ink: "#ede4ff",
  inkSoft: "#b8a8d0",
  inkFaint: "#8070a0",
  lila: "#c4b5fd",
  gold: "#f5d76e",
} as const;

const FONT_DISPLAY = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

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
        <td align="center" style="padding: 28px 0 4px;">
          <a href="${escapeHtml(cta.url)}"
             style="display:inline-block; padding:12px 28px; border-radius:100px; background:${COLORS.lila}; color:${COLORS.bg}; font-family:${FONT_BODY}; font-size:13px; font-weight:600; letter-spacing:0.04em; text-decoration:none;">
            ${escapeHtml(cta.label)} &#8614;
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
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:${COLORS.surface}; border:1px solid ${COLORS.border}; border-radius:8px;">
            <tr>
              <td style="padding: 32px 32px 8px; text-align:center;">
                <p style="margin:0; font-family:${FONT_DISPLAY}; font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:${COLORS.gold};">
                  &#9737; Humano Despierto &#9789;
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 32px 0; text-align:center;">
                <p style="margin:0; font-family:${FONT_DISPLAY}; font-size:11px; letter-spacing:0.25em; text-transform:uppercase; color:${COLORS.lila};">
                  &#10022; ${escapeHtml(eyebrow)} &#10022;
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px 32px 4px; text-align:center;">
                <h1 style="margin:0; font-family:${FONT_DISPLAY}; font-weight:400; font-style:italic; font-size:24px; color:${COLORS.ink};">
                  ${escapeHtml(heading)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 32px 4px; font-family:${FONT_BODY}; font-size:14px; line-height:1.6; color:${COLORS.inkSoft};">
                ${bodyHtml}
              </td>
            </tr>
            ${ctaHtml}
            <tr>
              <td style="padding: 28px 32px 32px; text-align:center;">
                <div style="height:1px; background:${COLORS.border}; margin: 0 0 20px;"></div>
                <p style="margin:0; font-family:${FONT_BODY}; font-size:11px; color:${COLORS.inkFaint};">
                  Escuela holística · tarot, astrología, herbolaria, reiki, magia
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

/** El texto plano NO es un descarte (criterio 4): mismo contenido, glifos en vez de HTML. */
export function renderEmailText({ eyebrow, heading, bodyLines, cta }: EmailTextInput): string {
  const lines = [
    "☉ Humano Despierto ☽",
    "",
    `✦ ${eyebrow} ✦`,
    heading,
    "",
    ...bodyLines,
  ];
  if (cta) {
    lines.push("", `${cta.label} ↦ ${cta.url}`);
  }
  lines.push("", "—", "Escuela holística · tarot, astrología, herbolaria, reiki, magia");
  return lines.join("\n");
}

import "server-only";
import net from "node:net";

// T-020 · capa de transporte de mail — criterio 5: "reemplazable, el día que haya proveedor
// real se cambia el transporte y nada más". Por eso la interfaz es chica (un solo método) y no
// sabe nada de curso/certificado/inscripción — eso vive en los templates y en notify.ts.
//
// Implementación de hoy: SMTP crudo sobre `node:net`, sin dependencias nuevas (evita la
// pregunta de "librería pesada sin ADR" — nodemailer u otro cliente HTTP de un ESP entran acá
// el día que exista ese ADR, implementando la misma interfaz). Mailpit no pide auth ni STARTTLS
// en local, así que alcanza con el diálogo mínimo: EHLO/MAIL FROM/RCPT TO/DATA/QUIT.

export interface MailAddress {
  email: string;
  name?: string;
}

export interface MailMessage {
  to: MailAddress;
  from: MailAddress;
  subject: string;
  html: string;
  text: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

/** Saca CR/LF de cualquier valor que vaya a un header — sin esto, un `full_name` con un salto
 * de línea (nadie lo escribe a mano, pero un cliente HTTP directo contra el Server Action sí
 * podría) inyecta headers SMTP arbitrarios (p.ej. un `Bcc:` propio). Ningún dato de usuario entra
 * a un header sin pasar por acá. */
function stripHeaderInjection(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** RFC 2047 encoded-word: los nombres reales van a tener tildes/ñ. Si el valor es ASCII puro se
 * deja tal cual (más legible en el header crudo); si no, se codifica entero en base64 UTF-8.
 * Uso: el `Subject` (unstructured — no vive dentro de una address-list, no hay nada que
 * encomillar ahí). Para el display-name de una dirección usar `formatDisplayName`, NO esto. */
function encodeHeaderText(value: string): string {
  const clean = stripHeaderInjection(value);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf-8").toString("base64")}?=`;
}

// RFC 5322 §3.2.3: un display-name es una `phrase` hecha de `atom`s — y `atext` excluye estos
// "specials" (más la comilla doble y la barra, que necesitan su propio escape dentro de un
// quoted-string). Un nombre con CUALQUIERA de estos NO puede salir como atom crudo: "Doe, Jane"
// sin comillas es una address-list de DOS elementos para cualquier parser que respete la
// gramática (Mailpit incluida, con la librería estándar de Go) — la coma cierra el primer
// address-spec y arranca uno nuevo, que como no trae "<...>" cae en el balde de "sin nombre".
const RFC5322_SPECIALS = /[()<>[\]:;@\\,."]/;

/** Escapa `\` y `"` con `\` — RFC 5322 §3.2.4, `quoted-pair` dentro de un `quoted-string`. */
function escapeQuotedString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Display-name de una dirección (`To`/`From`). Dos caminos EXCLUYENTES, nunca combinados:
 *   · no-ASCII (tildes, ñ) -> RFC 2047 encoded-word, SIN comillas — un quoted-string no
 *     decodifica lo que tiene adentro, así que envolver un encoded-word en comillas lo deja
 *     literal (`"=?UTF-8?B?...?="` en la bandeja del destinatario, no el nombre).
 *   · ASCII con "specials" (coma, punto, dos puntos, comillas, paréntesis, `<>`, `@`, `\`) ->
 *     quoted-string, escapando `\`/`"` por dentro.
 *   · ASCII sin specials -> atom crudo, como antes.
 */
function formatDisplayName(name: string): string {
  const clean = stripHeaderInjection(name);
  if (!/^[\x20-\x7e]*$/.test(clean)) {
    return `=?UTF-8?B?${Buffer.from(clean, "utf-8").toString("base64")}?=`;
  }
  if (RFC5322_SPECIALS.test(clean)) {
    return `"${escapeQuotedString(clean)}"`;
  }
  return clean;
}

function formatAddress({ email, name }: MailAddress): string {
  const safeEmail = stripHeaderInjection(email);
  const cleanName = name ? stripHeaderInjection(name) : "";
  if (!cleanName) return `<${safeEmail}>`;
  return `${formatDisplayName(cleanName)} <${safeEmail}>`;
}

/** RFC 5321 §4.5.2: toda línea que empieza con "." se duplica el punto, o el server la lee como
 * el terminador de DATA a mitad de mensaje y trunca el mail. */
function dotStuff(body: string): string {
  return body
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function buildMimeMessage(message: MailMessage): string {
  const boundary = `hh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@humano-despierto.local>`;

  const headers = [
    `From: ${formatAddress(message.from)}`,
    `To: ${formatAddress(message.to)}`,
    `Subject: ${encodeHeaderText(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  // text/plain PRIMERO (RFC 2046: el cliente elige la ÚLTIMA parte que entiende — el orden
  // texto→html hace que un cliente que no rendice HTML se quede con el texto, no al revés).
  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return dotStuff(`${headers}\r\n\r\n${body}`);
}

interface SmtpResponse {
  code: number;
  message: string;
}

/** Lee UNA respuesta SMTP completa (soporta multilínea: "250-a\r\n250-b\r\n250 c\r\n"). */
function readResponse(socket: net.Socket): Promise<SmtpResponse> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      // Última línea de una respuesta multilínea: "CÓDIGO " (espacio, no guion) antes del texto.
      if (last && /^\d{3} /.test(last)) {
        cleanup();
        resolve({ code: Number(last.slice(0, 3)), message: buffer });
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function command(
  socket: net.Socket,
  line: string,
  expectCode: number | number[]
): Promise<SmtpResponse> {
  socket.write(`${line}\r\n`);
  const res = await readResponse(socket);
  const expected = Array.isArray(expectCode) ? expectCode : [expectCode];
  if (!expected.includes(res.code)) {
    throw new Error(`SMTP: "${line.split(" ")[0]}" devolvió ${res.code}: ${res.message.trim()}`);
  }
  return res;
}

export interface SmtpTransportOptions {
  host: string;
  port: number;
  /** ms antes de abortar la conexión — un SMTP caído no puede colgar la request que lo dispara. */
  timeoutMs?: number;
}

export class SmtpTransport implements MailTransport {
  constructor(private readonly options: SmtpTransportOptions) {}

  async send(message: MailMessage): Promise<void> {
    const { host, port, timeoutMs = 5000 } = this.options;
    const socket = net.connect({ host, port });

    try {
      await new Promise<void>((resolve, reject) => {
        const onTimeout = () => reject(new Error(`SMTP: timeout conectando a ${host}:${port}`));
        socket.setTimeout(timeoutMs, onTimeout);
        socket.once("connect", () => {
          socket.setTimeout(timeoutMs, onTimeout);
          resolve();
        });
        socket.once("error", reject);
      });

      await readResponse(socket); // 220 greeting
      await command(socket, "EHLO humano-despierto.local", 250);
      await command(socket, `MAIL FROM:<${stripHeaderInjection(message.from.email)}>`, 250);
      await command(socket, `RCPT TO:<${stripHeaderInjection(message.to.email)}>`, [250, 251]);
      await command(socket, "DATA", 354);
      await command(socket, `${buildMimeMessage(message)}\r\n.`, 250);
      await command(socket, "QUIT", 221).catch(() => {
        // QUIT es cortesía — si el server ya cerró, el mail igual salió (250 anterior).
      });
    } finally {
      socket.destroy();
    }
  }
}

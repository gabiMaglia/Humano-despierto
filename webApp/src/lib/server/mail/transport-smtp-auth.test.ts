import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import type { Duplex } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { classifySmtpFailure, MailTransportError, SmtpTransport, type MailMessage } from "./transport";
import { log } from "@/lib/server/log";

const KEY = fs.readFileSync(path.join(__dirname, "__fixtures__/key.pem"));
const CERT = fs.readFileSync(path.join(__dirname, "__fixtures__/cert.pem"));
const PASS = "abcd efgh ijkl mnop";
const USER = "escuela@gmail.com";
const PLAIN_TOKEN = Buffer.from(`\0${USER}\0${PASS}`).toString("base64");

const MESSAGE: MailMessage = {
  to: { email: "alumna@example.com" },
  from: { email: USER, name: "Humano Despierto" },
  subject: "Hola",
  html: "<p>Hola</p>",
  text: "Hola",
};

interface FakeOptions {
  implicitTls?: boolean;
  starttls?: boolean;
  authReply?: string;
  rcptReply?: string;
}

// SMTP mínimo: guarda lo que el cliente manda y contesta con lo que cada caso necesita.
async function fakeServer(opts: FakeOptions) {
  const seen: string[] = [];
  const secured: boolean[] = [];
  const handle = (socket: Duplex, isTls: boolean, greet = true) => {
    let buffer = "";
    let inData = false;
    socket.on("error", () => {});
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf-8");
      for (;;) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          buffer = buffer.slice(end + 5);
          inData = false;
          seen.push("<body>");
          socket.write("250 2.0.0 OK\r\n");
          continue;
        }
        const eol = buffer.indexOf("\r\n");
        if (eol < 0) return;
        const line = buffer.slice(0, eol);
        buffer = buffer.slice(eol + 2);
        seen.push(line);
        secured.push(isTls);
        const verb = line.split(" ")[0].toUpperCase();
        if (verb === "EHLO") {
          const caps = ["250-localhost", ...(opts.starttls && !isTls ? ["250-STARTTLS"] : []), "250 AUTH PLAIN"];
          socket.write(`${caps.join("\r\n")}\r\n`);
        } else if (verb === "STARTTLS") {
          socket.write("220 2.0.0 Ready\r\n");
          socket.removeAllListeners("data");
          const upgraded = new tls.TLSSocket(socket as net.Socket, { isServer: true, key: KEY, cert: CERT });
          handle(upgraded, true, false);
          return;
        } else if (verb === "AUTH") socket.write(`${opts.authReply ?? "235 2.7.0 Accepted"}\r\n`);
        else if (verb === "MAIL") socket.write("250 OK\r\n");
        else if (verb === "RCPT") socket.write(`${opts.rcptReply ?? "250 OK"}\r\n`);
        else if (verb === "DATA") {
          inData = true;
          socket.write("354 Go\r\n");
        } else if (verb === "QUIT") socket.write("221 Bye\r\n");
        else socket.write("502 no\r\n");
      }
    });
    if (greet) socket.write("220 localhost ESMTP\r\n");
  };
  const server = opts.implicitTls
    ? tls.createServer({ key: KEY, cert: CERT }, (s) => handle(s, true))
    : net.createServer((s) => handle(s, false));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as net.AddressInfo).port;
  return { port, seen, secured, close: () => new Promise<void>((r) => server.close(() => r())) };
}

let open: { close(): Promise<void> } | null = null;
afterEach(async () => {
  await open?.close();
  open = null;
  vi.restoreAllMocks();
});

const transport = (port: number, extra: object = {}) =>
  new SmtpTransport({ host: "localhost", port, tlsCa: CERT, timeoutMs: 5000, ...extra });

describe("SmtpTransport con auth y TLS (T-090)", () => {
  it("TLS implícito (465): se conecta cifrado, autentica con AUTH PLAIN y manda", async () => {
    const srv = (open = await fakeServer({ implicitTls: true }));
    await transport(srv.port, { secure: true, auth: { user: USER, pass: PASS } }).send(MESSAGE);
    expect(srv.seen).toContain(`AUTH PLAIN ${PLAIN_TOKEN}`);
    expect(srv.seen.at(-2)).toBe("<body>");
    expect(srv.secured.every(Boolean)).toBe(true);
  });

  it("STARTTLS (587): EHLO, upgrade, EHLO de nuevo y recién ahí AUTH", async () => {
    const srv = (open = await fakeServer({ starttls: true }));
    await transport(srv.port, { requireTLS: true, auth: { user: USER, pass: PASS } }).send(MESSAGE);
    const verbs = srv.seen.map((l) => l.split(" ")[0]);
    expect(verbs.slice(0, 4)).toEqual(["EHLO", "STARTTLS", "EHLO", "AUTH"]);
    const authIdx = srv.seen.findIndex((l) => l.startsWith("AUTH"));
    expect(srv.secured[authIdx]).toBe(true);
  });

  it("requireTLS sin STARTTLS en el servidor: aborta antes de mandar credenciales", async () => {
    const srv = (open = await fakeServer({ starttls: false }));
    const err = await transport(srv.port, { requireTLS: true, auth: { user: USER, pass: PASS } })
      .send(MESSAGE)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MailTransportError);
    expect((err as MailTransportError).permanent).toBe(true);
    expect(srv.seen.some((l) => l.startsWith("AUTH"))).toBe(false);
  });

  it("sin auth ni TLS (Mailpit) el diálogo es el de siempre", async () => {
    const srv = (open = await fakeServer({}));
    await new SmtpTransport({ host: "127.0.0.1", port: srv.port, timeoutMs: 5000 }).send(MESSAGE);
    expect(srv.seen.map((l) => l.split(" ")[0])).toEqual(["EHLO", "MAIL", "RCPT", "DATA", "<body>", "QUIT"]);
  });

  it("rechaza armar credenciales sin TLS fuera de loopback", () => {
    expect(() => new SmtpTransport({ host: "smtp.gmail.com", port: 587, auth: { user: USER, pass: PASS } })).toThrow();
  });

  it("535: error permanente con el código del servidor, sin contraseña ni token en el mensaje", async () => {
    const srv = (open = await fakeServer({
      implicitTls: true,
      authReply: `535-5.7.8 Username and Password not accepted for ${PASS} ${PLAIN_TOKEN}\r\n535 5.7.8 https://support.google.com/mail/?p=BadCredentials`,
    }));
    const err = (await transport(srv.port, { secure: true, auth: { user: USER, pass: PASS } })
      .send(MESSAGE)
      .catch((e: unknown) => e)) as MailTransportError;
    expect(err).toBeInstanceOf(MailTransportError);
    expect({ permanent: err.permanent, status: err.status, code: err.code }).toEqual({ permanent: true, status: 535, code: "5_7_8" });
    expect(err.message).not.toContain(PASS);
    expect(err.message).not.toContain(PLAIN_TOKEN);
    expect(err.stack ?? "").not.toContain(PASS);
  });

  it("cuota diaria (550 5.4.5): transitoria, se reintenta", async () => {
    const srv = (open = await fakeServer({ implicitTls: true, rcptReply: "550 5.4.5 Daily user sending limit exceeded" }));
    const err = (await transport(srv.port, { secure: true, auth: { user: USER, pass: PASS } })
      .send(MESSAGE)
      .catch((e: unknown) => e)) as MailTransportError;
    expect({ permanent: err.permanent, status: err.status, code: err.code }).toEqual({ permanent: false, status: 550, code: "quota" });
  });

  it("la contraseña no llega al log ni siquiera si el servidor la repite", async () => {
    const lines: string[] = [];
    for (const m of ["info", "warn", "error"] as const) vi.spyOn(console, m).mockImplementation((l: string) => void lines.push(String(l)));
    const srv = (open = await fakeServer({ implicitTls: true, authReply: `535 5.7.8 bad ${PASS} ${PLAIN_TOKEN}` }));
    const err = await transport(srv.port, { secure: true, auth: { user: USER, pass: PASS } })
      .send(MESSAGE)
      .catch((e: unknown) => e);
    await log.error("mail_send_failed", { error: err, smtp_pass: PASS, pass: PASS });
    const all = lines.join("\n");
    expect(all).toContain("mail_send_failed");
    expect(all).not.toContain(PASS);
    expect(all).not.toContain(PLAIN_TOKEN);
  });
});

describe("classifySmtpFailure", () => {
  it.each([
    [535, "5.7.8 Username and Password not accepted", true],
    [534, "5.7.9 Application-specific password required", true],
    [530, "5.7.0 Authentication Required", true],
    [550, "5.1.1 The email account that you tried to reach does not exist", true],
    [554, "5.7.1 Message rejected as spam", true],
    [550, "5.4.5 Daily user sending limit exceeded", false],
    [554, "5.4.5 Daily user sending quota exceeded", false],
    [421, "4.7.0 Try again later", false],
    [450, "4.2.1 mailbox temporarily unavailable", false],
  ])("%i %s -> permanent=%s", (code, text, permanent) => {
    expect(classifySmtpFailure(code, text).permanent).toBe(permanent);
  });
});

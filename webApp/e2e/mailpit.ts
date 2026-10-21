import { expect, type APIRequestContext } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const WELCOME_SUBJECT = "Bienvenida a Humano Despierto";

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string; Name: string }[];
}
interface MailpitList {
  messages: MailpitSummary[] | null;
}
interface MailpitMessage {
  Subject: string;
  HTML: string;
  Text: string;
}

export async function messagesTo(request: APIRequestContext, email: string): Promise<MailpitSummary[]> {
  const res = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${email}"` } });
  if (!res.ok()) throw new Error(`Mailpit respondió ${res.status()} en /api/v1/search. ¿Está levantado en ${MAILPIT}?`);
  return ((await res.json()) as MailpitList).messages ?? [];
}

// T-031 · todos los mensajes cuyo asunto contiene `text` (el título del anuncio lleva marca de tiempo).
export async function messagesWithSubject(request: APIRequestContext, text: string): Promise<MailpitSummary[]> {
  const res = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `subject:"${text}"`, limit: "200" } });
  if (!res.ok()) throw new Error(`Mailpit respondió ${res.status()} en /api/v1/search. ¿Está levantado en ${MAILPIT}?`);
  return ((await res.json()) as MailpitList).messages ?? [];
}

export function extractVerifyLink(body: string, type: "signup" | "recovery"): string | null {
  const links = [...body.matchAll(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/g)].map((m) =>
    m[0].replaceAll("&amp;", "&"),
  );
  return links.find((l) => new URL(l).searchParams.get("type") === type) ?? null;
}

// Mailpit devuelve primero el más nuevo: con dos mails del mismo tipo gana el último pedido.
export async function authLinkFor(
  request: APIRequestContext,
  email: string,
  type: "signup" | "recovery",
): Promise<string> {
  let link: string | null = null;
  await expect
    .poll(
      async () => {
        for (const summary of await messagesTo(request, email)) {
          const res = await request.get(`${MAILPIT}/api/v1/message/${summary.ID}`);
          const msg = (await res.json()) as MailpitMessage;
          link = extractVerifyLink(msg.HTML || msg.Text, type);
          if (link) return true;
        }
        return false;
      },
      { timeout: 15_000, message: `no llegó a Mailpit un mail de ${type} para ${email}` },
    )
    .toBe(true);
  return link!;
}

export async function welcomeCount(request: APIRequestContext, email: string): Promise<number> {
  return (await messagesTo(request, email)).filter((m) => m.Subject === WELCOME_SUBJECT).length;
}

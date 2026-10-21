import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export interface WelcomeProps {
  studentName: string;
  catalogUrl: string;
}

/** Mail 3/4 (T-020): bienvenida al registrarse. Dispara desde `entrar/page.tsx` justo después
 * de un `signUp` exitoso — ver `entrar/actions.ts`. Todavía no tiene inscripción a nada: el CTA
 * va al catálogo, no a un curso puntual. */
export function renderWelcomeMail(props: WelcomeProps) {
  const subject = "Bienvenida a Humano Despierto";

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola ${escapeHtml(props.studentName)},</p>
    <p style="margin:0 0 14px;">
      Tu cuenta ya está lista. Este es un espacio para tarot, astrología, herbolaria, reiki y
      magia — a tu ritmo, sin fechas fijas ni clases que te esperan a una hora exacta.
    </p>
    <p style="margin:0;">Cuando quieras, el catálogo está abierto.</p>`;

  const html = renderEmailHtml({
    preheader: "Tu cuenta en Humano Despierto ya está lista.",
    eyebrow: "Bienvenida",
    heading: "Empezás tu camino",
    bodyHtml,
    cta: { label: "Explorar el catálogo", url: props.catalogUrl },
  });

  const text = renderEmailText({
    eyebrow: "Bienvenida",
    heading: "Empezás tu camino",
    bodyLines: [
      `Hola ${props.studentName},`,
      "",
      "Tu cuenta ya está lista. Este es un espacio para tarot, astrología, herbolaria,",
      "reiki y magia — a tu ritmo, sin fechas fijas ni clases que te esperan a una hora",
      "exacta.",
      "",
      "Cuando quieras, el catálogo está abierto.",
    ],
    cta: { label: "Explorar el catálogo", url: props.catalogUrl },
  });

  return { subject, html, text };
}

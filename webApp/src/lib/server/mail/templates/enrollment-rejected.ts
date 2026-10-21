import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export interface EnrollmentRejectedProps {
  studentName: string;
  courseTitle: string;
  reason: string | null;
  catalogUrl: string;
}

/** T-043 · la solicitud no se aprobó. El motivo lo escribe el admin y es opcional: sin motivo no
 *  queda un "Motivo:" vacío. Linkea al catálogo; una solicitud rechazada no se re-pide desde la
 *  ficha (no hay `rejected -> requested` para el cliente). */
export function renderEnrollmentRejectedMail(props: EnrollmentRejectedProps) {
  const subject = `Tu solicitud para ${props.courseTitle}`;
  const eyebrow = "Solicitud de inscripción";
  const heading = "Esta vez el umbral no se abrió";

  const reasonHtml = props.reason
    ? `<p style="margin:0 0 14px;">Motivo: <em>${escapeHtml(props.reason)}</em></p>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola ${escapeHtml(props.studentName)},</p>
    <p style="margin:0 0 14px;">
      Revisamos tu solicitud para <strong style="color:#f5d76e;">${escapeHtml(props.courseTitle)}</strong>
      y esta vez no pudimos aprobarla.
    </p>${reasonHtml}
    <p style="margin:0;">El catálogo sigue abierto para cuando quieras volver.</p>`;

  const html = renderEmailHtml({
    preheader: `Tu solicitud para ${props.courseTitle} no fue aprobada.`,
    eyebrow,
    heading,
    bodyHtml,
    cta: { label: "Ver el catálogo", url: props.catalogUrl },
  });

  const text = renderEmailText({
    eyebrow,
    heading,
    bodyLines: [
      `Hola ${props.studentName},`,
      "",
      `Revisamos tu solicitud para "${props.courseTitle}" y esta vez no pudimos aprobarla.`,
      ...(props.reason ? ["", `Motivo: ${props.reason}`] : []),
      "",
      "El catálogo sigue abierto para cuando quieras volver.",
    ],
    cta: { label: "Ver el catálogo", url: props.catalogUrl },
  });

  return { subject, html, text };
}

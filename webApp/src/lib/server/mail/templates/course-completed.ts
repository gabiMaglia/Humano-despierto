import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export interface CourseCompletedProps {
  studentName: string;
  courseTitle: string;
  certificateUrl: string;
}

/** Mail 2/4 (T-020): "completaste el curso", con link al certificado (T-018,
 * `/certificado/<código>`). El mail no expone más de lo que la propia página pública ya expone
 * (criterio 4 de T-018, heredado acá): nombre, curso, guía y fecha — y eso lo muestra la página
 * detrás del link, no este mail, que solo linkea. */
export function renderCourseCompletedMail(props: CourseCompletedProps) {
  const subject = `Completaste ${props.courseTitle} — tu certificado ya está`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola ${escapeHtml(props.studentName)},</p>
    <p style="margin:0 0 14px;">
      Terminaste el recorrido completo de
      <strong style="color:#f5d76e;">${escapeHtml(props.courseTitle)}</strong>. Tu certificado
      ya está emitido y es verificable con solo abrir el link — nadie más lo puede editar.
    </p>
    <p style="margin:0;">Gracias por sostener el camino hasta acá.</p>`;

  const html = renderEmailHtml({
    preheader: `Tu certificado de ${props.courseTitle} ya está listo.`,
    eyebrow: "Recorrido completo",
    heading: "Llegaste al final del camino",
    bodyHtml,
    cta: { label: "Ver mi certificado", url: props.certificateUrl },
  });

  const text = renderEmailText({
    eyebrow: "Recorrido completo",
    heading: "Llegaste al final del camino",
    bodyLines: [
      `Hola ${props.studentName},`,
      "",
      `Terminaste el recorrido completo de "${props.courseTitle}". Tu certificado ya`,
      "está emitido y es verificable con solo abrir el link — nadie más lo puede editar.",
      "",
      "Gracias por sostener el camino hasta acá.",
    ],
    cta: { label: "Ver mi certificado", url: props.certificateUrl },
  });

  return { subject, html, text };
}

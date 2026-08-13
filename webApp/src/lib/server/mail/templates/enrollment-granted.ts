import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export interface EnrollmentGrantedProps {
  studentName: string;
  courseTitle: string;
  teacherName: string;
  courseUrl: string;
}

/** Mail 1/4 (T-020): "te inscribieron a un curso". Dispara `setEnrollmentAction` cuando el
 * admin activa una inscripción — nunca contenido pago (video/recursos): solo confirma acceso y
 * linkea al curso, mismo criterio de "columna localizadora" de ADR-003 aplicado acá: este mail
 * no es el lugar para servir nada que la propia página del curso ya resuelva con sesión. */
export function renderEnrollmentGrantedMail(props: EnrollmentGrantedProps) {
  const subject = `Ya estás dentro de ${props.courseTitle}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola ${escapeHtml(props.studentName)},</p>
    <p style="margin:0 0 14px;">
      Te inscribieron en <strong style="color:#f5d76e;">${escapeHtml(props.courseTitle)}</strong>,
      guiado por ${escapeHtml(props.teacherName)}. El recorrido completo ya está disponible —
      podés empezar cuando quieras y avanzar en el orden que prefieras.
    </p>
    <p style="margin:0;">Nos vemos del otro lado.</p>`;

  const html = renderEmailHtml({
    preheader: `Te inscribieron en ${props.courseTitle}.`,
    eyebrow: "Nueva inscripción",
    heading: "Un nuevo camino se abre",
    bodyHtml,
    cta: { label: "Entrar al curso", url: props.courseUrl },
  });

  const text = renderEmailText({
    eyebrow: "Nueva inscripción",
    heading: "Un nuevo camino se abre",
    bodyLines: [
      `Hola ${props.studentName},`,
      "",
      `Te inscribieron en "${props.courseTitle}", guiado por ${props.teacherName}. El`,
      "recorrido completo ya está disponible — podés empezar cuando quieras y avanzar",
      "en el orden que prefieras.",
      "",
      "Nos vemos del otro lado.",
    ],
    cta: { label: "Entrar al curso", url: props.courseUrl },
  });

  return { subject, html, text };
}

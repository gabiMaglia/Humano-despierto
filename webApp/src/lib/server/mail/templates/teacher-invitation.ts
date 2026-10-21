import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export const TEACHER_INVITATION_SUBJECT = "Te invitamos a enseñar en Humano Despierto";

export interface TeacherInvitationProps {
  inviterName: string;
  acceptUrl: string;
  expiresOn: string;
}

/** T-049: va a un mail que puede no tener cuenta. El link lleva el único token en claro que
 *  existe; por eso no se loguea ni se guarda en ningún otro lado. */
export function renderTeacherInvitationMail(props: TeacherInvitationProps) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola,</p>
    <p style="margin:0 0 14px;">
      ${escapeHtml(props.inviterName)} te invitó a sumarte como guía en Humano Despierto, para
      publicar tus cursos y acompañar a tus alumnas.
    </p>
    <p style="margin:0 0 14px;">
      Para aceptar, entrá o creá tu cuenta con este mismo mail. El link vale hasta el
      ${escapeHtml(props.expiresOn)}.
    </p>
    <p style="margin:0;">Si no esperabas esta invitación, ignorá este mail: no pasa nada.</p>`;

  const html = renderEmailHtml({
    preheader: "Una invitación para enseñar en Humano Despierto.",
    eyebrow: "Invitación",
    heading: "Tu lugar como guía",
    bodyHtml,
    cta: { label: "Aceptar la invitación", url: props.acceptUrl },
  });

  const text = renderEmailText({
    eyebrow: "Invitación",
    heading: "Tu lugar como guía",
    bodyLines: [
      "Hola,",
      "",
      `${props.inviterName} te invitó a sumarte como guía en Humano Despierto, para`,
      "publicar tus cursos y acompañar a tus alumnas.",
      "",
      "Para aceptar, entrá o creá tu cuenta con este mismo mail. El link vale hasta el",
      `${props.expiresOn}.`,
      "",
      "Si no esperabas esta invitación, ignorá este mail: no pasa nada.",
    ],
    cta: { label: "Aceptar la invitación", url: props.acceptUrl },
  });

  return { subject: TEACHER_INVITATION_SUBJECT, html, text };
}

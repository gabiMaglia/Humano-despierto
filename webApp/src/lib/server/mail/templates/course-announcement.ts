import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export interface CourseAnnouncementProps {
  studentName: string;
  courseTitle: string;
  teacherName: string;
  announcementTitle: string;
  announcementBody: string;
  courseUrl: string;
}

/** T-031: el anuncio entero, porque lo publicado ya no cambia (congelado en la base). Sin email de
 * nadie: la interfaz no recibe direcciones (criterio 3 de T-020). */
export function renderCourseAnnouncementMail(props: CourseAnnouncementProps) {
  const subject = `${props.courseTitle}: ${props.announcementTitle}`;
  const paragraphs = props.announcementBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola ${escapeHtml(props.studentName)},</p>
    <p style="margin:0 0 14px;">
      ${escapeHtml(props.teacherName)} publicó un anuncio en
      <strong style="color:#f5d76e;">${escapeHtml(props.courseTitle)}</strong>:
    </p>
    <p style="margin:0 0 10px;font-weight:bold;">${escapeHtml(props.announcementTitle)}</p>
    ${paragraphs.map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n    ")}`;

  const html = renderEmailHtml({
    preheader: `${props.teacherName} publicó un anuncio en ${props.courseTitle}.`,
    eyebrow: "Anuncio del curso",
    heading: "Novedades de tu curso",
    bodyHtml,
    cta: { label: "Ver el curso", url: props.courseUrl },
  });

  const text = renderEmailText({
    eyebrow: "Anuncio del curso",
    heading: "Novedades de tu curso",
    bodyLines: [
      `Hola ${props.studentName},`,
      "",
      `${props.teacherName} publicó un anuncio en "${props.courseTitle}":`,
      "",
      props.announcementTitle,
      "",
      ...paragraphs.flatMap((p, i) => (i === 0 ? p.split("\n") : ["", ...p.split("\n")])),
    ],
    cta: { label: "Ver el curso", url: props.courseUrl },
  });

  return { subject, html, text };
}

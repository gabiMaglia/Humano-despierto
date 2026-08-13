import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

/**
 * Mail 4/4 (T-020): aviso a la docente de que tiene alumna nueva.
 *
 * CRITERIO 3, a nivel de tipo — no solo de intención: esta interfaz NO tiene un campo de email
 * (ni de ningún otro dato de contacto) de la alumna. `studentName` es lo único que identifica a
 * la persona nueva, y es el mismo dato que la docente ya puede ver en su propio panel de
 * alumnos inscriptos — no es información nueva que este mail esté filtrando. Si mañana alguien
 * quisiera sumar el email de la alumna acá, tendría que AGREGAR un campo a esta interfaz — no
 * hay un `...rest` ni un objeto genérico donde colarlo sin que se note en el diff.
 */
export interface TeacherNewStudentProps {
  teacherName: string;
  studentName: string;
  courseTitle: string;
  courseUrl: string;
}

export function renderTeacherNewStudentMail(props: TeacherNewStudentProps) {
  const subject = `Alumna nueva en ${props.courseTitle}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hola ${escapeHtml(props.teacherName)},</p>
    <p style="margin:0 0 14px;">
      <strong style="color:#f5d76e;">${escapeHtml(props.studentName)}</strong> se acaba de
      inscribir en <strong style="color:#f5d76e;">${escapeHtml(props.courseTitle)}</strong>.
    </p>
    <p style="margin:0;">Ya tiene acceso al recorrido completo.</p>`;

  const html = renderEmailHtml({
    preheader: `${props.studentName} se inscribió en ${props.courseTitle}.`,
    eyebrow: "Alumna nueva",
    heading: "Alguien empezó tu curso",
    bodyHtml,
    cta: { label: "Ver mi curso", url: props.courseUrl },
  });

  const text = renderEmailText({
    eyebrow: "Alumna nueva",
    heading: "Alguien empezó tu curso",
    bodyLines: [
      `Hola ${props.teacherName},`,
      "",
      `${props.studentName} se acaba de inscribir en "${props.courseTitle}".`,
      "Ya tiene acceso al recorrido completo.",
    ],
    cta: { label: "Ver mi curso", url: props.courseUrl },
  });

  return { subject, html, text };
}

import { describe, expect, it } from "vitest";
import { renderCourseAnnouncementMail } from "./course-announcement";

const PROPS = {
  studentName: "Alumna Uno",
  courseTitle: "Tarot iniciático",
  teacherName: "Sol Mayor",
  announcementTitle: "Clase en vivo el jueves",
  announcementBody: "Repasamos la cruz celta.\n\nTraigan el mazo.",
  courseUrl: "https://humano.example/cursos/tarot-iniciatico",
};

describe("renderCourseAnnouncementMail (c.11)", () => {
  it("trae alumna, curso, docente, título, cuerpo y CTA a la ficha, en html y en texto", () => {
    const { subject, html, text } = renderCourseAnnouncementMail(PROPS);
    expect(subject).toContain(PROPS.courseTitle);
    expect(subject).toContain(PROPS.announcementTitle);
    for (const out of [html, text]) {
      for (const valor of [PROPS.studentName, PROPS.courseTitle, PROPS.teacherName, PROPS.announcementTitle, "Repasamos la cruz celta.", "Traigan el mazo.", PROPS.courseUrl]) {
        expect(out).toContain(valor);
      }
    }
  });

  it("ningún email de nadie: la plantilla no recibe direcciones y no las inventa", () => {
    const { subject, html, text } = renderCourseAnnouncementMail(PROPS);
    expect(`${subject}${html}${text}`).not.toMatch(/@/);
  });

  it("escapa el HTML que escribe la docente", () => {
    const { html } = renderCourseAnnouncementMail({ ...PROPS, announcementBody: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("cada párrafo del cuerpo es un párrafo del mail", () => {
    const { html } = renderCourseAnnouncementMail(PROPS);
    expect(html.match(/Repasamos la cruz celta\.<\/p>/)).not.toBeNull();
    expect(html.match(/Traigan el mazo\.<\/p>/)).not.toBeNull();
  });
});

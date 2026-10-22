import { describe, expect, it } from "vitest";
import { TEACHER_INVITATION_SUBJECT, renderTeacherInvitationMail } from "./teacher-invitation";

const URL_OK = `http://localhost:3101/invitacion/${"A".repeat(43)}`;

describe("mail de invitación", () => {
  const mail = renderTeacherInvitationMail({ inviterName: "Admin <b>", acceptUrl: URL_OK, expiresOn: "28 de octubre de 2026" });

  it("asunto fijo, link y vencimiento en html y texto", () => {
    expect(mail.subject).toBe(TEACHER_INVITATION_SUBJECT);
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain(URL_OK);
      expect(body).toContain("28 de octubre de 2026");
    }
  });

  it("escapa el nombre de quien invita en el html", () => {
    expect(mail.html).toContain("Admin &lt;b&gt;");
    expect(mail.html).not.toContain("Admin <b>");
  });

  it("avisa que hay que entrar con el mismo mail", () => {
    expect(mail.text).toMatch(/con este mismo mail/);
  });
});

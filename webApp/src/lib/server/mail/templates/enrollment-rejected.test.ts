import { describe, expect, it } from "vitest";
import { renderEnrollmentRejectedMail } from "./enrollment-rejected";

const BASE = { studentName: "Alumna", courseTitle: "Herbario", catalogUrl: "http://localhost:3000/cursos" };

describe("renderEnrollmentRejectedMail", () => {
  it("con motivo lo incluye escapado en HTML y en texto", () => {
    const { html, text, subject } = renderEnrollmentRejectedMail({ ...BASE, reason: "Cupo <b>completo</b>" });
    expect(subject).toContain("Herbario");
    expect(html).toContain("Cupo &lt;b&gt;completo&lt;/b&gt;");
    expect(html).not.toContain("<b>completo</b>");
    expect(text).toContain("Motivo: Cupo <b>completo</b>");
  });

  it("sin motivo no deja el párrafo vacío (c.7)", () => {
    const { html, text } = renderEnrollmentRejectedMail({ ...BASE, reason: null });
    expect(html).not.toContain("Motivo");
    expect(text).not.toContain("Motivo");
  });

  it("linkea al catálogo, nunca a contenido pago", () => {
    const { html } = renderEnrollmentRejectedMail({ ...BASE, reason: null });
    expect(html).toContain("http://localhost:3000/cursos");
    expect(html).not.toMatch(/youtube|drive\.google/);
  });
});

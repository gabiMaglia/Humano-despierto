import { describe, expect, it } from "vitest";
import { COURSE_STATUS, ENROLLMENT_STATUS, INVITATION_STATUS, POST_STATUS, statusOf } from "./status";

describe("estados del panel", () => {
  it("cada estado tiene texto propio: el color nunca es la única señal", () => {
    for (const map of [COURSE_STATUS, POST_STATUS, ENROLLMENT_STATUS, INVITATION_STATUS]) {
      const labels = Object.values(map).map((s) => s.label);
      expect(new Set(labels).size).toBe(labels.length);
      for (const s of Object.values(map)) expect(s.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("usa los mismos textos que el panel mostraba antes", () => {
    expect(COURSE_STATUS.draft.label).toBe("Borrador");
    expect(COURSE_STATUS.published.label).toBe("Publicado");
    expect(ENROLLMENT_STATUS.revoked.label).toBe("Dada de baja");
    expect(ENROLLMENT_STATUS.rejected.label).toBe("No aprobada");
  });

  it("un estado desconocido cae en un chip neutro con su propio texto", () => {
    expect(statusOf(COURSE_STATUS, "otro")).toEqual({ label: "otro", tone: "muted" });
  });
});

import { describe, expect, it } from "vitest";
import { enrollmentPanelCopy } from "./panel-copy";

describe("enrollmentPanelCopy (D-109)", () => {
  it("sin sesión o sin fila invita a pedir", () => {
    for (const status of ["anonymous", "none"] as const) {
      expect(enrollmentPanelCopy({ status }).title).toBe("Pedir la inscripción");
      expect(enrollmentPanelCopy({ status }).lead).toMatch(/la escuela la revisa/);
    }
  });

  it("con pedido pendiente no vuelve a invitar a pedir", () => {
    const copy = enrollmentPanelCopy({ status: "requested", requestedAt: "2026-10-21T10:00:00Z" });
    expect(copy.title).toBe("Tu pedido está en revisión");
    expect(copy.title).not.toMatch(/Pedir/);
    // La fecha y el «te avisamos» ya los dice el estado de abajo.
    expect(copy.lead).toBeNull();
  });

  it("inscripta: el título lo dice", () => {
    const copy = enrollmentPanelCopy({ status: "active" });
    expect(copy.title).toBe("Ya estás inscripta");
    expect(copy.lead).toMatch(/panel/);
  });

  it("dada de baja o no aprobada: no ofrece pedir de nuevo y el detalle queda al estado", () => {
    expect(enrollmentPanelCopy({ status: "revoked" })).toEqual({ title: "Tu inscripción", lead: null });
    expect(enrollmentPanelCopy({ status: "rejected", decidedReason: null })).toEqual({ title: "Tu inscripción", lead: null });
  });
});

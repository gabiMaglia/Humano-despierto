import { describe, expect, it } from "vitest";
import { ENROLLMENT_COPY, NO_ROWS, duplicateEnrollmentMessage, translateEnrollmentError } from "./messages";

describe("translateEnrollmentError", () => {
  it("23505 es una solicitud que ya existe (c.4)", () => {
    expect(translateEnrollmentError({ code: "23505", message: "duplicate key" })).toBe(
      "Ya tenés una solicitud para este curso.",
    );
  });

  it("42501 con la marca del guard es un localizador exacto en el motivo (c.8)", () => {
    expect(
      translateEnrollmentError({ code: "42501", message: "el motivo contiene un localizador de contenido pago" }),
    ).toBe(ENROLLMENT_COPY.reasonLocator);
  });

  it("42501 sin la marca es un permiso, no un video", () => {
    expect(translateEnrollmentError({ code: "42501", message: "new row violates row-level security policy" })).toBe(
      ENROLLMENT_COPY.forbidden,
    );
  });

  it("23514 es el CHECK de forma o de largo del motivo", () => {
    expect(translateEnrollmentError({ code: "23514", message: "check" })).toBe(ENROLLMENT_COPY.reasonInvalid);
  });

  it("sin filas es una solicitud que otra persona ya resolvió", () => {
    expect(translateEnrollmentError({ code: NO_ROWS, message: "" })).toBe(ENROLLMENT_COPY.alreadyDecided);
  });

  it("cualquier otro código no filtra el mensaje crudo de la base", () => {
    const out = translateEnrollmentError({ code: "XX000", message: "detalle interno de postgres" });
    expect(out).toBe(ENROLLMENT_COPY.generic);
    expect(out).not.toContain("postgres");
  });
});

describe("duplicateEnrollmentMessage (D-37)", () => {
  it("sin estado legible cae en el texto de solicitud existente", () => {
    expect(duplicateEnrollmentMessage(null)).toBe("Ya tenés una solicitud para este curso.");
    expect(duplicateEnrollmentMessage("revoked")).toBe("Tu inscripción a este curso fue dada de baja.");
  });
});

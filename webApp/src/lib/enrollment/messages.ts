// Sin `server-only`: lo importan la action de la ficha, las del admin y los formularios cliente
// (valor inicial de `useActionState`). Son strings y una función pura.
import type { RateLimitFields } from "@/lib/rate-limit/core";

export interface EnrollmentRequestState extends RateLimitFields {
  error: string | null;
  success: string | null;
}

export const ENROLLMENT_REQUEST_INITIAL: EnrollmentRequestState = { error: null, success: null };

/** Mismo largo que el CHECK `enrollments_decided_reason_max_length` (migración 0029). */
export const REASON_MAX = 500;

/** No es un SQLSTATE: el UPDATE corrió y no encontró la fila en el estado de origen. */
export const NO_ROWS = "NO_ROWS";

/** Marca común de los `raise` de localizador (0024, 0025, 0026, 0029). */
const LOCATOR_MARK = "localizador de contenido pago";

export const ENROLLMENT_COPY = {
  needsLogin: "Necesitás iniciar sesión para pedir un curso.",
  courseUnavailable: "Este curso no está abierto a inscripciones.",
  alreadyRequested: "Ya tenés una solicitud para este curso.",
  alreadyActive: "Ya estás inscripta en este curso.",
  alreadyRevoked: "Tu inscripción a este curso fue dada de baja.",
  alreadyRejected: "Tu solicitud para este curso no fue aprobada.",
  requested: "Solicitud enviada. Te avisamos por mail cuando la escuela la revise.",
  approved: "Inscripción aprobada.",
  rejected: "Solicitud rechazada.",
  alreadyDecided: "Esta solicitud ya fue resuelta. Recargá el panel para ver su estado.",
  invalidData: "Datos inválidos.",
  reasonTooLong: `El motivo no puede superar ${REASON_MAX} caracteres.`,
  reasonHasLink: "El motivo no puede contener links.",
  reasonLocator:
    "El motivo contiene el identificador de un video o archivo de un curso. Ese dato es de contenido pago y no puede ir en un mensaje a la alumna.",
  reasonInvalid: `El motivo no puede contener links ni superar ${REASON_MAX} caracteres.`,
  forbidden: "No tenés permiso para hacer esto. Si creés que es un error, volvé a iniciar sesión.",
  generic: "No se pudo completar la operación. Volvé a intentarlo.",
} as const;

export function translateEnrollmentError(error: { code?: string | null; message: string }): string {
  switch (error.code) {
    case "23505":
      return ENROLLMENT_COPY.alreadyRequested;
    case "42501":
      return error.message.includes(LOCATOR_MARK) ? ENROLLMENT_COPY.reasonLocator : ENROLLMENT_COPY.forbidden;
    case "23514":
      return ENROLLMENT_COPY.reasonInvalid;
    case NO_ROWS:
      return ENROLLMENT_COPY.alreadyDecided;
    default:
      return ENROLLMENT_COPY.generic;
  }
}

/** Un 23505 al pedir dice que hay fila, no cuál: se traduce con el estado de la fila propia (D-37). */
export function duplicateEnrollmentMessage(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return ENROLLMENT_COPY.alreadyActive;
    case "revoked":
      return ENROLLMENT_COPY.alreadyRevoked;
    case "rejected":
      return ENROLLMENT_COPY.alreadyRejected;
    default:
      return ENROLLMENT_COPY.alreadyRequested;
  }
}

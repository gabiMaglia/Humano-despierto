// Sin `server-only`: no hay secretos y lo importan los tests de los transportes.

/** Tope de `sendMail`: malla de seguridad, nunca el límite normal (ADR-014, E1). */
export const HARD_CAP_MS = 15_000;
export const TRANSPORT_TIMEOUT_MS = 5_000;

/** Invariante de toda `MailTransport` (E1): su tiempo total queda por debajo del tope de
 * `send.ts`, así el tope nunca es lo que corta un envío normal. */
export function assertTransportTimeout(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0 || ms >= HARD_CAP_MS) {
    throw new Error(`timeout de transporte inválido (${ms}ms): tiene que estar entre 0 y ${HARD_CAP_MS}ms`);
  }
}

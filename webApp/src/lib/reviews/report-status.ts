export type ReportStatus = "pendiente" | "oculta" | "desestimada";

// La guía ve SOLO esto (ADR-012 flujo 4): si se ocultó o se desestimó, nunca quién ni el motivo.
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pendiente: "Reportada · en revisión",
  oculta: "Reportada · se ocultó",
  desestimada: "Reportada · se mantuvo",
};

export function reportStatus(resolution: string | null): ReportStatus {
  if (resolution === null) return "pendiente";
  if (resolution === "oculta" || resolution === "desestimada") return resolution;
  throw new Error(`resolución desconocida: ${resolution}`);
}

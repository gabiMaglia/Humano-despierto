export type ChipTone = "ok" | "accent" | "muted" | "error";

export interface StatusLook {
  label: string;
  tone: ChipTone;
}

export const COURSE_STATUS: Record<"draft" | "published" | "archived", StatusLook> = {
  draft: { label: "Borrador", tone: "muted" },
  published: { label: "Publicado", tone: "ok" },
  archived: { label: "Archivado", tone: "muted" },
};

export const POST_STATUS: Record<"draft" | "published", StatusLook> = {
  draft: COURSE_STATUS.draft,
  published: COURSE_STATUS.published,
};

export const ENROLLMENT_STATUS: Record<"requested" | "active" | "revoked" | "rejected", StatusLook> = {
  requested: { label: "Solicitada", tone: "accent" },
  active: { label: "Activa", tone: "ok" },
  revoked: { label: "Dada de baja", tone: "muted" },
  rejected: { label: "No aprobada", tone: "error" },
};

export const INVITATION_STATUS: Record<"pendiente" | "vencida" | "aceptada" | "revocada", StatusLook> = {
  pendiente: { label: "Pendiente", tone: "accent" },
  vencida: { label: "Vencida", tone: "muted" },
  aceptada: { label: "Aceptada", tone: "ok" },
  revocada: { label: "Revocada", tone: "muted" },
};

/** Un valor que el mapa no conoce no rompe la pantalla: se muestra tal cual, en neutro. */
export function statusOf(map: Record<string, StatusLook>, value: string): StatusLook {
  return map[value] ?? { label: value, tone: "muted" };
}

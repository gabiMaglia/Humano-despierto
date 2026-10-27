import type { StudentEnrollmentState } from "@/lib/server/enrollment";

export interface EnrollmentPanelCopy {
  title: string;
  /** null cuando el estado de abajo (`EnrollmentCta`) ya lo explica: no se dice dos veces. */
  lead: string | null;
}

const PEDIR: EnrollmentPanelCopy = {
  title: "Pedir la inscripción",
  lead: "Pedís la inscripción, la escuela la revisa y te avisa por mail cuando el curso está habilitado en tu panel.",
};

/** Título y bajada del panel lateral de la ficha según en qué punto está la alumna (D-109). */
export function enrollmentPanelCopy(state: StudentEnrollmentState): EnrollmentPanelCopy {
  switch (state.status) {
    case "anonymous":
    case "none":
      return PEDIR;
    case "requested":
      return { title: "Tu pedido está en revisión", lead: null };
    case "active":
      return { title: "Ya estás inscripta", lead: "Tenés el curso completo en tu panel, a tu ritmo y sin vencimiento." };
    case "revoked":
    case "rejected":
      return { title: "Tu inscripción", lead: null };
  }
}

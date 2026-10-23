import type { ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";
import StatusMessage from "@/components/panel/StatusMessage";

/** Resultado de una action de reseñas o de inscripción. `polite`: el error (también el «Demasiados
 *  intentos» de T-050) se anuncia como `status`, sin mover el foco; el formulario sigue usable. */
export default function ActionFeedback({ state }: { state: ReviewActionState }) {
  return <StatusMessage error={state.error} success={state.success} polite className="mt-3" />;
}

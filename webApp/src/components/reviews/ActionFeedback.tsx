import type { ReviewActionState } from "@/app/(marketing)/cursos/[slug]/actions";

/** Mensaje de error o éxito de una action de reseñas. `role="status"` para que el lector de
 *  pantalla anuncie el resultado sin mover el foco. */
export default function ActionFeedback({ state }: { state: ReviewActionState }) {
  if (state.error) return <p role="status" className="mt-3 font-body text-sm text-gold-400">{state.error}</p>;
  if (state.success) return <p role="status" className="mt-3 font-body text-sm text-lila-300">{state.success}</p>;
  return null;
}

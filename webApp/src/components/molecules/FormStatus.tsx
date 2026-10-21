import type { ActionState } from "@/lib/action-state";

/** Mismo dibujo que el estado de `CourseForm`; los formularios viejos migran cuando se toquen. */
export default function FormStatus({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="font-body text-xs text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.success) return <p className="font-body text-xs text-lila-300">{state.success}</p>;
  return null;
}

import ErrorMark from "@/components/atoms/ErrorMark";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils/cn";

/** Resultado de un Server Action que no es de un campo (sesión vencida, error de la base, «guardado»).
 *  El error de un campo va junto al campo (`FormField`); éste queda para lo que es del formulario. */
export default function FormStatus({ state, id, className }: { state: ActionState; id?: string; className?: string }) {
  if (state.error) {
    return (
      <p id={id} role="alert" className={cn("flex items-start gap-2 text-sm font-medium text-error", className)}>
        <ErrorMark />
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p id={id} role="status" className={cn("text-sm font-medium text-exito", className)}>
        {state.success}
      </p>
    );
  }
  return null;
}

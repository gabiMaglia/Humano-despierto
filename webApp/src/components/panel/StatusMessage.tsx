import ErrorMark from "@/components/atoms/ErrorMark";
import { cn } from "@/lib/utils/cn";

interface Props {
  error?: string | null;
  success?: string | null;
  /** Para enlazarlo con `aria-describedby` del campo o del botón al que explica. */
  id?: string;
  /** Algunos errores se informan sin interrumpir (`status`), p. ej. "ya hay una invitación pendiente". */
  polite?: boolean;
  className?: string;
}

/** Resultado de una Server Action en el panel: el error con el signo y el token `error`, el éxito con
 *  `exito`. No reemplaza a `FormStatus` (compartido): lo mismo con el patrón de error de T-062. */
export default function StatusMessage({ error, success, id, polite, className }: Props) {
  if (error) {
    return (
      <p
        id={id}
        role={polite ? "status" : "alert"}
        className={cn("flex items-start gap-2 text-sm font-medium text-error", className)}
      >
        <ErrorMark />
        <span>{error}</span>
      </p>
    );
  }
  if (success) {
    return (
      <p id={id} role="status" className={cn("flex items-start gap-2 text-sm font-medium text-exito", className)}>
        <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5 8.2l2.2 2.2L11 6" />
        </svg>
        <span>{success}</span>
      </p>
    );
  }
  return null;
}

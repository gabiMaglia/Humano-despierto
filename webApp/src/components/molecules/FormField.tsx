import type { ReactNode } from "react";
import ErrorMark from "@/components/atoms/ErrorMark";
import { fieldA11y } from "@/lib/ui/field";
import { cn } from "@/lib/utils/cn";

export interface FieldControlProps {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  className: string;
}

/** Borde `suave` (3:1 sobre papel) y sin `outline-none`: el foco visible global no se tapa. */
export function fieldClass(error?: string | null, className?: string): string {
  return cn(
    "min-h-12 w-full rounded-md border bg-papel px-4 py-3 text-base text-tinta placeholder:text-suave transition-colors",
    error ? "border-error" : "border-suave",
    className,
  );
}

export function FieldError({ id, error }: { id: string; error?: string | null }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-2 text-sm font-medium text-error">
      <ErrorMark />
      {error}
    </p>
  );
}

interface Props {
  id: string;
  label: string;
  /** Ayuda permanente bajo el label (formato, límites). */
  hint?: string;
  error?: string | null;
  /** El label existe para el lector pero no se ve (un compositor cuyo propósito ya dice el placeholder y el contexto). */
  hideLabel?: boolean;
  className?: string;
  /** El control (input, textarea, select) recibe id, aria y clase: así el campo no tiene que conocer cada tipo. */
  children: (control: FieldControlProps) => ReactNode;
  controlClassName?: string;
}

// Mismo patrón que `AuthField` (T-062), para formularios que no son de acceso: label visible,
// error junto al campo, `aria-invalid` y `aria-describedby`.
export default function FormField({ id, label, hint, error, hideLabel, className, controlClassName, children }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const a11y = fieldA11y(id, error, hintId);
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5 block text-sm font-semibold text-tinta", hideLabel && "sr-only")}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className="-mt-0.5 mb-1.5 text-sm text-suave">
          {hint}
        </p>
      )}
      {children({
        id,
        "aria-invalid": a11y["aria-invalid"],
        "aria-describedby": a11y["aria-describedby"],
        className: fieldClass(error, controlClassName),
      })}
      <FieldError id={a11y.errorId} error={error} />
    </div>
  );
}

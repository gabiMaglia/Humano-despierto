import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import ErrorMark from "@/components/atoms/ErrorMark";
import { cn } from "@/lib/utils/cn";

interface Shared {
  label: string;
  hint?: string;
  /** Error de este campo: queda al lado, asociado por `aria-describedby`, con `aria-invalid`. */
  error?: string | null;
  /** Marca el campo sin mensaje propio: el error lo da otro campo del mismo grupo. */
  invalid?: boolean;
  /** El rótulo sigue en el DOM para el lector de pantalla pero no se dibuja (campos dentro de una fila). */
  hideLabel?: boolean;
  className?: string;
}

const CONTROL =
  "min-h-12 w-full rounded-md border bg-papel px-4 py-3 text-base text-tinta placeholder:text-suave transition-colors";

function describedBy(...ids: Array<string | false | undefined>) {
  const v = ids.filter(Boolean).join(" ");
  return v || undefined;
}

function Frame({ id, label, hint, error, hideLabel, className, children }: Omit<Shared, "invalid"> & { id: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("block text-sm font-semibold text-tinta", hideLabel ? "sr-only" : "mb-1.5")}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-suave">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-2 text-sm font-medium text-error">
          <ErrorMark />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type InputProps = Shared & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

export function PanelInput({ label, hint, error, invalid, hideLabel, className, ...input }: InputProps) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <input
        id={id}
        {...input}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={describedBy(error ? `${id}-error` : hint && `${id}-hint`)}
        className={cn(CONTROL, error || invalid ? "border-error" : "border-suave")}
      />
    </Frame>
  );
}

type AreaProps = Shared & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

export function PanelTextarea({ label, hint, error, invalid, hideLabel, className, ...area }: AreaProps) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <textarea
        id={id}
        {...area}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={describedBy(error ? `${id}-error` : hint && `${id}-hint`)}
        className={cn(CONTROL, "leading-relaxed", error || invalid ? "border-error" : "border-suave")}
      />
    </Frame>
  );
}

type SelectProps = Shared & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id">;

export function PanelSelect({ label, hint, error, invalid, hideLabel, className, children, ...select }: SelectProps) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <select
        id={id}
        {...select}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={describedBy(error ? `${id}-error` : hint && `${id}-hint`)}
        className={cn(CONTROL, error || invalid ? "border-error" : "border-suave")}
      >
        {children}
      </select>
    </Frame>
  );
}

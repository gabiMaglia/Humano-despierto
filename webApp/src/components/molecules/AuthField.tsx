import type { InputHTMLAttributes, ReactNode } from "react";
import ErrorMark from "@/components/atoms/ErrorMark";
import { cn } from "@/lib/utils/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  aside?: ReactNode;
  /** Error de este campo: se anuncia (`alert`) y queda asociado al input. */
  error?: string | null;
}

// `htmlFor` + `id`: sin la asociación el lector de pantalla no anuncia el campo y Playwright no
// lo encuentra por su label.
export default function AuthField({ id, label, aside, error, className, ...input }: Props) {
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-tinta">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : input["aria-describedby"]}
        className={cn(
          "min-h-12 w-full rounded-md border bg-papel px-4 py-3 text-base text-tinta placeholder:text-suave transition-colors",
          error ? "border-error" : "border-suave",
          className,
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-2 text-sm font-medium text-error">
          <ErrorMark />
          {error}
        </p>
      )}
    </div>
  );
}

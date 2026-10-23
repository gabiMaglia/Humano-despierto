"use client";

import { useState, type ReactNode } from "react";
import Button from "@/components/atoms/Button";
import { PanelInput } from "@/components/panel/PanelField";

interface Props {
  /** Nombre exacto que hay que escribir para habilitar el botón. */
  confirmText: string;
  heading: string;
  children?: ReactNode;
  action: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  hidden: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
}

/**
 * Zona de peligro: separada de las acciones cotidianas, enumera lo que se destruye y exige escribir
 * el nombre —un `confirm()` se acepta por reflejo, escribir el nombre no—. El botón queda
 * deshabilitado hasta que coincide. La usan el curso (T-005) y el post (T-021).
 */
export default function TypeToConfirmZone({ confirmText, heading, children, action, isPending, error, hidden, submitLabel, pendingLabel }: Props) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === confirmText.trim();

  return (
    <section aria-label="Zona de peligro" className="rounded-lg border border-error bg-papel">
      <header className="border-b border-error px-5 py-3">
        <h2 className="text-base font-semibold text-error">Zona de peligro</h2>
      </header>
      <div className="space-y-4 px-5 py-5">
        <h3 className="text-lg font-semibold text-bosque">{heading}</h3>
        {children}
        <p className="text-sm font-semibold text-error">Esta acción no se puede deshacer.</p>
        <form action={action} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <PanelInput
            className="flex-1"
            label={`Escribí «${confirmText}» para confirmar`}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            error={error}
          />
          <Button type="submit" variant="danger" disabled={!matches || isPending} aria-busy={isPending}>
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </form>
      </div>
    </section>
  );
}

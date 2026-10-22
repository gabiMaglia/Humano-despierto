"use client";

import { useEffect } from "react";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando el panel:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center text-tinta">
      <p className="font-display text-eyebrow tracking-wide text-miel-800">✧ Algo se cortó</p>
      <h1 className="font-display text-lg text-tinta">No pudimos cargar tu panel.</h1>
      <p className="max-w-md font-body text-sm text-suave">
        Puede ser un problema pasajero con tus inscripciones o tu progreso guardado.
      </p>
      <button
        type="button"
        onClick={reset}
        className="font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}

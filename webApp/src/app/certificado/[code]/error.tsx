"use client";

import { useEffect } from "react";

export default function CertificadoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando el certificado:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center text-tinta">
      <p className="font-display text-eyebrow tracking-wide text-miel-800">✧ Algo se cortó</p>
      <h1 className="font-display text-lg text-tinta">No pudimos cargar este certificado.</h1>
      <p className="max-w-md font-body text-sm text-suave">
        Puede ser un problema pasajero de conexión. El certificado en sí no se pierde: probá de nuevo.
      </p>
      <button
        type="button"
        onClick={reset}
        className="font-display text-eyebrow tracking-wide text-bosque transition-colors hover:text-miel-800"
      >
        Reintentar
      </button>
    </div>
  );
}

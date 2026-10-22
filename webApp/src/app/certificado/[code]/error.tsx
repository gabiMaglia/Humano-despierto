"use client";

import { useReportError } from "@/hooks/useReportError";
import { ErrorReference } from "@/components/ErrorReference";

export default function CertificadoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cosmos-0 px-6 text-center text-ink">
      <p className="font-display text-eyebrow tracking-cosmic text-gold-400">✧ Algo se cortó</p>
      <h1 className="font-display text-lg text-ink">No pudimos cargar este certificado.</h1>
      <p className="max-w-md font-body text-sm text-ink-soft">
        Puede ser un problema pasajero de conexión. El certificado en sí no se pierde: probá de nuevo.
      </p>
      <ErrorReference digest={error.digest} />
      <button
        type="button"
        onClick={reset}
        className="font-display text-eyebrow tracking-cosmic text-lila-300 transition-colors hover:text-gold-400"
      >
        Reintentar
      </button>
    </div>
  );
}

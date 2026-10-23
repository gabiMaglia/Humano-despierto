"use client";

import Button from "@/components/atoms/Button";
import { ErrorReference } from "@/components/ErrorReference";
import { useReportError } from "@/hooks/useReportError";
import { errorDigest } from "@/lib/errors/client-error-report";

export default function CertificadoError({ error, retry }: { error: unknown; retry: () => void }) {
  useReportError(error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <h1 className="max-w-[22ch] text-2xl">No pudimos cargar este certificado.</h1>
      <p className="max-w-md text-suave">
        Puede ser un problema pasajero de conexión. El certificado en sí no se pierde: probá de nuevo.
      </p>
      <ErrorReference digest={errorDigest(error)} />
      <Button onClick={retry} className="mt-2">
        Reintentar
      </Button>
    </main>
  );
}

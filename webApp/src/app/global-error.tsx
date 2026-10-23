"use client";

// Reemplaza al root layout cuando el error es del layout mismo: trae su <html>/<body>, sus
// estilos y su fuente (no hereda nada del layout). Reporta el error con su digest (T-051).
import "@/styles/globals.css";
import { jakarta } from "@/styles/fonts";
import Button from "@/components/atoms/Button";
import { ErrorReference } from "@/components/ErrorReference";
import { useReportError } from "@/hooks/useReportError";
import { errorDigest } from "@/lib/errors/client-error-report";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useReportError(error);

  return (
    <html lang="es" className={jakarta.variable}>
      <body className="bg-fondo font-body text-tinta antialiased">
        <title>Algo se cortó — Humano Despierto</title>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <svg viewBox="0 0 34 34" className="h-12 w-12 text-musgo" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 30V16" />
            <path d="M17 20c-6 0-9-4-9-10 6 0 9 4 9 10z" />
            <path d="M17 16c0-6 4-9 10-9 0 6-4 9-10 9z" />
          </svg>
          <h1 className="max-w-[20ch] text-display-md leading-[1.12]">No pudimos mostrar esta página.</h1>
          <p className="max-w-md text-suave">
            Puede ser un problema pasajero. Si vuelve a pasar, contanos este código de referencia.
          </p>
          <ErrorReference digest={errorDigest(error)} />
          <Button onClick={() => retry()} className="mt-2">
            Reintentar
          </Button>
        </main>
      </body>
    </html>
  );
}

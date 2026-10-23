"use client";

import Button from "@/components/atoms/Button";
import ErrorMark from "@/components/atoms/ErrorMark";
import { ErrorReference } from "@/components/ErrorReference";
import { useReportError } from "@/hooks/useReportError";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useReportError(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-bosque">
        <ErrorMark />
        Algo falló en el panel de administración
      </h1>
      <p className="max-w-md text-suave">{error.message}</p>
      <ErrorReference digest={error.digest} />
      <Button variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}

"use client";

import { useReportError } from "@/hooks/useReportError";
import ErrorScreen from "@/components/layout/ErrorScreen";

export default function LeccionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);

  return (
    <ErrorScreen
      title="No pudimos cargar esta lección."
      body="Puede ser un problema pasajero de conexión con el video o con tu progreso guardado."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

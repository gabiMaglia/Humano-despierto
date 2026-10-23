"use client";

import { useReportError } from "@/hooks/useReportError";
import ErrorScreen from "@/components/layout/ErrorScreen";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);

  return (
    <ErrorScreen
      title="No pudimos cargar tu panel."
      body="Puede ser un problema pasajero con tus inscripciones o tu progreso guardado."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

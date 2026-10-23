"use client";

import { useReportError } from "@/hooks/useReportError";
import ErrorScreen from "@/components/layout/ErrorScreen";

export default function PerfilError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);

  return (
    <ErrorScreen
      title="No pudimos cargar tu perfil."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

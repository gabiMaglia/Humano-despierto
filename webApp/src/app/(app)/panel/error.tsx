"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/layout/ErrorScreen";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando el panel:", error);
  }, [error]);

  return (
    <ErrorScreen
      title="No pudimos cargar tu panel."
      body="Puede ser un problema pasajero con tus inscripciones o tu progreso guardado."
      onRetry={reset}
    />
  );
}

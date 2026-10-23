"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/layout/ErrorScreen";

export default function LeccionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando la lección:", error);
  }, [error]);

  return (
    <ErrorScreen
      title="No pudimos cargar esta lección."
      body="Puede ser un problema pasajero de conexión con el video o con tu progreso guardado."
      onRetry={reset}
    />
  );
}

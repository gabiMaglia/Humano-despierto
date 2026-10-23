"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/layout/ErrorScreen";

export default function PerfilError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando el perfil:", error);
  }, [error]);

  return (
    <ErrorScreen
      title="No pudimos cargar tu perfil."
      onRetry={reset}
    />
  );
}

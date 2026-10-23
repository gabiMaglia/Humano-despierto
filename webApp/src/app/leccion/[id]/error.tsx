"use client";

import { useEffect } from "react";
import Button from "@/components/atoms/Button";

export default function LeccionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando la lección:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center text-tinta">
      <p className="eyebrow">Algo se cortó</p>
      <h1 className="text-2xl">No pudimos cargar esta lección.</h1>
      <p className="max-w-md text-base text-suave">
        Puede ser un problema pasajero de conexión con el video o con tu progreso guardado.
      </p>
      <Button variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}

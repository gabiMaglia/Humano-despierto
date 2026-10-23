"use client";

import { useEffect } from "react";
import Button from "@/components/atoms/Button";

export default function CertificadoError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("Error cargando el certificado:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <h1 className="max-w-[22ch] text-2xl">No pudimos cargar este certificado.</h1>
      <p className="max-w-md text-suave">
        Puede ser un problema pasajero de conexión. El certificado en sí no se pierde: probá de nuevo.
      </p>
      <Button onClick={retry} className="mt-2">
        Reintentar
      </Button>
    </main>
  );
}

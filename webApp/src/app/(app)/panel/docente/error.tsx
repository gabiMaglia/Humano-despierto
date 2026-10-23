"use client";

import Button from "@/components/atoms/Button";
import ErrorMark from "@/components/atoms/ErrorMark";

export default function TeacherPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-bosque">
        <ErrorMark />
        Algo falló en el panel docente
      </h1>
      <p className="max-w-md text-suave">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}

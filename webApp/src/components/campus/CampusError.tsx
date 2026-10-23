"use client";

import Button from "@/components/atoms/Button";

/** Error de un hilo del Campus; lo usan el hilo general y el de cada curso. */
export default function CampusError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h2 className="text-xl">Algo se torció en el Campus</h2>
      <p className="max-w-md text-base text-suave">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

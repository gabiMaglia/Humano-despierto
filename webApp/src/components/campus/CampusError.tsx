"use client";

import Button from "@/components/atoms/Button";
import { ErrorReference } from "@/components/ErrorReference";

/** Error de un hilo del Campus; lo usan el hilo general y el de cada curso. */
export default function CampusError({
  message,
  digest,
  onRetry,
}: {
  message: string;
  digest?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h2 className="text-xl">Algo se torció en el Campus</h2>
      <p className="max-w-md text-base text-suave">{message}</p>
      <ErrorReference digest={digest} />
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

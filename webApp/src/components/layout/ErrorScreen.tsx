"use client";

import Button from "@/components/atoms/Button";
import { ErrorReference } from "@/components/ErrorReference";

/** Pantalla completa de error de una ruta de la alumna (panel, perfil, lección). */
export default function ErrorScreen({
  title,
  body,
  digest,
  onRetry,
}: {
  title: string;
  body?: string;
  digest?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center text-tinta">
      <p className="eyebrow">Algo se cortó</p>
      <h1 className="text-2xl">{title}</h1>
      {body && <p className="max-w-md text-base text-suave">{body}</p>}
      <ErrorReference digest={digest} />
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

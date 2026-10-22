"use client";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <p className="font-display text-lg tracking-wide text-tinta">
        Algo se torció en el panel de administración
      </p>
      <p className="max-w-md font-body text-sm text-suave">{error.message}</p>
      <button onClick={reset} className="btn btn-outline">
        Reintentar
      </button>
    </div>
  );
}

"use client";

export default function TeacherPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cosmos-0 px-6 text-center">
      <p className="font-display text-lg tracking-wide text-ink">
        Algo se torció en el panel docente
      </p>
      <p className="max-w-md font-body text-sm text-ink-faint">{error.message}</p>
      <button onClick={reset} className="btn-ritual btn-ritual-ghost rounded-pill">
        Reintentar
      </button>
    </div>
  );
}

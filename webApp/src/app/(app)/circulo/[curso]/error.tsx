"use client";

export default function CampusCourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-lg tracking-wide text-ink">Algo se torció en el Campus</p>
      <p className="max-w-md font-body text-sm text-ink-faint">{error.message}</p>
      <button onClick={reset} className="btn-ritual btn-ritual-ghost rounded-pill">
        Reintentar
      </button>
    </div>
  );
}

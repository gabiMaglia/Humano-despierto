"use client";

import { useEffect } from "react";

export default function PerfilError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error cargando el perfil:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cosmos-0 px-6 text-center text-ink">
      <p className="font-display text-eyebrow tracking-cosmic text-gold-400">✧ Algo se cortó</p>
      <h1 className="font-display text-lg text-ink">No pudimos cargar tu perfil.</h1>
      <button
        type="button"
        onClick={reset}
        className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}

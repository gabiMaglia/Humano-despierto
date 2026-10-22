"use client";

// Reemplaza al root layout cuando el error es del layout mismo: trae su <html>/<body> y sus estilos.
// T-051 suma aca el registro del error (hoy no hay logger del lado cliente).
import "@/styles/globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="bg-cosmos-0 text-ink antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-display text-eyebrow tracking-cosmic text-gold-400">✧ Algo se cortó</p>
          <h1 className="font-display text-lg text-ink">No pudimos mostrar esta página.</h1>
          <p className="max-w-md font-body text-sm text-ink-soft">
            Puede ser un problema pasajero. Si vuelve a pasar, contanos este código de referencia.
          </p>
          {error.digest && <p className="font-body text-xs text-ink-faint">Código de referencia: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

// Reemplaza al root layout cuando el error es del layout mismo: trae su <html>/<body> y sus estilos.
// T-051 suma aca el registro del error (hoy no hay logger del lado cliente).
import "@/styles/globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="bg-fondo text-tinta antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="eyebrow">Algo se cortó</p>
          <h1 className="font-display text-lg text-tinta">No pudimos mostrar esta página.</h1>
          <p className="max-w-md font-body text-sm text-suave">
            Puede ser un problema pasajero. Si vuelve a pasar, contanos este código de referencia.
          </p>
          {error.digest && <p className="font-body text-xs text-suave">Código de referencia: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            className="font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

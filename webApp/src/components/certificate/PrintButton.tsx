"use client";

// Único leaf con `'use client'` de la página (T-018 c.5): `window.print()` es API de navegador,
// el resto de /certificado/[code] es Server Component puro.
export default function PrintButton() {
  return (
    <div className="mx-auto mb-6 flex max-w-2xl justify-end print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-ritual btn-ritual-ghost rounded-pill"
      >
        Imprimir ↦
      </button>
    </div>
  );
}

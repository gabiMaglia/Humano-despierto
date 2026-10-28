"use client";

import Button from "@/components/atoms/Button";

// Único leaf con `'use client'` de la página (T-018 c.5): `window.print()` es API de navegador,
// el resto de /certificado/[code] es Server Component puro.
export default function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}

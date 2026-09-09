import type { Metadata } from "next";

/** La metadata vive acá y no en `page.tsx` porque esa página es un Client Component (la escena
 * WebGL de §4) y un Client Component no puede exportar `metadata` — Next la ignora en silencio,
 * que es peor que fallar. `index: false`: una pantalla de login no aporta nada al índice y
 * compite con la home por la marca. */
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: true },
};

export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return children;
}

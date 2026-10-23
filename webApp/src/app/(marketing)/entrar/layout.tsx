import type { Metadata } from "next";

/** La metadata vive acá y no en `page.tsx` para que siga junta aunque la página cambie de tipo.
 * `index: false`: una pantalla de login no aporta nada al índice y compite con la home por la marca. */
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: true },
};

export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return children;
}

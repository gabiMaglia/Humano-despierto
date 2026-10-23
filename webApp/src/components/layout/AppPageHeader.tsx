import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}

/** Cabecera de las pantallas de la alumna (panel, perfil, notas, Círculo). `pt-16` deja el lugar
 *  del `SiteHeader`, que es fijo. Texto sobre `salvia-100`: tinta/bosque, suave 4.78 y miel-800 4.86. */
export default function AppPageHeader({ eyebrow, title, subtitle, children }: Props) {
  return (
    <header className="border-b border-linea bg-salvia-100 pt-16">
      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-display-md">{title}</h1>
        {subtitle && <div className="mt-3 max-w-[60ch] text-base text-suave">{subtitle}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

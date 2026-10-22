import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import AdminTabs, { type AdminTab } from "./AdminTabs";

interface Props {
  active: AdminTab;
  /** Reseñas (T-037) tiene su propio título; el resto usa el del panel. */
  heading?: ReactNode;
  children: ReactNode;
}

const DEFAULT_HEADING = (
  <>
    El <em className="font-quote italic text-miel-800">umbral</em> del sistema
  </>
);

export default function AdminShell({ active, heading = DEFAULT_HEADING, children }: Props) {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <AdminTabs active={active} />
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">— Panel de administración —</p>
          <h1 className="font-display text-display-md text-tinta">{heading}</h1>
        </header>
        <div className="mx-auto max-w-5xl space-y-12 px-6 py-10 md:px-12">{children}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

interface Props {
  badge: string;
  title: ReactNode;
  subtitle: string;
  children?: ReactNode;
}

export default function PageHeader({ badge, title, subtitle, children }: Props) {
  return (
    <header className="border-b border-linea bg-papel px-6 py-16 md:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-pill border border-linea px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-miel" />
          <span className="font-display text-[9px] uppercase tracking-[0.22em] text-bosque">{badge}</span>
        </div>
        <h1 className="mb-3 font-display text-display-md text-tinta">{title}</h1>
        <p className="font-quote italic text-lg text-suave leading-relaxed">{subtitle}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

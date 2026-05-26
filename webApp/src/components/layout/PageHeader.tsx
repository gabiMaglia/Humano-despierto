import type { ReactNode } from "react";

interface Props {
  badge: string;
  title: ReactNode;
  subtitle: string;
  children?: ReactNode;
}

export default function PageHeader({ badge, title, subtitle, children }: Props) {
  return (
    <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-16 md:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-pill border border-lila-300/40 px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" style={{ boxShadow: "0 0 8px #f5d76e" }} />
          <span className="font-display text-[9px] uppercase tracking-[0.22em] text-lila-300">{badge}</span>
        </div>
        <h1 className="mb-3 font-display text-display-md text-ink">{title}</h1>
        <p className="font-quote italic text-lg text-ink-soft leading-relaxed">{subtitle}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

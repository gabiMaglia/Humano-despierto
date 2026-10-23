import type { ReactNode } from "react";

/** Sección con título de nivel 2. `id` enlaza el título con la región para el lector de pantalla. */
export default function PanelSection({ id, title, aside, children }: { id: string; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-xl font-semibold text-bosque">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

import Icon from "@/components/atoms/Icon";

export interface FaqItem {
  q: string;
  a: string;
}

/** Preguntas frecuentes (B1): `<details>` nativo, abre con teclado y sin JS. */
export default function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div>
      {items.map((it) => (
        <details key={it.q} className="group border-b border-linea">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 py-5 text-lg font-semibold text-bosque [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-salvia-100 transition-transform duration-300 ease-brote group-open:rotate-45 motion-reduce:transition-none">
              <Icon name="plus" className="h-3.5 w-3.5 text-bosque" />
            </span>
          </summary>
          <p className="pb-6 pr-12 text-suave">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

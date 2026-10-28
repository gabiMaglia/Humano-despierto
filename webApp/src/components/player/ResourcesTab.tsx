import Icon from "@/components/atoms/Icon";
import type { PlayerResource } from "@/lib/server/lesson-player";

export default function ResourcesTab({ resources }: { resources: PlayerResource[] }) {
  return (
    <ul className="space-y-3">
      {resources.map((r) => (
        <li key={r.id}>
          {/* Link comun y no boton: funciona sin JS y con "guardar como". Sin `download`,
              que no aplica a un redirect cross-origin. */}
          <a
            href={r.href}
            aria-label={`Descargar ${r.name}`}
            className="tarjeta flex items-center gap-3 p-4 transition-colors hover:bg-salvia-100"
          >
            <span className="flex-none rounded-sm bg-miel-100 px-2 py-0.5 text-xs font-bold uppercase text-miel-800">
              {r.type}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug text-bosque">{r.name}</span>
              {r.sizeLabel && <span className="block text-xs text-suave">{r.sizeLabel}</span>}
            </span>
            <Icon name="download" className="h-5 w-5 text-musgo" />
          </a>
        </li>
      ))}
      {resources.length === 0 && <li className="text-sm text-suave">Esta lección no tiene recursos.</li>}
    </ul>
  );
}

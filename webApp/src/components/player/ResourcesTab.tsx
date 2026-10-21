import type { PlayerResource } from "@/lib/server/lesson-player";

export default function ResourcesTab({ resources }: { resources: PlayerResource[] }) {
  return (
    <div className="space-y-3">
      {resources.map((r) => (
        // Link comun y no boton: funciona sin JS y con "guardar como". Sin `download`,
        // que no aplica a un redirect cross-origin.
        <a
          key={r.id}
          href={r.href}
          aria-label={`Descargar ${r.name}`}
          className="flex items-start gap-3 cosmos-card p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
        >
          <span className="flex-none font-display text-eyebrow tracking-cosmic text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5 uppercase">
            {r.type}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-body text-xs text-ink leading-snug">{r.name}</p>
            {r.sizeLabel && (
              <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{r.sizeLabel}</p>
            )}
          </div>
          <span aria-hidden="true" className="flex-none font-display text-gold-400">
            ↓
          </span>
        </a>
      ))}
      {resources.length === 0 && (
        <p className="font-body text-xs italic text-ink-faint">Esta lección no tiene recursos.</p>
      )}
    </div>
  );
}

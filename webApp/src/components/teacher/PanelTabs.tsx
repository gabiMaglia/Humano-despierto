import Link from "next/link";

const TABS = [
  { key: "cursos", href: "/panel/docente", label: "Cursos" },
  { key: "diario", href: "/panel/docente/diario", label: "Diario" },
  { key: "anuncios", href: "/panel/docente/anuncios", label: "Anuncios" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Sub-navegación del panel docente. T-022 sumó "Diario"; T-031, "Anuncios". */
export default function PanelTabs({ active }: { active: TabKey }) {
  return (
    <nav aria-label="Panel docente" className="flex gap-2 border-b border-lila-300/18 bg-cosmos-surface px-6 pt-4 md:px-12">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-t-ritual px-4 py-2 font-display text-eyebrow tracking-cosmic transition-colors ${
              isActive
                ? "border border-b-0 border-lila-300/30 bg-cosmos-0 text-lila-300"
                : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

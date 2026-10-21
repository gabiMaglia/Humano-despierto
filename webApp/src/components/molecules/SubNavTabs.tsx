import Link from "next/link";

export interface SubNavTab {
  key: string;
  href: string;
  label: string;
}

/** Sub-navegación de un panel. Nació en `PanelTabs` (docente) y se extrajo cuando el admin la
 *  necesitó (T-037). */
export default function SubNavTabs({ tabs, active }: { tabs: readonly SubNavTab[]; active: string }) {
  return (
    <nav className="flex gap-2 border-b border-lila-300/18 bg-cosmos-surface px-6 pt-4 md:px-12">
      {tabs.map((tab) => {
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

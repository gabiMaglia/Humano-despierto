import Link from "next/link";

export interface SubNavTab {
  key: string;
  href: string;
  label: string;
}

/** Sub-navegación de un panel. Son enlaces a páginas distintas, así que va como `nav` con
 *  `aria-current` (un `tablist` prometería un manejo de flechas que no hay). En pantallas
 *  angostas scrollea dentro de su propia franja, sin ensanchar la página. */
export default function SubNavTabs({ tabs, active, label = "Secciones del panel" }: { tabs: readonly SubNavTab[]; active: string; label?: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.href} className="flex-none">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 items-center border-b-[3px] focus-visible:outline-offset-[-3px] px-4 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-miel-800 text-bosque"
                    : "border-transparent text-suave hover:border-salvia hover:text-bosque"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

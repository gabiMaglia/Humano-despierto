import SubNavTabs from "@/components/molecules/SubNavTabs";

const TABS = [
  { key: "general", href: "/panel/admin", label: "General" },
  { key: "resenas", href: "/panel/admin/resenas", label: "Reseñas" },
] as const;

export type AdminTab = (typeof TABS)[number]["key"];

/** Sub-navegación del admin. "General" es la página de siempre, con la cola de solicitudes de
 *  T-043; las secciones nuevas se suman acá. */
export default function AdminTabs({ active }: { active: AdminTab }) {
  return <SubNavTabs tabs={TABS} active={active} />;
}

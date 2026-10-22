import SubNavTabs from "@/components/molecules/SubNavTabs";

const TABS = [
  { key: "inscripciones", href: "/panel/admin", label: "Inscripciones" },
  { key: "usuarios", href: "/panel/admin/usuarios", label: "Usuarios" },
  { key: "cursos", href: "/panel/admin/cursos", label: "Cursos" },
  { key: "resenas", href: "/panel/admin/resenas", label: "Reseñas" },
  { key: "invitaciones", href: "/panel/admin/invitaciones", label: "Invitaciones" },
  { key: "anuncios", href: "/panel/admin/anuncios", label: "Anuncios" },
] as const;

export type AdminTab = (typeof TABS)[number]["key"];

/** Sub-navegación del admin (nace en T-037). T-049 parte la página única en pestañas; la de
 *  inscripciones conserva /panel/admin porque ahí vive la cola de solicitudes de T-043. */
export default function AdminTabs({ active }: { active: AdminTab }) {
  return <SubNavTabs tabs={TABS} active={active} />;
}

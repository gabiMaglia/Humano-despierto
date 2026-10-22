import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPagedList from "@/components/admin/AdminPagedList";
import UserRoleRow from "@/components/admin/UserRoleRow";
import { parseListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/server/admin";
import { listUsersPage } from "@/lib/server/admin-lists";

export const metadata: Metadata = { title: "Usuarios · Admin", robots: { index: false, follow: false } };

const PATH = "/panel/admin/usuarios";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Layout y página renderizan en paralelo: la lectura con service_role no depende del layout.
  await requireAdmin();
  const params = parseListParams(await searchParams);
  const page = await listUsersPage(params);
  return (
    <AdminShell active="usuarios">
      <section aria-labelledby="usuarios-titulo">
        <h2 id="usuarios-titulo" className="mb-5 font-display text-lg tracking-wide text-tinta">
          Usuarios y roles
        </h2>
        <AdminPagedList
          path={PATH}
          q={params.q}
          next={page.next}
          isEmpty={page.items.length === 0}
          searchLabel="Buscar por nombre o mail"
          searchButton="Buscar"
          emptyLabel={params.q ? "Nada coincide con esa búsqueda." : "Todavía no hay usuarios."}
          nextLabel="Siguiente"
        >
          {page.items.map((u) => (
            <UserRoleRow key={u.id} user={u} />
          ))}
        </AdminPagedList>
      </section>
    </AdminShell>
  );
}

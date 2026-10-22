import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPagedList from "@/components/admin/AdminPagedList";
import InviteTeacherForm from "@/components/admin/InviteTeacherForm";
import InvitationRow from "@/components/admin/InvitationRow";
import { parseListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/server/admin";
import { listInvitationsPage } from "@/lib/server/admin-lists";

export const metadata: Metadata = { title: "Invitaciones · Admin", robots: { index: false, follow: false } };

const PATH = "/panel/admin/invitaciones";

export default async function AdminInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Layout y página renderizan en paralelo: la lectura con service_role no depende del layout.
  await requireAdmin();
  const params = parseListParams(await searchParams);
  const page = await listInvitationsPage(params);
  return (
    <AdminShell active="invitaciones">
      <section aria-labelledby="invitar-titulo">
        <h2 id="invitar-titulo" className="mb-5 font-display text-lg tracking-wide text-ink">
          Invitar a una docente
        </h2>
        <InviteTeacherForm />
      </section>
      <section aria-labelledby="invitaciones-titulo">
        <h2 id="invitaciones-titulo" className="mb-5 font-display text-lg tracking-wide text-ink">
          Invitaciones
        </h2>
        <AdminPagedList
          path={PATH}
          q={params.q}
          next={page.next}
          isEmpty={page.items.length === 0}
          searchLabel="Buscar por mail"
          searchButton="Buscar"
          emptyLabel={params.q ? "Nada coincide con esa búsqueda." : "Todavía no invitaste a nadie."}
          nextLabel="Siguiente"
        >
          {page.items.map((i) => (
            <InvitationRow key={i.id} invitation={i} />
          ))}
        </AdminPagedList>
      </section>
    </AdminShell>
  );
}

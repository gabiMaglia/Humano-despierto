import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPagedList from "@/components/admin/AdminPagedList";
import EnrollmentGrantForm from "@/components/admin/EnrollmentGrantForm";
import EnrollmentRow from "@/components/admin/EnrollmentRow";
import EnrollmentRequestRow from "@/components/admin/EnrollmentRequestRow";
import { parseListParams } from "@/lib/admin/list-params";
import { listPendingEnrollmentRequests, requireAdmin } from "@/lib/server/admin";
import { listEnrollmentsPage } from "@/lib/server/admin-lists";

export const metadata: Metadata = { title: "Inscripciones · Admin", robots: { index: false, follow: false } };

// Pestaña "Inscripciones": la cola de T-043 arriba (sin paginar: es trabajo a vaciar) y el
// historial abajo, buscable y paginado. Usuarios, cursos e invitaciones viven en subrutas.
export default async function AdminPanelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Layout y página renderizan en paralelo: la lectura con service_role no depende del layout.
  await requireAdmin();
  const params = parseListParams(await searchParams);
  const [requests, page] = await Promise.all([listPendingEnrollmentRequests(), listEnrollmentsPage(params)]);

  return (
    <AdminShell active="inscripciones">
      <section aria-labelledby="solicitudes-pendientes">
        <h2 id="solicitudes-pendientes" className="mb-5 font-display text-lg tracking-wide text-tinta">
          Solicitudes pendientes <span className="text-suave">({requests.length})</span>
        </h2>
        <ul className="space-y-3">
          {requests.length === 0 && <li className="font-body text-sm text-suave">No hay solicitudes pendientes.</li>}
          {requests.map((r) => (
            <EnrollmentRequestRow key={r.id} request={r} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="inscripciones-titulo">
        <h2 id="inscripciones-titulo" className="mb-5 font-display text-lg tracking-wide text-tinta">
          Inscripciones
        </h2>
        <div className="mb-5">
          <EnrollmentGrantForm />
        </div>
        <AdminPagedList
          path="/panel/admin"
          q={params.q}
          next={page.next}
          isEmpty={page.items.length === 0}
          searchLabel="Buscar por alumna, mail o curso"
          searchButton="Buscar"
          emptyLabel={params.q ? "Nada coincide con esa búsqueda." : "Todavía no hay inscripciones registradas."}
          nextLabel="Siguiente"
        >
          {page.items.map((e) => (
            <EnrollmentRow key={e.id} enrollment={e} />
          ))}
        </AdminPagedList>
      </section>
    </AdminShell>
  );
}

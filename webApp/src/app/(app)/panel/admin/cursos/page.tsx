import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminPagedList from "@/components/admin/AdminPagedList";
import CourseStatusRow from "@/components/admin/CourseStatusRow";
import { parseListParams } from "@/lib/admin/list-params";
import { requireAdmin } from "@/lib/server/admin";
import { listCoursesPage } from "@/lib/server/admin-lists";

export const metadata: Metadata = { title: "Cursos · Admin", robots: { index: false, follow: false } };

const PATH = "/panel/admin/cursos";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Layout y página renderizan en paralelo: la lectura con service_role no depende del layout.
  await requireAdmin();
  const params = parseListParams(await searchParams);
  const page = await listCoursesPage(params);
  return (
    <AdminShell active="cursos">
      <section aria-labelledby="cursos-titulo">
        <h2 id="cursos-titulo" className="mb-4 text-xl font-semibold text-bosque">
          Cursos
        </h2>
        <AdminPagedList
          path={PATH}
          q={params.q}
          next={page.next}
          isEmpty={page.items.length === 0}
          searchLabel="Buscar por título, slug o docente"
          searchButton="Buscar"
          emptyLabel={params.q ? "Nada coincide con esa búsqueda." : "Todavía no hay cursos."}
          nextLabel="Siguiente"
        >
          {page.items.map((c) => (
            <CourseStatusRow key={c.id} course={c} />
          ))}
        </AdminPagedList>
      </section>
    </AdminShell>
  );
}

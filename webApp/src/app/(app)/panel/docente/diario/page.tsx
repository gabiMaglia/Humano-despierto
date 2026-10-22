import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import PanelTabs from "@/components/teacher/PanelTabs";
import { requireTeacher } from "@/lib/server/teacher";
import { listTeacherPosts } from "@/lib/server/diario";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
};

// Criterio 1: solo los posts DE la docente autenticada — `listTeacherPosts` ya filtra
// (cliente de sesión + RLS, no hace falta repetirlo acá).
export default async function TeacherDiarioPage() {
  const teacher = await requireTeacher();
  const posts = await listTeacherPosts(teacher.id);

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <PanelTabs active="diario" />
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-linea bg-papel px-6 py-8 md:px-12">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">
              — Lo que escribís entre clase y clase —
            </p>
            <h1 className="font-display text-display-md text-tinta">
              Tu <em className="font-quote italic text-miel-800">diario</em>
            </h1>
          </div>
          <Link href="/panel/docente/diario/nuevo" className="btn btn-primary">
            + Nuevo post
          </Link>
        </header>

        <div className="mx-auto max-w-4xl space-y-3 px-6 py-10 md:px-12">
          {posts.length === 0 && (
            <p className="tarjeta p-6 font-body text-sm text-suave">
              Todavía no escribiste ningún post. Empezá por el botón de arriba.
            </p>
          )}

          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/panel/docente/diario/${p.id}`}
              className="tarjeta flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-linea"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm tracking-wide text-tinta">{p.title}</p>
                <p className="font-body text-xs text-suave">/diario/{p.slug}</p>
              </div>
              <span className="rounded-pill border border-linea px-3 py-1 font-display text-[10px] tracking-wide text-suave uppercase">
                {STATUS_LABEL[p.status] ?? p.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

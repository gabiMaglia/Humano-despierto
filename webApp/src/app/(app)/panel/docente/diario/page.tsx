import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
import { RowMain } from "@/components/panel/PanelRow";
import StatusChip from "@/components/panel/StatusChip";
import PanelTabs from "@/components/teacher/PanelTabs";
import { POST_STATUS, statusOf } from "@/lib/panel/status";
import { requireTeacher } from "@/lib/server/teacher";
import { listTeacherPosts } from "@/lib/server/diario";

// Criterio 1: solo los posts DE la docente autenticada — `listTeacherPosts` ya filtra
// (cliente de sesión + RLS, no hace falta repetirlo acá).
export default async function TeacherDiarioPage() {
  const teacher = await requireTeacher();
  const posts = await listTeacherPosts(teacher.id);

  return (
    <PanelFrame
      title="Tu diario"
      context="Lo que escribís entre clase y clase."
      tabs={<PanelTabs active="diario" />}
      actions={<ButtonLink href="/panel/docente/diario/nuevo">+ Nuevo post</ButtonLink>}
    >
      <PanelSection id="posts-titulo" title="Posts">
        {posts.length === 0 && <p className="tarjeta p-6 text-suave">Todavía no escribiste ningún post. Empezá por el botón de arriba.</p>}
        <ul className="space-y-3">
          {posts.map((p) => {
            const status = statusOf(POST_STATUS, p.status);
            return (
              <li key={p.id}>
                <Link
                  href={`/panel/docente/diario/${p.id}`}
                  className="tarjeta flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:border-salvia hover:bg-salvia-100"
                >
                  <RowMain title={p.title} meta={`/diario/${p.slug}`} />
                  <StatusChip tone={status.tone}>{status.label}</StatusChip>
                </Link>
              </li>
            );
          })}
        </ul>
      </PanelSection>
    </PanelFrame>
  );
}

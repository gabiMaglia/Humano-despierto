import { notFound } from "next/navigation";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
import { requireTeacher } from "@/lib/server/teacher";
import { getTeacherPost } from "@/lib/server/diario";
import PostForm from "@/components/teacher/PostForm";
import PublishPostControl from "@/components/teacher/PublishPostControl";
import DeletePostControl from "@/components/teacher/DeletePostControl";

interface Props {
  params: Promise<{ postId: string }>;
}

// Criterio 1: `getTeacherPost` devuelve `null` tanto si el post no existe como si no es de la
// docente que pide — misma respuesta (`notFound()`) para las dos cosas (mismo criterio que
// `TeacherCourseEditorPage`, T-005 c.6). Nota heredada de la deuda del engram: este segmento
// cuelga bajo `(app)/panel/loading.tsx`, así que el `notFound()` responde 200 acá — aceptado a
// propósito en T-021 porque post ajeno e inexistente ya responden IGUAL (sin diferencia que
// enumerar) y es un panel autenticado, no la ruta pública que pide el criterio 2 de este ticket.
export default async function TeacherDiarioEditorPage({ params }: Props) {
  const { postId } = await params;
  const teacher = await requireTeacher();
  const post = await getTeacherPost(postId, teacher.id);

  if (!post) notFound();

  return (
    <PanelFrame
      title={post.title}
      context={`/diario/${post.slug}`}
      back={{ href: "/panel/docente/diario", label: "Tu diario" }}
      actions={<PublishPostControl postId={post.id} status={post.status} />}
    >
      <PanelSection id="post-titulo" title="El post">
        <PostForm post={post} />
      </PanelSection>

      <DeletePostControl postId={post.id} postTitle={post.title} />
    </PanelFrame>
  );
}

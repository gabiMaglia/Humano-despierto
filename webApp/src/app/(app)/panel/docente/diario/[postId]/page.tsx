import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
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
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <div>
            <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">
              — /diario/{post.slug} —
            </p>
            <h1 className="font-display text-display-md text-ink">{post.title}</h1>
          </div>
          <PublishPostControl postId={post.id} status={post.status} />
        </header>

        <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
          <section>
            <h2 className="mb-4 font-display text-lg tracking-wide text-ink">El post</h2>
            <PostForm post={post} />
          </section>

          <DeletePostControl postId={post.id} postTitle={post.title} />
        </div>
      </div>
    </div>
  );
}

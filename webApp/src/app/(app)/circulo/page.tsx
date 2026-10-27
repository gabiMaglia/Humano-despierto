import { getCampusThread } from "@/lib/server/campus";
import { getCurrentUser } from "@/lib/server/auth";
import CampusComposer from "@/components/campus/CampusComposer";
import CampusMessage from "@/components/campus/CampusMessage";
import ThreadEmpty from "@/components/campus/ThreadEmpty";
import ThreadHeader from "@/components/campus/ThreadHeader";

// El hilo GENERAL: lo lee y escribe cualquier sesión, sin inscripción a ningún curso.
// Es el único hilo del Campus legible sin inscripción — pero eso NO lo hace el único con
// protección anti-localizador: ésa rige en todos los hilos (0016). Condicionarla por hilo fue
// el defecto que QA rechazó, porque el lector de un hilo de curso tampoco tiene acceso al
// material de los otros cursos.
export default async function CampusGeneralPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getCampusThread(null)]);

  // El layout de `(app)` ya garantiza sesión; si por algo `data` viniera null igual (perfil sin
  // fila, carrera de alta), un hilo vacío en vez de un 500 es la degradación razonable.
  const thread = data?.thread ?? { courseId: null, slug: null, title: "Plaza mayor", subtitle: "", glyph: "" };
  const posts = data?.posts ?? [];

  return (
    <>
      <ThreadHeader
        title={thread.title}
        subtitle="Lo que se conversa sin necesidad de estar cursando nada en particular"
      />

      <CampusComposer
        courseId={null}
        courseSlug={null}
        authorName={user?.fullName ?? null}
        placeholder="Compartí una pregunta, una observación, una presentación..."
      />

      {posts.length === 0 ? (
        <ThreadEmpty title="Todavía nadie escribió acá">
          El hilo general recién arranca. Un espacio nuevo, no uno abandonado.
        </ThreadEmpty>
      ) : (
        <div>
          {posts.map((post) => (
            <CampusMessage key={post.id} post={post} courseSlug={null} />
          ))}
        </div>
      )}
    </>
  );
}

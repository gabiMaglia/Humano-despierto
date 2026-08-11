import { getCampusThread } from "@/lib/server/campus";
import { getCurrentUser } from "@/lib/server/auth";
import CampusComposer from "@/components/campus/CampusComposer";
import CampusMessage from "@/components/campus/CampusMessage";

// El hilo GENERAL: cualquier sesión, sin inscripción a ningún curso (0014, criterio 4 — el
// único hilo del Campus legible sin inscripción, por eso el único con el CHECK anti-localizador
// de ADR-009 activo en el cuerpo).
export default async function CampusGeneralPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getCampusThread(null)]);

  // El layout de `(app)` ya garantiza sesión; si por algo `data` viniera null igual (perfil sin
  // fila, carrera de alta), un hilo vacío en vez de un 500 es la degradación razonable.
  const thread = data?.thread ?? { courseId: null, slug: null, title: "Plaza mayor", subtitle: "", glyph: "✦" };
  const posts = data?.posts ?? [];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-lila-300/18 p-5">
        <div>
          <h2 className="font-display text-lg tracking-wide text-ink">{thread.title}</h2>
          <p className="font-body text-xs text-ink-faint">Lo que se conversa sin necesidad de estar cursando nada en particular</p>
        </div>
      </div>

      <CampusComposer
        courseId={null}
        courseSlug={null}
        authorGlyph={user?.glyph ?? null}
        placeholder="Compartí una pregunta, una observación, una presentación..."
      />

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <span className="text-3xl text-lila-300">✦</span>
          <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">— Todavía nadie escribió acá —</p>
          <p className="max-w-sm font-body text-sm text-ink-soft">
            El hilo general recién arranca. Un espacio nuevo, no uno abandonado.
          </p>
        </div>
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

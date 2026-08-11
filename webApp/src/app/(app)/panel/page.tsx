import Link from "next/link";
import Nav from "@/components/layout/Nav";
import ProgressRing from "@/components/atoms/ProgressRing";
import { getCurrentUser } from "@/lib/server/auth";
import { getStudentDashboard } from "@/lib/server/enrollment";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { toRoman } from "@/lib/utils/roman";

// T-007 · panel del alumno. Reemplaza el mock `STUDENT.enrolled` por inscripciones activas +
// progreso real (ADR-007: `completed` es derivada, nunca se declara acá). Los widgets
// decorativos del mock original (fase lunar de HOY con fecha fija, bitácora, círculo) no tienen
// ninguna tabla que los respalde — se sacan en vez de mostrarse como si fueran datos reales del
// alumno (c.5). Si en el futuro cursan la bitácora/el círculo de una tabla real, vuelven acá.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const { courses } = user ? await getStudentDashboard() : { courses: [] };

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-cosmos-0 text-ink">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-5 px-6 py-32 text-center">
          <span className="text-4xl text-lila-300">✦</span>
          <p className="font-display text-eyebrow tracking-[0.25em] text-ink-faint">— El umbral de tu camino —</p>
          <h1 className="max-w-md font-display text-display-md text-ink">
            Todavía no empezaste ningún <em className="font-quote italic text-lila-300">recorrido</em>
          </h1>
          <p className="max-w-md font-body text-sm text-ink-soft">
            Cuando te inscribas en un curso, vas a ver acá tu progreso y podés continuar donde quedaste.
          </p>
          <Link href="/cursos" className="btn-ritual btn-ritual-primary rounded-pill mt-2">
            Explorar el catálogo ↦
          </Link>
        </div>
      </div>
    );
  }

  const continuing = courses.find((c) => c.progressPercent < 100) ?? courses[0];

  return (
    <div className="min-h-screen mt-[-5] bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">

        {/* Welcome header */}
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">— El umbral de tu camino —</p>
          <h1 className="font-display text-display-md text-ink">
            Bienvenida de vuelta, <em className="font-quote italic text-lila-300">{user?.fullName ?? "alumna"}</em>
          </h1>
          {user?.glyph && (
            <div className="mt-2 flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-soft">
              <span>{user.glyph}</span>
            </div>
          )}
        </header>

        {/* Continue watching strip */}
        <div className="border-b border-lila-300/18 bg-lila-300/[0.04] px-6 py-5 md:px-12 flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="font-display text-eyebrow tracking-cosmic text-ink-faint uppercase">Continuar donde quedaste</p>
            <h3 className="font-display text-lg tracking-wide text-ink">{continuing.title}</h3>
            <p className="font-display text-eyebrow tracking-cosmic text-lila-300">{continuing.discipline}</p>
          </div>
          <div className="flex-none">
            <ProgressRing value={continuing.progressPercent} />
          </div>
          <div className="flex flex-col items-start gap-2">
            {continuing.continueLessonId ? (
              <Link href={`/leccion/${continuing.continueLessonId}`} className="btn-ritual btn-ritual-primary rounded-pill">
                Continuar ↦
              </Link>
            ) : (
              <Link href={`/cursos/${continuing.slug}`} className="btn-ritual btn-ritual-primary rounded-pill">
                Ver curso ↦
              </Link>
            )}
            {continuing.lastSeenAt && (
              <span className="font-quote italic text-sm text-ink-soft">
                Vista por última vez <em className="text-lila-300">{formatRelativeTime(continuing.lastSeenAt)}</em>
              </span>
            )}
          </div>
        </div>

        {/* Enrolled courses */}
        <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg tracking-wide text-ink">Tu camino actual</h2>
            <Link href="/cursos" className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors">Ver todos</Link>
          </div>
          <div className="space-y-4">
            {courses.map((c, i) => (
              <article key={c.courseId} className={`cosmos-card flex items-center gap-5 p-5 ${c.progressPercent === 100 ? "opacity-60" : ""}`}>
                <div className="flex flex-col items-center gap-1 flex-none">
                  <span className="font-display text-lg tracking-wide text-lila-300">{c.romanNum ?? toRoman(i + 1)}</span>
                  {c.moonGlyph && <span className="text-base">{c.moonGlyph}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-eyebrow tracking-cosmic text-gold-400 uppercase">{c.discipline} · {c.teacherName}</p>
                  <h4 className="font-display text-base tracking-wide text-ink mb-0.5">{c.title}</h4>
                  <div className="mt-1 flex items-center gap-2 font-body text-xs text-ink-faint">
                    <span>{c.completedLessons}/{c.totalLessons} lecciones</span>
                    {c.lastSeenAt && (
                      <>
                        <span className="text-lila-300/30">·</span>
                        <span>{formatRelativeTime(c.lastSeenAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-none flex flex-col items-center gap-2">
                  <ProgressRing value={c.progressPercent} />
                  {c.progressPercent < 100 && c.continueLessonId && (
                    <Link href={`/leccion/${c.continueLessonId}`} className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors whitespace-nowrap">
                      Continuar ↦
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

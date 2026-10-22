import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import ProgressRing from "@/components/atoms/ProgressRing";
import LearningCourseRow from "@/components/molecules/LearningCourseRow";
import LearningTabsNav from "@/components/molecules/LearningTabsNav";
import SavedCourseRow from "@/components/molecules/SavedCourseRow";
import { getWishlist } from "@/lib/server/wishlist";
import { buildLearningTabs, parseLearningTab } from "@/lib/learning/tabs";
import { getCurrentUser } from "@/lib/server/auth";
import { getStudentDashboard } from "@/lib/server/enrollment";
import StudentRequests from "@/components/molecules/StudentRequests";
import { ensureCertificate } from "@/lib/server/certificates";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import AnnouncementList from "@/components/announcements/AnnouncementList";
import { getRecentAnnouncementsForStudent } from "@/lib/server/announcements";

// T-033 · "Mi aprendizaje": pestañas por `?tab=` sobre lo de T-007.
// T-007 · panel del alumno. Reemplaza el mock `STUDENT.enrolled` por inscripciones activas +
// progreso real (ADR-007: `completed` es derivada, nunca se declara acá). Los widgets
// decorativos del mock original (fase lunar de HOY con fecha fija, bitácora, círculo) no tienen
// ninguna tabla que los respalde — se sacan en vez de mostrarse como si fueran datos reales del
// alumno (c.5). Si en el futuro cursan la bitácora/el círculo de una tabla real, vuelven acá.
const EMPTY_TAB: Record<string, string> = {
  "en-curso": "No tenés cursos en curso.",
  completados: "Todavía no completaste ningún curso.",
  guardados: "No guardaste ningún curso todavía.",
  solicitados: "No tenés solicitudes enviadas.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tab = parseLearningTab((await searchParams).tab);
  const user = await getCurrentUser();
  const [{ courses, requests }, saved] = user
    ? await Promise.all([getStudentDashboard(), getWishlist()])
    : [{ courses: [], requests: [] }, []];

  if (courses.length === 0 && saved.length === 0 && requests.length === 0) {
    return (
      <div className="min-h-screen bg-fondo text-tinta">
        <SiteHeader />
        <div className="flex flex-col items-center justify-center gap-5 px-6 py-32 text-center">
          <p className="font-display text-eyebrow tracking-[0.25em] text-suave">— El umbral de tu camino —</p>
          <h1 className="max-w-md font-display text-display-md text-tinta">
            Todavía no empezaste ningún <em className="font-quote italic text-miel-800">recorrido</em>
          </h1>
          <p className="max-w-md font-body text-sm text-suave">
            Cuando te inscribas en un curso, vas a ver acá tu progreso y podés continuar donde quedaste.
          </p>
          <Link href="/cursos" className="btn btn-primary mt-2">
            Explorar el catálogo
          </Link>
        </div>
      </div>
    );
  }

  const tabs = buildLearningTabs({ courses, saved, requestCount: requests.length });

  // T-018 · el certificado se emite al completar TODAS las lecciones publicadas — no lo declara
  // nadie, `ensureCertificate` vuelve a verificarlo server-side (ADR-007 extendido). Se pide
  // acá, perezoso, para los cursos que YA están al 100%: cubre tanto al que lo completó recién
  // (todavía sin fila en `certificates`) como a datos de seed sembrados directo en la base
  // (delfina.curso-completo, sin haber pasado nunca por `saveLessonProgress`).
  const certificateEntries = await Promise.all(
    tabs.completados.map(async (c) => [c.courseId, await ensureCertificate(c.courseId)] as const)
  );
  const certificateByCourse = new Map(
    certificateEntries.filter((entry): entry is [string, string] => entry[1] !== null)
  );

  // El curso tocado más recientemente con progreso < 100; si no queda ninguno, el más reciente.
  const continuing = tabs.enCurso[0] ?? tabs.completados[0];
  const visibleCourses = tab === "completados" ? tabs.completados : tabs.enCurso;
  const news = await getRecentAnnouncementsForStudent(courses.map((c) => c.courseId));

  return (
    <div className="min-h-screen mt-[-5] bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">

        {/* Welcome header */}
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">— Mi aprendizaje —</p>
          <h1 className="font-display text-display-md text-tinta">
            Bienvenida de vuelta, <em className="font-quote italic text-miel-800">{user?.fullName ?? "alumna"}</em>
          </h1>
          {user?.glyph && (
            <div className="mt-2 flex items-center gap-2 font-display text-eyebrow tracking-wide text-suave">
              <span>{user.glyph}</span>
            </div>
          )}
        </header>

        {/* Continue watching strip */}
        {continuing && (
          <div className="border-b border-linea bg-salvia-100 px-6 py-5 md:px-12 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-0">
              <p className="font-display text-eyebrow tracking-wide text-suave uppercase">Continuar donde quedaste</p>
              <h3 className="font-display text-lg tracking-wide text-tinta">{continuing.title}</h3>
              <p className="font-display text-eyebrow tracking-wide text-bosque">{continuing.discipline}</p>
            </div>
            <div className="flex-none">
              <ProgressRing value={continuing.progressPercent} />
            </div>
            <div className="flex flex-col items-start gap-2">
              {continuing.continueLessonId ? (
                <Link href={`/leccion/${continuing.continueLessonId}`} className="btn btn-primary">
                  Continuar
                </Link>
              ) : (
                <Link href={`/cursos/${continuing.slug}`} className="btn btn-primary">
                  Ver curso
                </Link>
              )}
              {continuing.lastSeenAt && (
                <span className="font-quote italic text-sm text-suave">
                  Vista por última vez <em className="text-miel-800">{formatRelativeTime(continuing.lastSeenAt)}</em>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Novedades (T-031): arriba de las pestañas, sin anuncios no se dibuja. */}
        {news.length > 0 && (
          <section aria-label="Novedades de tus cursos" className="mx-auto max-w-4xl px-6 pt-10 md:px-12">
            <h2 className="mb-5 font-display text-lg tracking-wide text-tinta">Novedades de tus cursos</h2>
            <AnnouncementList items={news} showCourse />
          </section>
        )}

        <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg tracking-wide text-tinta">Tu camino</h2>
            <div className="flex items-center gap-5">
              <Link href="/panel/notas" className="font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors">Mis notas</Link>
              <Link href="/cursos" className="font-display text-eyebrow tracking-wide text-bosque hover:text-miel-800 transition-colors">Ver todos</Link>
            </div>
          </div>

          <LearningTabsNav current={tab} counts={tabs.counts} />

          {tabs.counts[tab] === 0 ? (
            <div className="tarjeta flex flex-col items-center gap-4 px-6 py-14 text-center">
              <p className="font-body text-sm text-suave">{EMPTY_TAB[tab]}</p>
              <Link href="/cursos" className="btn btn-outline">
                Explorar el catálogo
              </Link>
            </div>
          ) : tab === "guardados" ? (
            <ul className="space-y-3">
              {tabs.guardados.map((item) => (
                <SavedCourseRow key={item.courseId} item={item} />
              ))}
            </ul>
          ) : tab === "solicitados" ? (
            <StudentRequests requests={requests} />
          ) : (
            <div className="space-y-4">
              {visibleCourses.map((c, i) => (
                <LearningCourseRow key={c.courseId} course={c} index={i} certificateCode={certificateByCourse.get(c.courseId)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

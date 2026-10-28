import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import AppPageHeader from "@/components/layout/AppPageHeader";
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
import { courseFullTitle } from "@/lib/ui/course-title";
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
        <AppPageHeader eyebrow="Mi aprendizaje" title="Todavía no empezaste ningún recorrido" />
        <main className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="tarjeta relative overflow-hidden p-8 md:p-12">
            <LeafIllustration className="absolute -bottom-8 -right-6 w-[140px] opacity-40" />
            <p className="relative max-w-[46ch] text-base text-tinta">
              Cuando te inscribas en un curso, vas a ver acá tu progreso y podés continuar donde quedaste.
            </p>
            <ButtonLink href="/cursos" arrow className="relative mt-6">
              Explorar el catálogo
            </ButtonLink>
          </div>
        </main>
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
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader eyebrow="Mi aprendizaje" title={`Bienvenida de vuelta, ${user?.fullName ?? "alumna"}`}>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/panel/notas" variant="outline" size="sm">
            Mis notas
          </ButtonLink>
          <ButtonLink href="/panel/tarot" variant="outline" size="sm">
            Mis tiradas
          </ButtonLink>
          <ButtonLink href="/cursos" variant="ghost" size="sm" arrow>
            Ver todos los cursos
          </ButtonLink>
        </div>
      </AppPageHeader>

      <main className="mx-auto max-w-[1200px] space-y-14 px-6 py-12">
        {continuing && (
          <section aria-labelledby="continuar" className="rounded-lg bg-papel p-6 shadow-card md:p-8">
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="min-w-0">
                <p className="eyebrow mb-2">Continuar donde quedaste</p>
                <h2 id="continuar" className="text-2xl md:text-3xl">
                  {courseFullTitle(continuing.title, continuing.titleEm)}
                </h2>
                <p className="mt-2 text-sm text-suave">
                  {continuing.discipline}
                  {continuing.lastSeenAt && <> · Vista por última vez {formatRelativeTime(continuing.lastSeenAt)}</>}
                </p>
              </div>
              {/* En el celular el anillo y el botón comparten fila; desde md cada uno es una columna. */}
              <div className="flex items-center gap-5 md:contents">
                <ProgressRing value={continuing.progressPercent} size={88} />
                {continuing.continueLessonId ? (
                  <ButtonLink href={`/leccion/${continuing.continueLessonId}`} arrow className="flex-1 md:flex-none">
                    Continuar
                  </ButtonLink>
                ) : (
                  <ButtonLink href={`/cursos/${continuing.slug}`} variant="outline" className="flex-1 md:flex-none">
                    Ver curso
                  </ButtonLink>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Novedades (T-031): arriba de las pestañas, sin anuncios no se dibuja. */}
        {news.length > 0 && (
          <section aria-label="Novedades de tus cursos">
            <h2 className="mb-5 text-2xl">Novedades de tus cursos</h2>
            <AnnouncementList items={news} showCourse />
          </section>
        )}

        <section aria-labelledby="tu-camino">
          <h2 id="tu-camino" className="mb-5 text-2xl">
            Tu camino
          </h2>

          <LearningTabsNav current={tab} counts={tabs.counts} />

          {tabs.counts[tab] === 0 ? (
            <div className="tarjeta flex flex-col items-start gap-4 p-8">
              <p className="text-base text-tinta">{EMPTY_TAB[tab]}</p>
              <ButtonLink href="/cursos" variant="outline" size="sm">
                Explorar el catálogo
              </ButtonLink>
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
              {visibleCourses.map((c) => (
                <LearningCourseRow key={c.courseId} course={c} certificateCode={certificateByCourse.get(c.courseId)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

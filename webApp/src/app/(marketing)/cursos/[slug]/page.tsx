import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/atoms/Breadcrumb";
import SectionDivider from "@/components/atoms/SectionDivider";
import AnnouncementList from "@/components/announcements/AnnouncementList";
import { getCourseAnnouncements } from "@/lib/server/announcements";
import SignedImage from "@/components/atoms/SignedImage";
import StatBlock from "@/components/atoms/StatBlock";
import CurriculumAccordion from "@/components/course/CurriculumAccordion";
import PromoVideo from "@/components/course/PromoVideo";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import { visibleDescription } from "@/lib/catalog/description";
import { getCourseBySlug } from "@/lib/server/courses";
import EnrollmentCta from "@/components/course/EnrollmentCta";
import { getStudentCourseAccess, getStudentEnrollmentState } from "@/lib/server/enrollment";
import { getWishlistIds } from "@/lib/server/wishlist";
import WishlistButton from "@/components/course/WishlistButton";
import { getCourseReviews } from "@/lib/server/reviews";
import { formatCertificateDate, formatPriceCents, formatTotalDuration } from "@/lib/utils/format";

// `courses.language` es ISO 639-1 (dos letras, CHECK en 0023). El catalogo es en español hoy;
// el mapa existe para que agregar un idioma sea una linea y no un `if`.
const LANGUAGE_LABEL: Record<string, string> = {
  es: "Español",
  pt: "Português",
  en: "English",
};

const FRAME_CORNERS = [
  "top-3 left-3 border-t border-l",
  "top-3 right-3 border-t border-r",
  "bottom-3 left-3 border-b border-l",
  "bottom-3 right-3 border-b border-r",
] as const;


export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Curso no encontrado" };
  // El h1 de la página es `title` + `titleEm` ("Tarot" + "iniciático"). El <title> tiene que
  // decir lo mismo: "Tarot" a secas no distingue este curso de los otros dos de tarot.
  const fullTitle = [course.title, course.titleEm].filter(Boolean).join(" ");
  const description = course.subtitle ?? course.intro ?? undefined;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: `/cursos/${slug}` },
    openGraph: { title: fullTitle, description, url: `/cursos/${slug}`, type: "website" },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const longDescription = visibleDescription(course.intro, course.description);

  const [access, reviews, enrollment, savedIds] = await Promise.all([
    getStudentCourseAccess(course.id),
    getCourseReviews(course.id),
    getStudentEnrollmentState(course.id),
    getWishlistIds(),
  ]);
  // Solo con acceso: la ficha es pública pero los anuncios son de quien cursa (spec). Sin acceso no
  // se consulta, así anon nunca le pega a la tabla.
  const announcements = access.hasAccess ? await getCourseAnnouncements(course.id) : [];

  return (
    <div className="min-h-screen bg-fondo">
      <Breadcrumb crumbs={[
        { label:"Catálogo", href:"/cursos" },
        { label:course.discipline },
        { label:course.title },
      ]} />

      {/* Pergamino header */}
      <header className="border-b border-linea px-6 py-16 md:px-12 text-center">
        {course.coverUrl ? (
          <figure className="relative mx-auto mb-8 aspect-[4/3] w-full max-w-xl overflow-hidden rounded-sm">
            <SignedImage
              src={course.coverUrl}
              alt={`Portada del curso ${[course.title, course.titleEm].filter(Boolean).join(" ")}`}
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {FRAME_CORNERS.map((cls) => (
              <span key={cls} className={`absolute h-5 w-5 ${cls} border-miel`} />
            ))}
          </figure>
        ) : null}
        {/* La fila de glifos queda siempre; sin portada es todo lo que hay arriba del titulo (c.3). */}
        <div className="mb-6 flex items-center justify-center gap-6">
          <svg className="h-12 w-12 stroke-musgo fill-none" viewBox="0 0 60 60" strokeWidth={0.6} aria-hidden>
            <circle cx={30} cy={30} r={22} /><circle cx={30} cy={30} r={14} strokeDasharray="1 2" />
            <path d="M30 8 L30 52 M8 30 L52 30 M14 14 L46 46 M14 46 L46 14" />
          </svg>
          <span className="font-display text-eyebrow tracking-[0.25em] text-suave">— Un curso de —</span>
          <svg className="h-12 w-12 stroke-miel fill-none" viewBox="0 0 60 60" strokeWidth={0.6} aria-hidden>
            <polygon points="30,8 50,42 10,42" /><polygon points="30,52 50,18 10,18" />
            <circle cx={30} cy={30} r={6} />
          </svg>
        </div>

        <p className="mb-3 font-display text-eyebrow tracking-[0.2em] text-miel-800">✦ {course.discipline} · {course.level}</p>
        <h1 className="font-display text-display-md text-tinta mb-3">
          {course.title}
          {course.titleEm && (
            <>
              {" "}
              <em className="font-quote italic text-miel-800">{course.titleEm}</em>
            </>
          )}
        </h1>
        {course.subtitle && (
          <p className="font-quote italic text-xl text-miel-800 mb-6">{course.subtitle}</p>
        )}

        <div className="flex items-center justify-center gap-3.5 mb-8">
          <div className="h-px flex-1 max-w-[160px] bg-salvia" />
          <span className="font-display text-eyebrow tracking-[0.25em] text-suave">☾  ✦  ☉</span>
          <div className="h-px flex-1 max-w-[160px] bg-salvia" />
        </div>

        {course.intro && (
          <p className="mx-auto max-w-xl font-quote italic text-lg text-suave leading-relaxed mb-10">
            {course.intro}
          </p>
        )}

        {/* Meta stats — derivados del currículum real, no del mock (no hay duration_weeks/cohorte: ADR-004) */}
        {course.modules.length > 0 && (
          <div className="flex items-center justify-center gap-6 md:gap-10">
            <StatBlock num={String(course.modules.length)} label="Módulos" size="lg" />
            <span className="text-miel-800 text-xl">·</span>
            <StatBlock num={String(course.lessonCount)} label="Lecciones" size="lg" />
            {course.totalDurationSeconds > 0 && (
              <>
                <span className="text-miel-800 text-xl">·</span>
                <StatBlock num={formatTotalDuration(course.totalDurationSeconds)} label="De video" size="lg" />
              </>
            )}
            {course.studentCount > 0 && (
              <>
                <span className="text-miel-800 text-xl">·</span>
                <StatBlock num={String(course.studentCount)} label={course.studentCount === 1 ? "Inscripta" : "Inscriptas"} size="lg" />
              </>
            )}
          </div>
        )}

        {/* ADR-004: `updated_at` es una fecha PASADA. Redactado sin ambiguedad para que no se
            confunda con una fecha de inicio, que este producto no tiene. */}
        <p className="mt-8 font-display text-eyebrow tracking-wide text-suave">
          <span aria-hidden="true">☾ </span>
          Última actualización: {formatCertificateDate(course.updatedAt)}
          <span className="text-miel-800"> · </span>
          Idioma: {LANGUAGE_LABEL[course.language] ?? course.language}
        </p>
      </header>

      {/* Maestra strip */}
      <section className="border-b border-linea bg-papel px-6 py-10 md:px-12">
        <div className="mx-auto max-w-4xl flex items-center gap-8 md:gap-12">
          {/* Photo placeholder */}
          <div className="relative flex-none h-24 w-24 md:h-32 md:w-32 rounded-sm overflow-hidden bg-salvia-100">
            {FRAME_CORNERS.map((cls) => (
              <span key={cls} className={`absolute h-4 w-4 ${cls} border-miel`} />
            ))}
          </div>
          <div>
            <p className="mb-1 font-display text-eyebrow tracking-[0.2em] text-suave uppercase">Quien transmite</p>
            <h3 className="mb-1 font-display text-xl tracking-wider text-bosque">
              {course.teacherSlug ? (
                <Link href={`/guias/${course.teacherSlug}`} className="transition-colors hover:text-miel-800">
                  {course.teacherName}
                </Link>
              ) : (
                course.teacherName
              )}
            </h3>
            {course.teacherBio && (
              <p className="font-quote italic text-base text-suave">&ldquo;{course.teacherBio}&rdquo;</p>
            )}
          </div>
        </div>
      </section>

      {/* Curriculum — acordeón de módulos/lecciones, T-004 */}
      {course.modules.length > 0 && (
        <section className="px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="El viaje" className="mb-6" />
            <p className="mb-10 text-center font-display text-eyebrow tracking-wide text-suave">
              {String(course.modules.length)} {course.modules.length === 1 ? "sección" : "secciones"}
              <span className="text-miel-800"> · </span>
              {String(course.lessonCount)} {course.lessonCount === 1 ? "clase" : "clases"}
              <span className="text-miel-800"> · </span>
              {formatTotalDuration(course.totalDurationSeconds)}
            </p>
            <CurriculumAccordion
              modules={course.modules}
              hasAccess={access.hasAccess}
              completedLessonIds={[...access.completedLessonIds]}
            />
          </div>
        </section>
      )}


      {/* Anuncios (T-031): bajo el currículum, solo para quien cursa y solo si hay alguno (c.8). */}
      {announcements.length > 0 && (
        <section aria-label="Anuncios" className="border-t border-linea px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Anuncios" className="mb-10" />
            <AnnouncementList items={announcements} />
          </div>
        </section>
      )}

      {/* Material de venta: se ve sin inscripcion; mismo embed que el player, sin progreso (c.2). */}
      {course.promoVideoId && (
        <section className="border-t border-linea px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Un adelanto" className="mb-10" />
            <PromoVideo videoId={course.promoVideoId} title={`Adelanto de ${course.title}`} />
          </div>
        </section>
      )}

      {/* Lo que vas a aprender — no confundir con `includes` ("Qué recibes"), que es el material
          entregado. Son campos distintos: uno es el resultado, el otro el paquete. */}
      {course.learningObjectives.length > 0 && (
        <section className="border-t border-linea px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Lo que vas a aprender" className="mb-10" />
            <div className="grid gap-3 sm:grid-cols-2">
              {course.learningObjectives.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 flex-none text-miel-800 text-sm">◐</span>
                  <span className="font-body text-sm text-suave">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Requisitos */}
      {course.prerequisites.length > 0 && (
        <section className="border-t border-linea px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Antes de empezar" className="mb-10" />
            <ul className="space-y-3">
              {course.prerequisites.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 flex-none text-suave text-sm">○</span>
                  <span className="font-body text-sm text-suave">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Descripcion larga — `intro` queda como el parrafo de portada, arriba. Mismo split en
          parrafos que usan diario/[slug] y guias/[slug]: no hay un tercer metodo. */}
      {longDescription && (
        <section className="border-t border-linea px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Sobre este curso" className="mb-10" />
            <div className="space-y-5">
              {longDescription.split(/\n{2,}/).filter(Boolean).map((par, i) => (
                <p key={i} className="font-body text-base text-suave leading-relaxed">{par}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Resenas — T-028. Lo que dicen quienes lo hicieron va DESPUES del curriculum y ANTES del
          CTA: es la ultima señal antes de decidir. */}
      <ReviewsSection data={reviews} courseId={course.id} slug={slug} />

      {/* Includes */}
      {course.includes.length > 0 && (
        <section className="border-t border-linea bg-papel px-6 py-16 md:px-12">
          <div className="mx-auto max-w-3xl">
            <SectionDivider label="Qué recibes" className="mb-10" />
            <div className="grid gap-3 sm:grid-cols-2">
              {course.includes.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-none text-miel-800 text-sm">✦</span>
                  <span className="font-body text-sm text-suave">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pact CTA */}
      <section className="relative overflow-hidden border-t border-linea px-6 py-24 md:px-12 text-center bg-salvia-100">
        <svg className="absolute left-1/2 top-8 h-16 w-16 -translate-x-1/2 fill-none stroke-miel" viewBox="0 0 80 80" strokeWidth={0.8} aria-hidden>
          <circle cx={40} cy={40} r={35} /><polygon points="40,12 65,55 15,55" />
          <circle cx={40} cy={40} r={8} fill="currentColor" opacity="0.3" />
        </svg>
        <p className="mb-3 mt-10 font-display text-eyebrow tracking-[0.25em] text-suave">— El Umbral —</p>
        <h2 className="mb-4 font-display text-4xl tracking-wide text-tinta">
          El umbral está <em className="font-quote italic text-miel-800">abierto</em>
        </h2>
        <p className="mb-8 font-quote italic text-lg text-suave">Pedí tu lugar · la escuela confirma tu inscripción y te avisa por mail</p>

        <div className="mx-auto max-w-xs tarjeta p-6 mb-8 text-left">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-body text-sm text-suave">Ofrenda</span>
            <span className="font-display text-2xl text-miel-800">{formatPriceCents(course.priceCents, course.currency)}</span>
          </div>
          {/* "Hablar con una guía antes" se quitó (T-043): no hay canal definido y un mailto
              expondría el mail de la docente, que nunca es público. La ficha ya linkea a /guias. */}
          <EnrollmentCta slug={course.slug} state={enrollment} />
          {enrollment.status !== "active" && (
            <div className="mt-4 flex items-center justify-center gap-3 border-t border-linea pt-4">
              <WishlistButton
                courseId={course.id}
                saved={savedIds?.has(course.id) ?? false}
                loginHref={savedIds ? null : `/entrar?next=${encodeURIComponent(`/cursos/${course.slug}`)}`}
              />
              <span className="font-body text-sm text-suave">Guardar para después</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon, { type IconName } from "@/components/atoms/Icon";
import Monogram from "@/components/atoms/Monogram";
import Rating from "@/components/atoms/Rating";
import SectionHeading from "@/components/atoms/SectionHeading";
import SignedImage from "@/components/atoms/SignedImage";
import AnnouncementList from "@/components/announcements/AnnouncementList";
import CurriculumAccordion from "@/components/course/CurriculumAccordion";
import EnrollmentCta from "@/components/course/EnrollmentCta";
import PromoVideo from "@/components/course/PromoVideo";
import WishlistButton from "@/components/course/WishlistButton";
import FaqList from "@/components/molecules/FaqList";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import { COURSE_FAQ } from "@/content/landing";
import { placeholderForDiscipline, unsplashUrl } from "@/content/placeholder-photos";
import { visibleDescription } from "@/lib/catalog/description";
import { firstPreviewLesson } from "@/lib/catalog/free-class";
import { getCourseAnnouncements } from "@/lib/server/announcements";
import { getCourseBySlug } from "@/lib/server/courses";
import { getStudentCourseAccess, getStudentEnrollmentState } from "@/lib/server/enrollment";
import { getCourseReviews } from "@/lib/server/reviews";
import { getWishlistIds } from "@/lib/server/wishlist";
import { formatCertificateDate, formatPriceCents, formatTotalDuration } from "@/lib/utils/format";

// `courses.language` es ISO 639-1 (dos letras, CHECK en 0023). El catalogo es en español hoy;
// el mapa existe para que agregar un idioma sea una linea y no un `if`.
const LANGUAGE_LABEL: Record<string, string> = {
  es: "Español",
  pt: "Português",
  en: "English",
};


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

  const fullTitle = [course.title, course.titleEm].filter(Boolean).join(" ");
  const preview = firstPreviewLesson(course.modules);
  const placeholder = placeholderForDiscipline(course.discipline);
  const incluye: { icon: IconName; text: string }[] = [
    ...(course.lessonCount > 0
      ? [{
          icon: "play-circle" as const,
          text: `${course.lessonCount} ${course.lessonCount === 1 ? "clase" : "clases"} en video${course.totalDurationSeconds > 0 ? `, ${formatTotalDuration(course.totalDurationSeconds)}` : ""}`,
        }]
      : []),
    ...course.includes.map((text) => ({ icon: "file" as const, text })),
    { icon: "chat", text: "Preguntas a la guía dentro de cada clase" },
    { icon: "notes", text: "Tus notas personales en cada clase" },
    { icon: "award", text: "Certificado de finalización verificable" },
  ];

  return (
    <div className="min-h-screen bg-fondo">
      <div className="mx-auto max-w-[1200px] px-6 pt-8">
        <Link href="/cursos" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Todos los cursos
        </Link>
      </div>

      <header className="mx-auto max-w-[1200px] px-6 pb-10 pt-6 md:pb-14">
        <p className="text-sm font-semibold text-miel-800">
          {course.discipline} <span className="text-suave">· {course.level}</span>
        </p>
        <h1 className="mt-3 max-w-[22ch] text-display-lg leading-[1.08] tracking-[-0.025em] [overflow-wrap:anywhere]">
          {fullTitle}
        </h1>
        {course.subtitle && <p className="mt-4 max-w-[48ch] text-xl leading-snug text-tinta">{course.subtitle}</p>}
        {course.intro && <p className="mt-4 max-w-[60ch] text-suave">{course.intro}</p>}
        {/* ADR-004: `updated_at` es una fecha PASADA, redactada para que no se lea como inicio. */}
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-suave">
          <span>
            Con{" "}
            {course.teacherSlug ? (
              <Link href={`/guias/${course.teacherSlug}`} className="font-semibold text-miel-800 hover:underline">
                {course.teacherName}
              </Link>
            ) : (
              <b className="font-semibold text-bosque">{course.teacherName}</b>
            )}
          </span>
          <span>Última actualización: {formatCertificateDate(course.updatedAt)}</span>
          <span>Idioma: {LANGUAGE_LABEL[course.language] ?? course.language}</span>
        </p>
      </header>

      <div className="mx-auto grid max-w-[1200px] items-start gap-12 px-6 pb-24 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] lg:gap-14">
        {/* Primero en el DOM: en móvil el precio y el pedido quedan arriba del programa. */}
        <aside
          aria-label="Resumen del curso"
          className="overflow-hidden rounded-lg bg-papel shadow-card lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1"
        >
          <div className="relative aspect-[16/10] bg-salvia">
            {course.coverUrl ? (
              <SignedImage
                src={course.coverUrl}
                alt={`Portada del curso ${fullTitle}`}
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={unsplashUrl(placeholder.id)}
                alt={placeholder.alt}
                fill
                preload
                sizes="(min-width: 1024px) 460px, 100vw"
                className="object-cover"
              />
            )}
          </div>
          <div className="p-6">
            <h2 className="text-xl">Pedir la inscripción</h2>
            <Rating average={reviews.summary.average} count={reviews.summary.total} className="mt-1.5" />
            <p className="mb-1 mt-4 text-[30px] font-extrabold leading-none tracking-[-0.02em] text-bosque">
              {formatPriceCents(course.priceCents, course.currency)}
            </p>
            <p className="mb-5 mt-3 text-sm leading-normal text-suave">
              Pedís la inscripción, la escuela la revisa y te avisa por mail cuando el curso está habilitado en tu panel.
            </p>
            {/* "Hablar con una guía antes" se quitó (T-043): no hay canal y un mailto expondría el mail de la docente. */}
            <EnrollmentCta slug={course.slug} state={enrollment} />
            {enrollment.status !== "active" && (
              <div className="mt-4 flex items-center gap-3">
                <WishlistButton
                  courseId={course.id}
                  saved={savedIds?.has(course.id) ?? false}
                  loginHref={savedIds ? null : `/entrar?next=${encodeURIComponent(`/cursos/${course.slug}`)}`}
                />
                <span className="text-sm text-suave">Guardar para después</span>
              </div>
            )}
            {preview && (
              <p className="mt-5 rounded-md bg-miel-100 px-4 py-3 text-sm leading-normal text-bosque">
                La clase «{preview.title}» se puede ver gratis, sin inscribirte.
              </p>
            )}
            <ul className="mt-5 grid gap-2.5 border-t border-linea pt-5 text-[15px] leading-snug">
              {incluye.map((it) => (
                <li key={it.text} className="grid grid-cols-[22px_1fr] gap-2.5">
                  <Icon name={it.icon} className="mt-0.5 h-[18px] w-[18px] text-musgo" />
                  {it.text}
                </li>
              ))}
              {course.studentCount > 0 && (
                <li className="grid grid-cols-[22px_1fr] gap-2.5 text-suave">
                  <Icon name="leaf" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
                  {course.studentCount} {course.studentCount === 1 ? "inscripta" : "inscriptas"}
                </li>
              )}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-16 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="programa-titulo">
            <SectionHeading
              id="programa-titulo"
              title="Así es un curso por dentro"
              lead={
                course.modules.length > 0
                  ? `El programa completo: ${course.modules.length} ${course.modules.length === 1 ? "módulo" : "módulos"} y ${course.lessonCount} ${course.lessonCount === 1 ? "clase" : "clases"}${course.totalDurationSeconds > 0 ? `, ${formatTotalDuration(course.totalDurationSeconds)} de video` : ""}.${preview ? " La marcada «Gratis» se puede ver sin inscribirte." : ""}`
                  : undefined
              }
              className="mb-8"
            />
            {course.modules.length > 0 ? (
              <CurriculumAccordion
                modules={course.modules}
                hasAccess={access.hasAccess}
                completedLessonIds={[...access.completedLessonIds]}
              />
            ) : (
              <p className="text-suave">El programa de este curso se está preparando.</p>
            )}
          </section>

          {/* Anuncios (T-031): sólo para quien cursa y sólo si hay alguno (c.8). */}
          {announcements.length > 0 && (
            <section aria-label="Anuncios">
              <SectionHeading size="md" title="Anuncios" className="mb-6" />
              <AnnouncementList items={announcements} />
            </section>
          )}

          {/* Material de venta: se ve sin inscripción; mismo embed que el player, sin progreso (c.2). */}
          {course.promoVideoId && (
            <section aria-labelledby="adelanto-titulo">
              <SectionHeading id="adelanto-titulo" size="md" title="Un adelanto" className="mb-6" />
              <PromoVideo videoId={course.promoVideoId} title={`Adelanto de ${course.title}`} />
            </section>
          )}

          {/* `learningObjectives` es el resultado; `includes` (panel lateral) es el material entregado. */}
          {course.learningObjectives.length > 0 && (
            <section aria-labelledby="aprender-titulo">
              <SectionHeading id="aprender-titulo" size="md" title="Lo que vas a aprender" className="mb-6" />
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.learningObjectives.map((item) => (
                  <li key={item} className="grid grid-cols-[22px_1fr] gap-2.5 text-[15px] leading-snug">
                    <Icon name="check" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.prerequisites.length > 0 && (
            <section aria-labelledby="antes-titulo">
              <SectionHeading id="antes-titulo" size="md" title="Antes de empezar" className="mb-6" />
              <ul className="space-y-2.5">
                {course.prerequisites.map((item) => (
                  <li key={item} className="grid grid-cols-[22px_1fr] gap-2.5 text-[15px] leading-snug">
                    <Icon name="circle" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Mismo split en párrafos que diario/[slug] y guias/[slug]. */}
          {longDescription && (
            <section aria-labelledby="sobre-titulo">
              <SectionHeading id="sobre-titulo" size="md" title="Sobre este curso" className="mb-6" />
              <div className="max-w-[64ch] space-y-4">
                {longDescription.split(/\n{2,}/).filter(Boolean).map((par, i) => (
                  <p key={i} className="text-tinta">{par}</p>
                ))}
              </div>
            </section>
          )}

          {/* T-028 · después del programa: la última señal antes de decidir. */}
          <ReviewsSection data={reviews} courseId={course.id} slug={slug} />

          <section aria-labelledby="guia-titulo" className="rounded-lg bg-salvia-100 p-6 md:p-8">
            <h2 id="guia-titulo" className="sr-only">Quién enseña</h2>
            <div className="grid items-start gap-5 sm:grid-cols-[72px_1fr]">
              {/* CourseDetail no trae avatar firmado (D-62): iniciales, nunca un retrato de stock. */}
              <Monogram name={course.teacherName} className="h-[88px] w-[72px] rounded-md bg-papel" />
              <div className="min-w-0">
                <p className="text-sm text-suave">Enseña</p>
                <p className="text-xl font-semibold text-bosque">{course.teacherName}</p>
                {course.teacherBio && <p className="mt-2 text-[15px] leading-relaxed text-tinta">{course.teacherBio}</p>}
                {course.teacherSlug && (
                  <Link
                    href={`/guias/${course.teacherSlug}`}
                    className="mt-3 inline-block border-b-[1.5px] border-current py-1 text-sm font-semibold text-miel-800"
                  >
                    Ver su perfil
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="faq-titulo">
            <SectionHeading id="faq-titulo" size="md" title="Preguntas frecuentes" className="mb-2" />
            <FaqList items={COURSE_FAQ} />
          </section>
        </div>
      </div>
    </div>
  );
}

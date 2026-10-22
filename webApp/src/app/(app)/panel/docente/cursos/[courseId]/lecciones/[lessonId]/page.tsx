import { notFound } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import { requireTeacher, getTeacherLessonDetail } from "@/lib/server/teacher";
import LessonFieldsForm from "@/components/teacher/LessonFieldsForm";
import VideoAttachForm from "@/components/teacher/VideoAttachForm";
import PublishLessonControl from "@/components/teacher/PublishLessonControl";
import ChaptersSection from "@/components/teacher/ChaptersSection";
import ResourcesSection from "@/components/teacher/ResourcesSection";

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>;
}

// Criterio 6: `getTeacherLessonDetail` verifica titularidad del curso con `assertOwnsCourse`
// (cliente de sesión) antes de tocar nada — `null`/excepción se traduce acá a `notFound()`,
// misma respuesta para "no existe" y "no es tuya".
export default async function TeacherLessonEditorPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const teacher = await requireTeacher();

  let detail;
  try {
    detail = await getTeacherLessonDetail(lessonId, courseId, teacher.id);
  } catch {
    notFound();
  }
  if (!detail) notFound();

  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">
            — {detail.courseTitle} —
          </p>
          <h1 className="font-display text-display-md text-tinta">{detail.lesson.title}</h1>
        </header>

        <div className="mx-auto max-w-3xl space-y-8 px-6 py-10 md:px-12">
          <PublishLessonControl
            courseId={courseId}
            lessonId={lessonId}
            isPublished={detail.lesson.isPublished}
          />

          <LessonFieldsForm lesson={detail.lesson} />

          <VideoAttachForm
            courseId={courseId}
            lessonId={lessonId}
            durationSeconds={detail.lesson.durationSeconds}
            preview={detail.preview}
          />

          <ChaptersSection courseId={courseId} lessonId={lessonId} chapters={detail.chapters} />

          <ResourcesSection courseId={courseId} lessonId={lessonId} resources={detail.resources} />
        </div>
      </div>
    </div>
  );
}

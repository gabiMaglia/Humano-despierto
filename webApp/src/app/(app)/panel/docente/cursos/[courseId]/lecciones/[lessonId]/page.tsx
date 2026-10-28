import { notFound } from "next/navigation";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
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
    <PanelFrame
      title={detail.lesson.title}
      context={detail.courseTitle}
      back={{ href: `/panel/docente/cursos/${courseId}`, label: "Volver al curso" }}
      width="narrow"
    >
      <div className="space-y-8">
        <PublishLessonControl courseId={courseId} lessonId={lessonId} isPublished={detail.lesson.isPublished} />

        <PanelSection id="datos-leccion-titulo" title="Datos de la lección">
          <LessonFieldsForm lesson={detail.lesson} />
        </PanelSection>

        <VideoAttachForm courseId={courseId} lessonId={lessonId} durationSeconds={detail.lesson.durationSeconds} preview={detail.preview} />

        <ChaptersSection courseId={courseId} lessonId={lessonId} chapters={detail.chapters} />

        <ResourcesSection courseId={courseId} lessonId={lessonId} resources={detail.resources} />
      </div>
    </PanelFrame>
  );
}

import PanelFrame from "@/components/panel/PanelFrame";
import CourseForm from "@/components/teacher/CourseForm";

export default function NewTeacherCoursePage() {
  return (
    <PanelFrame title="Crear curso" context="Un curso nuevo nace en borrador." back={{ href: "/panel/docente", label: "Tus cursos" }}>
      <CourseForm />
    </PanelFrame>
  );
}

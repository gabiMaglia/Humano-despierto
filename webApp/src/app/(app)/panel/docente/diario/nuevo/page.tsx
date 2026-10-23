import PanelFrame from "@/components/panel/PanelFrame";
import PostForm from "@/components/teacher/PostForm";

export default function NewTeacherPostPage() {
  return (
    <PanelFrame title="Escribir post" context="Un post nuevo nace en borrador." back={{ href: "/panel/docente/diario", label: "Tu diario" }}>
      <PostForm />
    </PanelFrame>
  );
}

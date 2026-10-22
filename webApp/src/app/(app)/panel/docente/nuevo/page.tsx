import SiteHeader from "@/components/layout/SiteHeader";
import CourseForm from "@/components/teacher/CourseForm";

export default function NewTeacherCoursePage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <div className="pt-16">
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">
            — Un curso nuevo nace en borrador —
          </p>
          <h1 className="font-display text-display-md text-tinta">
            Crear <em className="font-quote italic text-miel-800">curso</em>
          </h1>
        </header>

        <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
          <CourseForm />
        </div>
      </div>
    </div>
  );
}

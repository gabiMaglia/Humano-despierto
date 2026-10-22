import Nav from "@/components/layout/Nav";
import PostForm from "@/components/teacher/PostForm";

export default function NewTeacherPostPage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-linea bg-papel px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-suave">
            — Un post nuevo nace en borrador —
          </p>
          <h1 className="font-display text-display-md text-tinta">
            Escribir <em className="font-quote italic text-miel-800">post</em>
          </h1>
        </header>

        <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
          <PostForm />
        </div>
      </div>
    </div>
  );
}

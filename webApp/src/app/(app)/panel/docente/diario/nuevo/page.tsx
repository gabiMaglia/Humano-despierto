import Nav from "@/components/layout/Nav";
import PostForm from "@/components/teacher/PostForm";

export default function NewTeacherPostPage() {
  return (
    <div className="min-h-screen bg-cosmos-0 text-ink">
      <Nav />
      <div className="pt-16">
        <header className="border-b border-lila-300/18 bg-cosmos-surface px-6 py-8 md:px-12">
          <p className="mb-2 font-display text-eyebrow tracking-[0.25em] text-ink-faint">
            — Un post nuevo nace en borrador —
          </p>
          <h1 className="font-display text-display-md text-ink">
            Escribir <em className="font-quote italic text-lila-300">post</em>
          </h1>
        </header>

        <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
          <PostForm />
        </div>
      </div>
    </div>
  );
}

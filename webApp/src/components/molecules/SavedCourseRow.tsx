import Link from "next/link";
import WishlistButton from "@/components/course/WishlistButton";
import type { SavedCourseItem } from "@/lib/learning/tabs";

/** Un guardado. Si ya cursa el curso lo dice y lleva a continuar, en vez de ofrecer guardarlo. */
export default function SavedCourseRow({ item }: { item: SavedCourseItem }) {
  const continueHref = item.enrolled?.continueLessonId
    ? `/leccion/${item.enrolled.continueLessonId}`
    : `/cursos/${item.slug}`;
  return (
    <li className="cosmos-card flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <Link
          href={`/cursos/${item.slug}`}
          className="font-display text-sm tracking-wide text-ink transition-colors hover:text-lila-300"
        >
          {item.title}
        </Link>
        {item.enrolled && (
          <p className="font-body text-xs text-ink-faint">
            Ya estás inscripta ·{" "}
            <Link href={continueHref} className="text-lila-300 hover:text-gold-400">
              Continuar ↦
            </Link>
          </p>
        )}
      </div>
      <WishlistButton courseId={item.courseId} saved loginHref={null} />
    </li>
  );
}

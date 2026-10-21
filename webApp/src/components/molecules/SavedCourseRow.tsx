import Link from "next/link";
import WishlistButton from "@/components/course/WishlistButton";
import type { SavedCourse } from "@/lib/learning/tabs";

/** Un guardado aún sin inscripción. */
export default function SavedCourseRow({ item }: { item: SavedCourse }) {
  return (
    <li className="cosmos-card flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <Link
          href={`/cursos/${item.slug}`}
          className="font-display text-sm tracking-wide text-ink transition-colors hover:text-lila-300"
        >
          {item.title}
        </Link>
      </div>
      <WishlistButton courseId={item.courseId} saved loginHref={null} />
    </li>
  );
}

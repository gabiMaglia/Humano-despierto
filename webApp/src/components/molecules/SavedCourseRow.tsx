import Link from "next/link";
import WishlistButton from "@/components/course/WishlistButton";
import type { SavedCourse } from "@/lib/learning/tabs";

/** Un guardado aún sin inscripción. */
export default function SavedCourseRow({ item }: { item: SavedCourse }) {
  return (
    <li className="tarjeta flex items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <Link href={`/cursos/${item.slug}`} className="text-lg font-semibold text-bosque underline-offset-4 hover:underline">
          {item.title}
        </Link>
      </div>
      <WishlistButton courseId={item.courseId} saved loginHref={null} className="h-10 w-10" />
    </li>
  );
}

import { notFound } from "next/navigation";
import { getLessonPlayerData } from "@/lib/server/lesson-player";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Decide el 404 ANTES de que empiece el streaming — mismo patrón y misma causa que
 * `(app)/circulo/[curso]/layout.tsx`.
 *
 * `loading.tsx` envuelve a `page.tsx` en un Suspense, y una respuesta que ya empezó a streamear
 * salió con `200` en los headers: para cuando corre el `notFound()` de la página, el status ya
 * no se puede cambiar. Una lección inexistente devolvía `200`, mientras `/cursos/no-existe` y
 * `/guias/no-existe` devuelven `404` — esas rutas no tienen `loading.tsx`.
 *
 * Esto era la deuda que el engram arrastraba como "notFound() da 200 en dev" sin causa
 * identificada. No era del modo dev: era el Suspense.
 *
 * El orden de anidado es layout → Suspense(loading) → page, así que la verificación de acá pasa
 * por afuera del boundary. `getLessonPlayerData` está envuelta en `cache()`, así que la página
 * la vuelve a pedir sin una segunda resolución.
 *
 * Se mantiene la no-distinción de T-006 c.2/c.3: "no existe" y "no tenés acceso" devuelven lo
 * mismo. El 404 no confirma la existencia de una lección a quien no puede verla.
 */
export default async function LeccionLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  if (!(await getLessonPlayerData(id))) notFound();

  return <>{children}</>;
}

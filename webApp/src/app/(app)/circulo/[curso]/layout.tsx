import { notFound } from "next/navigation";
import { getCampusThread } from "@/lib/server/campus";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ curso: string }>;
}

/**
 * Este layout existe por una sola razón: decidir el 404 ANTES de que empiece el streaming.
 *
 * `loading.tsx` envuelve a `page.tsx` en un Suspense, y una respuesta que ya empezó a streamear
 * salió con `200` en los headers — para cuando el `notFound()` de la página corre, el status ya
 * no se puede cambiar. El resultado era que `/circulo/curso-inexistente` devolvía `200` y se
 * quedaba colgado en el esqueleto "Abriendo el hilo…", mientras `/cursos/no-existe` y
 * `/guias/no-existe` devuelven `404` — esas rutas no tienen `loading.tsx`.
 *
 * El orden de anidado en App Router es layout → Suspense(loading) → page, así que la
 * verificación acá pasa por afuera del boundary del propio segmento. `getCampusThread` está
 * envuelta en `cache()`, así que la página la vuelve a pedir sin una segunda consulta.
 *
 * Eso solo no alcanzaba: `(app)/circulo/loading.tsx` — el segmento PADRE — suspendía antes de
 * que este layout llegara a correr, así que el status ya estaba mandado igual. Con el layout
 * puesto la página dejaba de colgarse y mostraba el not-found, pero seguía respondiendo 200.
 * Por eso ese `loading.tsx` de afuera se borró: era un `<p>Abriendo el Campus…</p>` sobre un
 * layout que solo lista los hilos de la usuaria. El de este segmento se queda, que es el que
 * cubre lo caro (los mensajes más la RPC de autoras).
 *
 * El mismo defecto vive en `/leccion/[id]` y es ANTERIOR a este ticket — la deuda del engram
 * decía "notFound() da 200 en dev" sin causa identificada. La causa es ésta, y el arreglo es
 * este mismo patrón; queda fuera del alcance de T-021.
 */
export default async function CampusCourseLayout({ children, params }: LayoutProps) {
  const { curso } = await params;
  if (!(await getCampusThread(curso))) notFound();

  return <>{children}</>;
}

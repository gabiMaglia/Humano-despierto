import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/server/site-url";

/** Las rutas privadas ya exigen sesión, pero un crawler igual las pide: sin esta exclusión
 * terminan como soft-404 o como "página sin contenido" en el índice. Es también lo que vuelve
 * aceptable el 200 de `notFound()` en `/panel/docente/cursos/[courseId]`: ese 200 solo miente
 * si Googlebot llega a verlo. */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel/", "/leccion/", "/circulo/"],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}

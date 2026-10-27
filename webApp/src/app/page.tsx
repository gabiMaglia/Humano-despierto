import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Hero, { type HeroQuote } from "@/components/landing/Hero";
import Manifiesto from "@/components/landing/Manifiesto";
import FeaturedCourses from "@/components/landing/FeaturedCourses";
import Cifras from "@/components/landing/Cifras";
import GuiasSection from "@/components/landing/GuiasSection";
import Testimonios from "@/components/landing/Testimonios";
import Empezar from "@/components/landing/Empezar";
import LunarCalendar from "@/components/landing/LunarCalendar";
import { lunarDays } from "@/lib/lunar";
import { LANDING } from "@/content/landing";
import { freeClassClaim } from "@/lib/catalog/free-class";
import { getLandingData } from "@/lib/server/landing";
import { getPublishedCourses, signCatalogCovers } from "@/lib/server/courses";
import { getFeaturedTeacher, getPublicTeachers, signTeacherAvatars } from "@/lib/server/guias";

export default async function LandingPage() {
  const [{ stats, disciplines, testimonials }, courses, guias, maestra] = await Promise.all([
    getLandingData(),
    getPublishedCourses(),
    getPublicTeachers(),
    getFeaturedTeacher(),
  ]);

  // Destacados primero; si la escuela marcó menos de tres, se completa con el resto del catálogo.
  const featured = [...courses.filter((c) => c.featured), ...courses.filter((c) => !c.featured)].slice(0, 3);
  const guiasVisibles = guias.slice(0, 3);
  const [covers, avatars] = await Promise.all([
    signCatalogCovers(featured),
    signTeacherAvatars(maestra ? [...guiasVisibles, maestra] : guiasVisibles),
  ]);

  const quote: HeroQuote = maestra?.quote
    ? { text: maestra.quote, guide: {
          name: maestra.fullName,
          role: maestra.headline,
          slug: maestra.slug,
          avatarUrl: maestra.avatarPath ? (avatars.get(maestra.avatarPath) ?? null) : null,
        },
      }
    : { text: LANDING.hero.fallbackQuote, guide: null };

  const claim = freeClassClaim({ total: courses.length, withPreview: courses.filter((c) => c.hasPreview).length });

  return (
    <div className="min-h-screen overflow-x-clip bg-fondo text-tinta">
      <SiteHeader overHero />
      <main id="contenido">
        <Hero quote={quote} />
        <Manifiesto />
        <FeaturedCourses courses={featured} covers={covers} total={courses.length} disciplines={disciplines} />
        <Cifras stats={stats} disciplines={disciplines} />
        <LunarCalendar days={lunarDays(new Date())} />
        <GuiasSection guias={guiasVisibles} total={guias.length} avatars={avatars} />
        <Testimonios items={testimonials} />
        <Empezar claim={claim} />
      </main>
      <SiteFooter />
    </div>
  );
}

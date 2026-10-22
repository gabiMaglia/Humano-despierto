import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import HeroSection from "@/components/landing/HeroSection";
import DisciplinesBar from "@/components/landing/DisciplinesBar";
import FeaturedCourses from "@/components/landing/FeaturedCourses";
import MaestraFeature from "@/components/landing/MaestraFeature";
import LunarCalendar from "@/components/landing/LunarCalendar";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ClosingCTA from "@/components/landing/ClosingCTA";
import { getLandingData } from "@/lib/server/landing";
import { lunarDays } from "@/lib/lunar";

export default async function LandingPage() {
  const { stats, disciplines, testimonials } = await getLandingData();
  const days = lunarDays(new Date());

  return (
    <div className="min-h-screen overflow-x-hidden bg-fondo text-tinta">
      <SiteHeader />
      <main>
        <HeroSection stats={stats} />
        <DisciplinesBar disciplines={disciplines} />
        <FeaturedCourses />
        <MaestraFeature />
        <LunarCalendar days={days} />
        <TestimonialsSection testimonials={testimonials} />
        <ClosingCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

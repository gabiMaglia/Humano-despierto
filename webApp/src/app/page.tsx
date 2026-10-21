import Starfield from "@/components/cosmos/Starfield";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
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
    <div className="min-h-screen overflow-x-hidden bg-cosmos-0 text-ink">
      <Starfield />
      <Nav />
      <main>
        <HeroSection stats={stats} />
        <DisciplinesBar disciplines={disciplines} />
        <FeaturedCourses />
        <MaestraFeature />
        <LunarCalendar days={days} />
        <TestimonialsSection testimonials={testimonials} />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}

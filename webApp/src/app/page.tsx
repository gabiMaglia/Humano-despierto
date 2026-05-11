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

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-cosmos-0 text-ink">
      <Starfield />
      <Nav />
      <main>
        <HeroSection />
        <DisciplinesBar />
        <FeaturedCourses />
        <MaestraFeature />
        <LunarCalendar />
        <TestimonialsSection />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import InstitutionsSection from "@/components/InstitutionsSection";
import VerificationSection from "@/components/VerificationSection";
import FeaturesSection from "@/components/FeaturesSection";
import DatingSection from "@/components/DatingSection";
import CampusToolsSection from "@/components/CampusToolsSection";
import PricingSection from "@/components/PricingSection";
import TechSection from "@/components/TechSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main>
        <HeroSection />
        <InstitutionsSection />
        <VerificationSection />
        <FeaturesSection />
        <DatingSection />
        <CampusToolsSection />
        <PricingSection />
        <TechSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import HighlightsSection from "@/components/HighlightsSection";
import MethodologySection from "@/components/MethodologySection";
import DualAudienceSection from "@/components/DualAudienceSection";
import ComparisonSection from "@/components/ComparisonSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProfessionalSection from "@/components/ProfessionalSection";
import FaqSection from "@/components/FaqSection";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";
import InstallAppSection from "@/components/InstallAppSection";
import StickyCTA from "@/components/StickyCTA";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import { setSeo, setLandingJsonLd, setOrganizationJsonLd, setMedicalBusinessJsonLd } from "@/lib/seo";

const Index = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("alivia_referral_code", ref);
    }
  }, [searchParams]);

  useEffect(() => {
    setSeo({
      title: "Aliv.iA Webapp",
      description: "Avaliação musculoesquelética com inteligência artificial. Diagnóstico preliminar e plano de tratamento personalizado em minutos.",
      url: "https://aliviawebapp.com.br",
      type: "website",
    });
    setLandingJsonLd();
    setOrganizationJsonLd();
    setMedicalBusinessJsonLd();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <DualAudienceSection />
        <HighlightsSection />
        <ComparisonSection />
        <MethodologySection />
        <HowItWorksSection />
        <ProfessionalSection />
        <TestimonialsSection />
        <FaqSection />
        <SocialSection />
      </main>
      <InstallAppSection />
      <Footer />
      <StickyCTA />
      <ExitIntentPopup />
    </div>
  );
};

export default Index;

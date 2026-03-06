import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import HighlightsSection from "@/components/HighlightsSection";
import MethodologySection from "@/components/MethodologySection";
import ComparisonSection from "@/components/ComparisonSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProfessionalSection from "@/components/ProfessionalSection";
import FaqSection from "@/components/FaqSection";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";
import StickyCTA from "@/components/StickyCTA";
import { setSeo, setLandingJsonLd } from "@/lib/seo";

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
      title: "Aliv.iA – Avaliação Musculoesquelética Inteligente",
      description: "Avaliação musculoesquelética com inteligência artificial. Diagnóstico preliminar e plano de tratamento personalizado em minutos.",
      url: "https://alivia.app",
      type: "website",
    });
    setLandingJsonLd();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <HighlightsSection />
        <MethodologySection />
        <ComparisonSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <ProfessionalSection />
        <FaqSection />
        <SocialSection />
      </main>
      <Footer />
      <StickyCTA />
    </div>
  );
};

export default Index;

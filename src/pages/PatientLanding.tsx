import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import ReferralBanner from "@/components/ReferralBanner";
import HeroSection from "@/components/HeroSection";
import HighlightsSection from "@/components/HighlightsSection";
import MethodologySection from "@/components/MethodologySection";
import ComparisonSection from "@/components/ComparisonSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import UpgradeFlowSection from "@/components/UpgradeFlowSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FaqSection from "@/components/FaqSection";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";
import StickyCTA from "@/components/StickyCTA";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import { setSeo, setOrganizationJsonLd } from "@/lib/seo";

const PatientLanding = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("alivia_referral_code", ref);
  }, [searchParams]);

  useEffect(() => {
    setSeo({
      title: "Aliv.iA — Avaliação de Dor com Inteligência Artificial",
      description: "Entenda sua dor com precisão clínica. Diagnóstico preliminar e plano de tratamento personalizado em minutos, baseado em evidência científica.",
      url: "https://aliviawebapp.com.br/para-pacientes",
      type: "website",
    });
    setOrganizationJsonLd();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ReferralBanner />
      <main>
        <HeroSection showProfessionalCTA={false} />
        <HighlightsSection />
        <ComparisonSection />
        <MethodologySection />
        <HowItWorksSection />
        <UpgradeFlowSection />
        <TestimonialsSection />
        <FaqSection />
        <SocialSection />
      </main>
      <Footer />
      <StickyCTA showProfessional={false} />
      <ExitIntentPopup />
    </div>
  );
};

export default PatientLanding;

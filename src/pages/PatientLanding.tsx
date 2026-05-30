import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
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
import LgpdBadge from "@/components/LgpdBadge";
import { setSeo, setOrganizationJsonLd } from "@/lib/seo";

const PatientLanding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientDemoImportRef = useRef<Promise<unknown> | null>(null);
  const openingDemoRef = useRef(false);
  const [isOpeningDemo, setIsOpeningDemo] = useState(false);

  const warmPatientDemo = useCallback(() => {
    if (!patientDemoImportRef.current) {
      patientDemoImportRef.current = import("./PatientDemo");
    }

    return patientDemoImportRef.current;
  }, []);

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

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void warmPatientDemo();
    }, 150);

    return () => window.clearTimeout(preloadTimer);
  }, [warmPatientDemo]);

  const handleOpenDemo = useCallback(async () => {
    if (openingDemoRef.current) return;
    openingDemoRef.current = true;
    setIsOpeningDemo(true);

    void warmPatientDemo();

    window.setTimeout(() => {
      navigate("/para-pacientes/demo");
    }, 120);
  }, [navigate, warmPatientDemo]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ReferralBanner />
      <main>
        <HeroSection showProfessionalCTA={false} />
        <div className="container -mt-8 mb-12 flex justify-center">
          <button
            type="button"
            onMouseEnter={() => void warmPatientDemo()}
            onFocus={() => void warmPatientDemo()}
            onPointerDown={() => void warmPatientDemo()}
            onTouchStart={() => void warmPatientDemo()}
            onClick={handleOpenDemo}
            disabled={isOpeningDemo}
            aria-busy={isOpeningDemo}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:cursor-wait disabled:opacity-90"
          >
            {isOpeningDemo ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Abrindo demo interativa...
              </>
            ) : (
              <>
                <span aria-hidden="true">✨</span>
                Ver demo interativa do painel Premium
              </>
            )}
          </button>
        </div>
        <HighlightsSection />
        <ComparisonSection />
        <MethodologySection />
        <HowItWorksSection />
        <UpgradeFlowSection />
        <TestimonialsSection />
        <FaqSection />
        <SocialSection />
        <LgpdBadge />
      </main>
      <Footer />
      <StickyCTA showProfessional={false} />
      <ExitIntentPopup />
    </div>
  );
};

export default PatientLanding;

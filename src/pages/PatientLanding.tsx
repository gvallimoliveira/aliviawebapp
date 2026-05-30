import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle } from "lucide-react";
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
  const [showDemoFallback, setShowDemoFallback] = useState(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const warmPatientDemo = useCallback(() => {
    if (!patientDemoImportRef.current) {
      patientDemoImportRef.current = Promise.all([
        import("./PatientDemo"),
        import("@/components/demo/PatientDemoContent"),
        import("@/components/demo/PatientDemoHealth"),
      ]);
    }

    return patientDemoImportRef.current;
  }, []);

  const demoButtonText = useMemo(() => {
    if (showDemoFallback) return "Clique confirmado. Abrindo demo…";
    if (isOpeningDemo) return "Abrindo demo…";
    return "Ver demo interativa do painel Premium";
  }, [isOpeningDemo, showDemoFallback]);

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

  useEffect(() => () => {
    if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
  }, []);

  const handleOpenDemo = useCallback(async () => {
    if (openingDemoRef.current) return;
    openingDemoRef.current = true;
    setIsOpeningDemo(true);
    setShowDemoFallback(false);

    fallbackTimerRef.current = window.setTimeout(() => {
      setShowDemoFallback(true);
    }, 3000);

    window.requestAnimationFrame(() => {
      void warmPatientDemo();
      navigate("/para-pacientes/demo");
    });
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
                {showDemoFallback ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {demoButtonText}
              </>
            ) : (
              <>
                <span aria-hidden="true">✨</span>
                {demoButtonText}
              </>
            )}
          </button>
        </div>
        {isOpeningDemo ? (
          <div className="container -mt-8 mb-8 flex justify-center">
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">Abrindo demo…</span>
                <span className="text-xs text-muted-foreground">{showDemoFallback ? "Clique confirmado" : "Preparando"}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full bg-primary transition-all duration-500 ${showDemoFallback ? "w-full" : "w-2/3 animate-pulse"}`} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {showDemoFallback ? "A demo está carregando — seu clique foi recebido." : "Carregando a experiência interativa do paciente."}
              </p>
            </div>
          </div>
        ) : null}
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

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
import { showNavOverlay } from "@/lib/navigationOverlay";

const PatientLanding = () => {
  const [searchParams] = useSearchParams();
  const patientDemoImportRef = useRef<Promise<unknown> | null>(null);
  const openingDemoRef = useRef(false);

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

  // Defer demo preload until the landing has settled (window load + idle).
  // Earlier preloads were competing with the landing's own scripts and hurting
  // both the landing's responsiveness AND the demo's effective load time.
  useEffect(() => {
    let cancelled = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const trigger = () => {
      if (cancelled) return;
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(() => { if (!cancelled) void warmPatientDemo(); }, { timeout: 2500 });
      } else {
        window.setTimeout(() => { if (!cancelled) void warmPatientDemo(); }, 1200);
      }
    };
    if (document.readyState === "complete") {
      trigger();
    } else {
      window.addEventListener("load", trigger, { once: true });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("load", trigger);
    };
  }, [warmPatientDemo]);

  const handleOpenDemo = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow modifier clicks (new tab) to behave natively.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    if (openingDemoRef.current) return;
    openingDemoRef.current = true;

    // Synchronous, paint-immediate feedback via a global overlay rendered
    // outside <Routes>. It survives PatientLanding's unmount, so the user
    // sees instant confirmation even while React Router transitions to the
    // (lazily loaded) PatientDemo route.
    showNavOverlay("Abrindo demo do paciente…");
    sessionStorage.setItem("patient-demo-opening", String(Date.now()));

    // Kick off preload (idempotent — cached if already warmed).
    void warmPatientDemo();
    // <Link>'s default navigation handler runs after this onClick and
    // performs the SPA navigation — no preventDefault needed.
  }, [warmPatientDemo]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ReferralBanner />
      <main>
        <HeroSection showProfessionalCTA={false} />
        <div className="container -mt-8 mb-12 flex justify-center">
          <Link
            to="/para-pacientes/demo"
            onMouseEnter={() => void warmPatientDemo()}
            onFocus={() => void warmPatientDemo()}
            onPointerDown={() => void warmPatientDemo()}
            onTouchStart={() => void warmPatientDemo()}
            onClick={handleOpenDemo}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors active:scale-[0.98]"
          >
            <span aria-hidden="true">✨</span>
            Ver demo interativa do painel Premium
          </Link>
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

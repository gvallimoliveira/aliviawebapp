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
import BlogHighlights from "@/components/blog/BlogHighlights";
import StickyCTA from "@/components/StickyCTA";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import LgpdBadge from "@/components/LgpdBadge";
import SelfAssessmentDisclaimerSection from "@/components/SelfAssessmentDisclaimerSection";
import InstallAppSection from "@/components/InstallAppSection";
import ScrollProgress from "@/components/scroll/ScrollProgress";
import Reveal from "@/components/scroll/Reveal";
import PatientStatement from "@/components/scroll/PatientStatement";
import PatientJourneyShowcase from "@/components/scroll/PatientJourneyShowcase";
import BrandMarquee from "@/components/scroll/BrandMarquee";
import ClosingCta from "@/components/scroll/ClosingCta";


import { setSeo, setOrganizationJsonLd } from "@/lib/seo";
import { showNavOverlay, subscribeNavOverlay } from "@/lib/navigationOverlay";

const PatientLandingCinematic = () => {
  const [searchParams] = useSearchParams();
  const patientDemoImportRef = useRef<Promise<unknown> | null>(null);
  const openingDemoRef = useRef(false);
  const [isOpeningDemo, setIsOpeningDemo] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const setProgress = useCallback((value: number) => {
    progressRef.current = Math.max(progressRef.current, value);
    setDemoProgress(progressRef.current);
  }, []);

  const startProgressCreep = useCallback((ceiling: number) => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      const current = progressRef.current;
      if (current >= ceiling) return;
      // Gentle asymptotic creep toward the ceiling
      const next = current + Math.max(0.4, (ceiling - current) * 0.06);
      setProgress(Math.min(ceiling, next));
    }, 120) as unknown as number;
  }, [setProgress]);

  const stopProgressCreep = useCallback(() => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopProgressCreep(), [stopProgressCreep]);

  const warmPatientDemo = useCallback(() => {
    if (!patientDemoImportRef.current) {
      patientDemoImportRef.current = Promise.all([
        import("@/pages/PatientDemo"),
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
      title: "Aliv.iA — Autoavaliação de Dor com Inteligência Artificial",
      description: "Entenda sua dor com precisão clínica. Hipótese preliminar e plano de tratamento personalizado em minutos, com autoavaliação guiada e baseada em evidência científica.",
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
    setIsOpeningDemo(true);

    // Milestone 1 — click acknowledged (chunks may already be cached).
    setProgress(15);
    startProgressCreep(45); // creep toward "chunks loading" ceiling

    // Synchronous, paint-immediate feedback via a global overlay rendered
    // outside <Routes>. It survives PatientLanding's unmount, so the user
    // sees instant confirmation even while React Router transitions to the
    // (lazily loaded) PatientDemo route.
    showNavOverlay("Abrindo demo do paciente…");
    sessionStorage.setItem("patient-demo-opening", String(Date.now()));

    // Subscribe to the overlay store — when PatientDemo hides it, the demo
    // content has actually mounted, so we can drive the bar to 100%.
    const unsubscribe = subscribeNavOverlay((s) => {
      if (!s.visible && progressRef.current > 0) {
        stopProgressCreep();
        setProgress(100);
        unsubscribe();
      }
    });

    // Milestone 2 — chunks resolved (real signal).
    warmPatientDemo()
      .then(() => {
        setProgress(70);
        // Creep toward the "demo mounting" ceiling until the overlay hides.
        startProgressCreep(92);
      })
      .catch(() => {
        stopProgressCreep();
      });

    // Safety fallback: if something stalls for >8s, fill the bar so the
    // button never looks frozen at an arbitrary spot.
    window.setTimeout(() => {
      if (progressRef.current < 100) {
        stopProgressCreep();
        setProgress(100);
        unsubscribe();
      }
    }, 8000);
    // <Link>'s default navigation handler runs after this onClick and
    // performs the SPA navigation — no preventDefault needed.
  }, [warmPatientDemo, setProgress, startProgressCreep, stopProgressCreep]);

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <ScrollProgress />
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
            aria-busy={isOpeningDemo}
            aria-disabled={isOpeningDemo}
            className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary transition-colors active:scale-[0.98] ${
              isOpeningDemo ? "cursor-wait pointer-events-none" : "hover:bg-primary/10"
            }`}
          >
            {/* Inline keyframes (shimmer only — progress width is data-driven) */}
            {isOpeningDemo && (
              <style>{`
                @keyframes demoShimmerSweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
              `}</style>
            )}
            {/* Real-progress fill bound to actual navigation milestones */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 bg-primary/20"
              style={{
                width: `${isOpeningDemo ? demoProgress : 0}%`,
                transition: "width 280ms ease-out",
              }}
            />
            {/* Shimmer sweep — paused once we hit 100% */}
            {isOpeningDemo && demoProgress < 100 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                style={{ animation: "demoShimmerSweep 1.2s linear infinite" }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {isOpeningDemo ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <span aria-hidden="true">✨</span>
              )}
              {isOpeningDemo ? "Abrindo demo…" : "Ver demo interativa do painel Premium"}
            </span>
          </Link>
        </div>
        <SelfAssessmentDisclaimerSection />
        <BrandMarquee />
        <PatientStatement />
        <PatientJourneyShowcase />
        <Reveal><HighlightsSection /></Reveal>
        <Reveal><ComparisonSection /></Reveal>
        <Reveal><MethodologySection /></Reveal>
        <Reveal><HowItWorksSection /></Reveal>
        <Reveal scale><UpgradeFlowSection /></Reveal>
        <Reveal><TestimonialsSection /></Reveal>
        <ClosingCta />
        <Reveal><FaqSection /></Reveal>
        <Reveal><SocialSection /></Reveal>
        <LgpdBadge />
      </main>

      <BlogHighlights audience="patient" />
      <InstallAppSection />
      <Footer />
      <StickyCTA showProfessional={false} />
      <ExitIntentPopup />
    </div>
  );
};

export default PatientLandingCinematic;

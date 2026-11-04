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


import { setSeo, setOrganizationJsonLd, setPatientHealthJsonLd, setFAQPageJsonLd } from "@/lib/seo";
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
      title: "Avaliação de Dor e Fisioterapia Online: Lombar, Ciático, Joelho | Aliv.iA",
      description: "Dor na lombar, ciático, pescoço, joelho, ombro ou quadril? Faça uma autoavaliação guiada de fisioterapia em 15 minutos, com sinais de alerta e próximos passos.",
      url: "https://aliviawebapp.com.br/para-pacientes",
      type: "website",
    });
    setOrganizationJsonLd();
    setPatientHealthJsonLd("https://aliviawebapp.com.br/para-pacientes");
    setFAQPageJsonLd([
      { question: "Como avaliar minha dor nas costas ou lombar online?", answer: "Na autoavaliação do Aliv.iA você marca a dor no mapa do corpo, responde perguntas guiadas e testes simples de movimento. Em cerca de 15 minutos recebe uma orientação inicial e um relatório para levar ao fisioterapeuta. Não substitui a consulta." },
      { question: "Quando a dor lombar ou ciática exige atendimento urgente?", answer: "Procure atendimento imediato se houver perda de força progressiva na perna, alteração no controle da urina ou fezes, dormência na região íntima, febre, perda de peso sem explicação ou dor após trauma forte. A autoavaliação rastreia esses sinais de alerta antes de qualquer orientação." },
      { question: "A autoavaliação serve para dor no pescoço, ombro, joelho, quadril ou pé?", answer: "Sim. Ela cobre as queixas musculoesqueléticas mais comuns: lombar, ciático, cervical, torácica, ombro, quadril, joelho, punho e mão, fascite plantar e dor crônica." },
      { question: "Como saber se preciso de fisioterapia?", answer: "Se a dor limita movimentos do dia a dia, volta com frequência ou dura mais de algumas semanas, a fisioterapia costuma ajudar. A autoavaliação organiza seus sintomas e mostra quando procurar um fisioterapeuta." },
      { question: "A autoavaliação é gratuita?", answer: "Existe uma avaliação básica gratuita e uma avaliação completa paga, com relatório detalhado e plano de cuidados inicial." },
    ]);
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

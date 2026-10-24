import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import logoAlivia from "@/assets/logo-alivia.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClinic } from "@/contexts/ClinicContext";
import { supabase } from "@/integrations/supabase/client";
import { isFallbackVip } from "@/lib/vipEmails";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Eager — visible immediately on the default tab
import ReferralCard from "@/components/dashboard/ReferralCard";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import QuickActions from "@/components/dashboard/QuickActions";
import AssessmentHistory from "@/components/dashboard/AssessmentHistory";
import ConditionOverviewCards from "@/components/dashboard/ConditionOverviewCards";
import ConditionSelector from "@/components/dashboard/ConditionSelector";
import { usePainConditions } from "@/hooks/usePainConditions";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";

import ConfirmEmailBanner from "@/components/dashboard/ConfirmEmailBanner";

import ClinicContextSelector from "@/components/dashboard/ClinicContextSelector";
import SoloUpgradeBanner from "@/components/dashboard/SoloUpgradeBanner";
import ClinicTrialBanner, { ClinicTrialBlockOverlay, useClinicTrial } from "@/components/dashboard/ClinicTrialBanner";
// Lazy — only rendered when the corresponding tab/section opens
const PainDiary = lazy(() => import("@/components/dashboard/PainDiary"));
const PatientCheckinCard = lazy(() => import("@/components/dashboard/PatientCheckinCard"));
const ExerciseChecklist = lazy(() => import("@/components/dashboard/ExerciseChecklist"));
const EvolutionSummary = lazy(() => import("@/components/dashboard/EvolutionSummary"));
const AdaptiveProgressionCard = lazy(() => import("@/components/dashboard/AdaptiveProgressionCard"));
const AssessmentComparison = lazy(() => import("@/components/dashboard/AssessmentComparison"));
const ProDashboard = lazy(() => import("@/components/dashboard/ProDashboard"));
const MessagesTab = lazy(() => import("@/components/dashboard/MessagesTab"));
const OnboardingTour = lazy(() => import("@/components/onboarding/OnboardingTour"));
const ClinicTeamManagement = lazy(() => import("@/components/dashboard/ClinicTeamManagement"));
const ClinicSecretaryDashboard = lazy(() => import("@/components/dashboard/ClinicSecretaryDashboard"));
const ContextSelectionModal = lazy(() => import("@/components/dashboard/ContextSelectionModal"));
const ProSchedule = lazy(() => import("@/components/dashboard/ProSchedule"));
const DailySummaryCard = lazy(() => import("@/components/dashboard/DailySummaryCard"));
const ClinicOwnerDashboard = lazy(() => import("@/components/dashboard/ClinicOwnerDashboard"));
const InsightsTab = lazy(() => import("@/components/dashboard/insights/InsightsTab"));
const ProMetricsSection = lazy(() => import("@/components/dashboard/ProMetricsSection"));
const FeedbackSurveyCard = lazy(() => import("@/components/dashboard/FeedbackSurveyCard"));
const FeedbackResultsCard = lazy(() => import("@/components/dashboard/FeedbackResultsCard"));
const ExportDataCard = lazy(() => import("@/components/dashboard/ExportDataCard"));
const ImportDataCard = lazy(() => import("@/components/dashboard/ImportDataCard"));
const DemoUpsellBanner = lazy(() => import("@/components/demo/DemoUpsellBanner"));
const DemoInsightsMock = lazy(() => import("@/components/demo/DemoInsightsMock"));
const DemoMessagesMock = lazy(() => import("@/components/demo/DemoMessagesMock"));
const DemoDailySummaryMock = lazy(() => import("@/components/demo/DemoDailySummaryMock"));
import TryProDemoCard from "@/components/dashboard/TryProDemoCard";
import ProBottomTabBar from "@/components/dashboard/ProBottomTabBar";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import {
  Globe, HelpCircle, LogOut, Heart, Stethoscope, MessageCircle, Calendar as CalendarIcon, Building2,
  Link2, Copy, Check, Activity, Sparkles, Brain, Menu,
} from "lucide-react";
import { useClinicalAgentAccess } from "@/hooks/useClinicalAgentAccess";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { hasRealCrefito, isPlaceholderCrefito } from "@/lib/crefito";


const TabFallback = () => (
  <div className="flex items-center justify-center py-10">
    <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

interface PremiumAccess {
  has_access: boolean;
  can_redo: boolean;
  assessments_used?: number;
  max_assessments?: number;
  paid_at?: string;
  subscription_type?: "monthly" | "single" | null;
  available_discount?: { discount_percent: number } | null;
}

type OnboardingContext = "personal" | "professional" | "clinic";

function buildOnboardingSteps(
  context: OnboardingContext,
  opts: { subscriptionType?: "monthly" | "single" | null; canManageClinic?: boolean; hasAgentAccess?: boolean } = {}
): OnboardingStep[] {
  if (context === "clinic") {
    const steps: OnboardingStep[] = [
      { targetId: "clinic-tab-agenda", titleKey: "onboarding.clinic.step1.title", descriptionKey: "onboarding.clinic.step1.desc", position: "bottom" },
      { targetId: "clinic-tab-patients", titleKey: "onboarding.clinic.step2.title", descriptionKey: "onboarding.clinic.step2.desc", position: "bottom" },
    ];
    if (opts.canManageClinic) {
      steps.push({ targetId: "clinic-tab-insights", titleKey: "onboarding.clinic.step3.title", descriptionKey: "onboarding.clinic.step3.desc", position: "bottom" });
    }
    steps.push({ targetId: "clinic-tab-clinic", titleKey: "onboarding.clinic.step4.title", descriptionKey: "onboarding.clinic.step4.desc", position: "bottom" });
    return steps;
  }

  if (context === "professional") {
    const steps: OnboardingStep[] = [
      { targetId: "pro-tab-trigger", titleKey: "onboarding.pro_tab.title", descriptionKey: "onboarding.pro_tab.desc", position: "bottom", tab: "professional" },
      { targetId: "pro-link", titleKey: "onboarding.pro.step2.title", descriptionKey: "onboarding.pro.step2.desc", position: "bottom", tab: "professional" },
      { targetId: "pro-patients", titleKey: "onboarding.pro.step3.title", descriptionKey: "onboarding.pro.step3.desc", position: "bottom", tab: "professional" },
      { targetId: "pro-tab-agenda", titleKey: "onboarding.pro.agenda.title", descriptionKey: "onboarding.pro.agenda.desc", position: "bottom", tab: "agenda" },
      { targetId: "pro-tab-insights", titleKey: "onboarding.pro.insights.title", descriptionKey: "onboarding.pro.insights.desc", position: "bottom", tab: "insights" },
      { targetId: "pro-tab-messages", titleKey: "onboarding.pro.messages.title", descriptionKey: "onboarding.pro.messages.desc", position: "bottom", tab: "messages" },
    ];
    if (opts.hasAgentAccess) {
      steps.push({ targetId: "pro-tab-agent", titleKey: "onboarding.pro.agent.title", descriptionKey: "onboarding.pro.agent.desc", position: "bottom", tab: "professional" });
    }
    return steps;
  }

  // personal
  const steps: OnboardingStep[] = [
    { targetId: "patient-welcome", titleKey: "onboarding.patient.step1.title", descriptionKey: "onboarding.patient.step1.desc" },
    { targetId: "patient-assessments", titleKey: "onboarding.patient.step2.title", descriptionKey: "onboarding.patient.step2.desc", position: "bottom" },
    { targetId: "patient-find-pro", titleKey: "onboarding.patient.step4.title", descriptionKey: "onboarding.patient.step4.desc", position: "bottom" },
  ];
  if (opts.subscriptionType !== "single") {
    steps.push({ targetId: "patient-diary", titleKey: "onboarding.patient.step3.title", descriptionKey: "onboarding.patient.step3.desc", position: "bottom" });
  }
  return steps;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading, ready: authReady } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const { memberships, activeClinic, isClinicMode, needsContextSelection, activeContext, setActiveContext, setHasProfessionalProfile, hasProfessionalProfile, availableContextsCount, canManageClinic, isClinicSecretary, isClinicOwner, setPendingProfessionalSignup, setIsStudentProfessional } = useClinic();
  const navigate = useNavigate();
  const { hasAccess: hasAgentAccess } = useClinicalAgentAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const convFromUrl = searchParams.get("conv");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Restore tab from URL first, then sessionStorage (survives short
    // mobile background→foreground reloads), default to "health".
    if (typeof window === "undefined") return "health";
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab) return urlTab;
    try {
      const stored = sessionStorage.getItem("alivia_dashboard_tab");
      if (stored) return stored;
    } catch {}
    return "health";
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [clinicLinkCopied, setClinicLinkCopied] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [allConversationIds, setAllConversationIds] = useState<string[]>([]);
  const [hasAutoSwitchedPro, setHasAutoSwitchedPro] = useState(false);
  const [clinicSubTab, setClinicSubTab] = useState<string>("team");

  // Tutorial estritamente ligado ao contexto ativo. Cada modo tem sua
  // própria chave de "concluído" — assim aparece UMA ÚNICA vez no
  // primeiro acesso de cada perfil e nunca mais.
  const onboardingContext: OnboardingContext = isClinicMode && activeClinic
    ? "clinic"
    : (activeContext === "professional" && professional) || activeContext === "professional_demo"
      ? "professional"
      : "personal";
  const onboardingSteps = useMemo(
    () => buildOnboardingSteps(onboardingContext, {
      subscriptionType: premiumAccess?.subscription_type,
      canManageClinic,
      hasAgentAccess,
    }),
    [onboardingContext, premiumAccess?.subscription_type, canManageClinic, hasAgentAccess]
  );
  const onboardingStorageKey = `onboarding_${onboardingContext}_completed_v2`;
  const onboarding = useOnboarding(onboardingStorageKey, onboardingSteps);

  // While the professional tour is active, mirror each step's `tab` into the
  // dashboard so the user actually sees the area being described. When the
  // tour ends, return to the main "professional" tab.
  const tourPrevTabRef = useRef<string | null>(null);
  useEffect(() => {
    if (onboardingContext !== "professional") return;
    if (onboarding.isActive) {
      const targetTab = onboarding.step?.tab;
      if (targetTab) {
        if (tourPrevTabRef.current === null) tourPrevTabRef.current = activeTab;
        if (targetTab !== activeTab) setActiveTab(targetTab);
      }
    } else if (tourPrevTabRef.current !== null) {
      setActiveTab("professional");
      tourPrevTabRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.currentStep, onboarding.isActive, onboardingContext]);


  useEffect(() => {
    if (!authReady || authLoading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [user, authLoading, authReady, navigate]);

  // Sincronização imediata pós-Checkout: quando o usuário volta do Stripe
  // com ?subscription=success ou ?clinic=success, chamamos a função de
  // verificação com retries curtos (webhook pode chegar segundos depois),
  // atualizando o DB ANTES do usuário perceber que "não recebeu o acesso".
  // Isso elimina a janela de tempo em que o pagamento aparece no Stripe
  // mas a tabela `professionals`/`clinics` ainda está desatualizada.
  useEffect(() => {
    if (!authReady || !user) return;
    const subStatus = searchParams.get("subscription");
    const clinicStatus = searchParams.get("clinic");
    if (subStatus !== "success" && clinicStatus !== "success") return;

    let cancelled = false;
    (async () => {
      const fn = clinicStatus === "success" ? "check-clinic-subscription" : "check-pro-subscription";
      // Retry até 5x com backoff (0.5s, 1s, 2s, 3s, 5s) — dá tempo do
      // webhook processar sem travar a UI.
      const delays = [500, 1000, 2000, 3000, 5000];
      for (let i = 0; i < delays.length && !cancelled; i++) {
        try {
          const { data } = await supabase.functions.invoke(fn);
          const active =
            data?.subscribed === true ||
            data?.is_partner === true ||
            data?.subscription_status === "active";
          if (active) break;
        } catch {
          // segue para próxima tentativa
        }
        await new Promise((r) => setTimeout(r, delays[i]));
      }
      if (cancelled) return;
      // Limpa os query params para que refreshs futuros não redisparem o sync
      const next = new URLSearchParams(searchParams);
      next.delete("subscription");
      next.delete("clinic");
      setSearchParams(next, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.id]);


  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    const currentTab = nextParams.get("tab");
    const currentContext = nextParams.get("context");
    const currentClinicId = nextParams.get("clinicId");

    const nextContext = isClinicMode && activeClinic
      ? "clinic"
      : activeContext === "professional" && professional
        ? "professional"
        : activeContext === "professional_demo"
          ? "professional_demo"
          : "personal";

    let changed = false;

    if (currentTab !== activeTab) {
      nextParams.set("tab", activeTab);
      changed = true;
    }

    if (currentContext !== nextContext) {
      nextParams.set("context", nextContext);
      changed = true;
    }

    if (nextContext === "clinic" && activeClinic) {
      if (currentClinicId !== activeClinic.clinic_id) {
        nextParams.set("clinicId", activeClinic.clinic_id);
        changed = true;
      }
    } else if (currentClinicId) {
      nextParams.delete("clinicId");
      changed = true;
    }

    if (!changed) return;
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, activeContext, activeClinic, isClinicMode, professional, searchParams, setSearchParams]);

  // Persist active tab so a brief mobile suspend/restore cycle keeps the
  // user on the same screen instead of bouncing back to the default tab.
  useEffect(() => {
    try {
      sessionStorage.setItem("alivia_dashboard_tab", activeTab);
    } catch {}
  }, [activeTab]);

  // iOS PWA fallback: when the app is suspended (user switches apps or
  // locks the device) iOS may freeze the JS context and, on resume, the
  // React tree can re-mount or lose ephemeral state. Re-hydrate the
  // active tab from sessionStorage on every visibility/focus/pageshow
  // event so the user always lands back on the last screen.
  useEffect(() => {
    const restoreTab = () => {
      try {
        const urlTab = new URLSearchParams(window.location.search).get("tab");
        const stored = sessionStorage.getItem("alivia_dashboard_tab");
        const desired = urlTab || stored;
        if (desired && desired !== activeTab) {
          setActiveTab(desired);
        }
      } catch {}
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") restoreTab();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      // persisted = true means the page came from the bfcache (common on iOS)
      if (e.persisted || document.visibilityState === "visible") restoreTab();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", restoreTab);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", restoreTab);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [activeTab]);

  // Auto-scroll to the schedule grid when the Agenda tab becomes active
  useEffect(() => {
    if (activeTab !== "agenda") return;
    let cancelled = false;
    let attempts = 0;
    const scrollToAgenda = () => {
      if (cancelled) return;
      const el = document.getElementById("agenda-schedule-anchor");
      if (!el) {
        if (attempts++ < 30) window.setTimeout(scrollToAgenda, 80);
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      // Run a couple of follow-ups in case late-mounting children shift layout
      if (attempts++ < 6) window.setTimeout(scrollToAgenda, 200);
    };
    const t0 = window.setTimeout(scrollToAgenda, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
    };
  }, [activeTab]);



  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setDashboardLoading(false);
      setPremiumLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setPremiumLoading(true);

      const [profileResult, assessmentsResult, sessionResult, professionalResult] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        // Includes own assessments + pre-assessments via professional/clinic links matched by email
        (supabase.rpc as any)("get_my_assessments"),
        supabase.auth.getSession(),
        (supabase.from("professionals" as any) as any).select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (cancelled) return;

      setProfile(profileResult.status === "fulfilled" ? profileResult.value.data : null);
      setAssessments(assessmentsResult.status === "fulfilled" ? (assessmentsResult.value.data || []) : []);

      let nextProfessional: any = null;
      if (professionalResult.status === "fulfilled") {
        nextProfessional = professionalResult.value.data || null;
      }

      if (nextProfessional?.is_partner && !nextProfessional?.is_student && (isPlaceholderCrefito(nextProfessional.crefito) || nextProfessional.city === "A definir")) {
        navigate("/complete-profile", { replace: true });
        return;
      }

      setProfessional(nextProfessional);

      // Honra a origem do cadastro (landing profissional/clínica) mesmo se o
      // redirectTo da rota /auth tiver sido perdido (refresh, troca de aba
      // Login↔Signup, OAuth callback). Consumimos a flag uma única vez.
      // Fallback persistente: se sessionStorage tiver sumido (ex.: usuário
      // voltou em outro dispositivo/aba), usamos profiles.signup_origin
      // gravado no momento do cadastro.
      let signupOrigin: string | null = null;
      try { signupOrigin = sessionStorage.getItem("signupOrigin"); } catch {}
      const persistedOrigin =
        profileResult.status === "fulfilled"
          ? (profileResult.value.data as any)?.signup_origin ?? null
          : null;
      const effectiveOrigin = signupOrigin || persistedOrigin;

      // Verifica memberships de clínica para decidir o destino. Se o usuário
      // veio da landing profissional MAS já tem convites/clínicas, NÃO
      // bloqueamos com auto-redirect — deixamos o seletor de perfil aparecer
      // (com opção extra "Cadastrar como profissional" no modal).
      const { data: myMembers } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);
      const hasAnyClinic = Array.isArray(myMembers) && myMembers.length > 0;

      // Skip flag: usuário clicou em "Pular por agora" no /professional/register.
      // Não redirecionar mais; ele segue no painel pessoal com banner persistente.
      const skipped = profileResult.status === "fulfilled"
        ? !!(profileResult.value.data as any)?.professional_register_skipped
        : false;

      if (effectiveOrigin === "professional" && !nextProfessional && !hasAnyClinic && !skipped) {
        try { sessionStorage.removeItem("signupOrigin"); } catch {}
        navigate("/professional/register", { replace: true });
        return;
      }
      if (effectiveOrigin === "clinic" && !hasAnyClinic) {
        try { sessionStorage.removeItem("signupOrigin"); } catch {}
        navigate("/clinica#pricing", { replace: true });
        return;
      }
      // Sempre que a origem é "profissional" e ainda não existe linha em
      // public.professionals, mantemos o flag ligado para que o seletor de
      // contexto e o CTA de assinatura PRO fiquem permanentemente visíveis
      // — tanto no caso autônomo quanto vinculado a clínica — até o usuário
      // concluir o cadastro ou assinar.
      if (effectiveOrigin === "professional" && !nextProfessional) {
        setPendingProfessionalSignup(true);
      }


      // Do not bounce clinic therapists (no own PRO profile) to the
      // registration flow — they may simply be exploring the demo mode.
      if (!nextProfessional && tabFromUrl === "professional" && activeContext !== "professional_demo") {
        navigate("/professional/register", { replace: true });
        return;
      }

      const accessToken = sessionResult.status === "fulfilled"
        ? sessionResult.value.data.session?.access_token
        : null;

      if (!accessToken) {
        setPremiumAccess(null);
        setPremiumLoading(false);
        setDashboardLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", { body: { check_access: true } });
        if (cancelled) return;
        setPremiumAccess(!error && !data?.error ? data : null);
      } catch {
        if (cancelled) return;
        setPremiumAccess(null);
      } finally {
        if (cancelled) return;
        setPremiumLoading(false);
        setDashboardLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, navigate, tabFromUrl]);

  // Reset tab on context change or URL params — but preserve the current
  // tab (from URL or sessionStorage) when it's still valid for the new
  // context. This avoids resetting to the default tab on a brief mobile
  // app-switch / suspend cycle.
  useEffect(() => {
    const desired = tabFromUrl || activeTab;
    if (activeContext === "clinic" && activeClinic) {
      const valid = ["agenda", "patients", "insights", "messages", "clinic"];
      // Legacy deep-link remap: team/link/analytics → clinic + sub-tab
      const legacyMap: Record<string, string> = { team: "team", link: "link", analytics: "management" };
      if (legacyMap[desired]) {
        setClinicSubTab(legacyMap[desired]);
        setActiveTab("clinic");
      } else {
        setActiveTab(valid.includes(desired) ? desired : "agenda");
      }
    } else if ((activeContext === "professional" && professional) || activeContext === "professional_demo") {
      const valid = ["professional", "agenda", "insights", "messages"];
      setActiveTab(valid.includes(desired) ? desired : "professional");
    } else if (activeContext === "personal") {
      const valid = ["health", "messages"];
      setActiveTab(valid.includes(desired) ? desired : "health");
    }
    // If activeContext is "professional"/"clinic" but the underlying data
    // hasn't arrived yet, do NOT set a tab — the effect re-runs when
    // professional/activeClinic become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl, activeContext, activeClinic, professional]);

  // Safety clamp: if activeTab doesn't belong to the currently rendered
  // tab branch (race between context switch and async data), reset it to
  // that branch's default so the first tab always shows content.
  useEffect(() => {
    const inClinicMode = isClinicMode && !!activeClinic;
    const inProMode = !inClinicMode && ((activeContext === "professional" && !!professional) || activeContext === "professional_demo");

    const validTabs = inClinicMode
      ? ["agenda", "patients", "insights", "messages", "clinic"]
      : inProMode
        ? ["professional", "agenda", "insights", "messages"]
        : ["health", "messages"];

    if (!validTabs.includes(activeTab)) {
      setActiveTab(inClinicMode ? "agenda" : inProMode ? "professional" : "health");
    }
  }, [activeTab, activeContext, activeClinic, professional, isClinicMode]);


  // Sync professional profile flag.
  // Regra: is_student é a fonte de verdade do "Modo Acadêmico". Se o perfil
  // está marcado como estudante (acadêmico), o seletor mostra "Modo Acadêmico"
  // independentemente de active_profile_mode (campo legado que podia ficar
  // dessincronizado em contas criadas pelo card acadêmico vs. botão pro).
  useEffect(() => {
    // Stub rows criados ao aceitar convite de clínica (terapeuta) têm
    // active=false e sem crefito/assinatura — não devem suprimir o modo
    // "Profissional Autônomo (Demo)" no seletor de contexto.
    const p: any = professional;
    const isRealProProfile = !!p && (
      p.active === true
      || hasRealCrefito(p.crefito)
      || !!p.subscription_stripe_id
      || p.is_partner === true
      || p.is_partner_account === true
    );
    setHasProfessionalProfile(isRealProProfile);
    // Modo acadêmico é decidido por active_profile_mode (fonte de verdade
    // atual). Fallback para is_student em contas legadas sem o campo.
    const mode = p?.active_profile_mode ?? (p?.is_student ? "student" : "professional");
    setIsStudentProfessional(mode === "student");
  }, [professional]);

  // Auto-switch to "professional" context once on first load when arriving
  // via ?tab=professional. We mark `hasAutoSwitchedPro` as soon as the
  // professional profile is loaded — regardless of whether we actually
  // switched — so subsequent manual context changes by the user (via the
  // ClinicContextSelector) are never reverted by this effect. Without this,
  // switching professional → personal would take two clicks because the
  // effect would snap back to "professional" before the URL's `tab` param
  // had a chance to update.
  useEffect(() => {
    if (hasAutoSwitchedPro || !professional) return;
    if (tabFromUrl === "professional" && activeContext !== "professional" && activeContext !== "clinic") {
      setActiveContext("professional");
    }
    setHasAutoSwitchedPro(true);
  }, [professional, tabFromUrl, hasAutoSwitchedPro, activeContext]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { data: convs } = await supabase.from("conversations").select("id");
    if (!convs || convs.length === 0) {
      setUnreadCount(0);
      return;
    }
    const convIds = convs.map((c: any) => c.id);
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_user_id", user.id)
      .is("read_at", null);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    if (!authReady || !user) return;
    fetchUnreadCount();
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchUnreadCount())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authReady, user?.id]);

  // Fetch all conversation IDs for the global video call listener
  useEffect(() => {
    if (!authReady || !user || !ENABLE_VIDEO_CALL) return;
    const loadConvIds = async () => {
      const { data } = await supabase.from("conversations").select("id");
      setAllConversationIds((data || []).map((c: any) => c.id));
    };
    loadConvIds();
    // Re-fetch when conversations change
    const ch = supabase
      .channel("conv-ids-for-video")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConvIds())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authReady, user?.id]);

  const handleVideoCallNavigateToChat = useCallback((convId: string) => {
    setActiveTab("messages");
    navigate(`/dashboard?tab=messages&conv=${convId}`, { replace: true });
  }, [navigate]);

  // Agrupa avaliações em condições clínicas (lombar, ombro D., cotovelo E. ...)
  const {
    conditions,
    activeCondition,
    focusKey: conditionFocusKey,
    selectCondition,
  } = usePainConditions(assessments);

  const conditionAssessments = activeCondition ? activeCondition.assessments : assessments;

  // id da avaliação -> rótulo da condição (usado no histórico "todas as condições")
  const conditionLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    conditions.forEach((c) => c.assessments.forEach((a: any) => { map[a.id] = c.label; }));
    return map;
  }, [conditions]);



  // Tutorial é estritamente do contexto ativo (clinic/professional/personal),
  // então NÃO precisamos mais forçar troca de tab/contexto durante o tour.
  // Cada perfil tem seus próprios passos com targets que existem na sua tela.

  if (!authReady || authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    // Hard redirect — evita "tela branca" causada por re-render do
    // Dashboard com user=null enquanto a navegação SPA acontece.
    window.location.replace("/auth");
  };


  const renderClientContent = () => (
    <>
      <UpgradeBanner premiumAccess={premiumAccess} premiumLoading={premiumLoading} professional={professional} />

      {/* Minhas condições — um acompanhamento por região/diagnóstico */}
      <ConditionOverviewCards
        conditions={conditions}
        activeKey={conditionFocusKey}
        onSelect={selectCondition}
        onOpenAssessment={(id) => navigate(`/assessment/view/${id}`)}
      />

      <ConditionSelector
        conditions={conditions}
        activeKey={conditionFocusKey}
        onSelect={selectCondition}
      />

      {/* Evolution Summary Card (da condição em foco) */}
      <EvolutionSummary assessments={conditionAssessments} />
      
      <QuickActions hasPremiumAccess={premiumAccess?.has_access} premiumLoading={premiumLoading} />
      <ReferralCard availableDiscount={premiumAccess?.available_discount} />

      {/* Exercise Checklist */}
      <ExerciseChecklist
        conditionAssessmentIds={(activeCondition?.assessments || []).map((a) => a.id)}
        conditionLabel={activeCondition?.label}
        filterByCondition={conditions.length > 1}
      />


      {/* AI Adaptive Progression - only for self-service premium */}
      <AdaptiveProgressionCard premiumAccess={premiumAccess} assessments={conditionAssessments} />

      {premiumAccess?.has_access && premiumAccess?.subscription_type === "monthly" && (
        <div data-onboarding="patient-diary">
          <PainDiary conditions={conditions} activeConditionKey={conditionFocusKey} />
        </div>
      )}

      {/* Check-in de carga: aparece quando o e-mail da conta é paciente de um fisio/clínica */}
      <PatientCheckinCard />
      {premiumAccess?.has_access && premiumAccess?.subscription_type === "monthly" && (
        <AssessmentComparison assessments={conditionAssessments} />
      )}

      <AssessmentHistory
        assessments={conditionAssessments}
        allAssessments={assessments}
        conditionLabels={conditionLabelById}
        onDeleted={(ids) => setAssessments((prev) => prev.filter((a) => !ids.includes(a.id)))}
      />

    </>
  );

  const unreadBadge = unreadCount > 0 && (
    <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 ml-1">
      {unreadCount}
    </Badge>
  );

  const videoCallWrapper = ENABLE_VIDEO_CALL ? (content: React.ReactNode) => (
    <VideoCallProvider conversationIds={allConversationIds} onNavigateToChat={handleVideoCallNavigateToChat}>
      {content}
    </VideoCallProvider>
  ) : (content: React.ReactNode) => <>{content}</>;

  const dashboardContent = (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}><ContextSelectionModal /></Suspense>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5 hidden md:inline-flex">
              <Globe className="h-4 w-4" />{t("nav.language")}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} title={t("support.badge")} className="hidden md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 hidden md:inline-flex">
              <LogOut className="h-4 w-4" />{t("nav.logout")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.dispatchEvent(new Event("alivia:open-global-menu"))}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-4 space-y-8 max-w-7xl">
        <ClinicContextSelector />
        
        {professional?.subscription_grace_until && new Date(professional.subscription_grace_until) > new Date() && professional?.subscription_status !== "active" && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="py-4 px-4 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Sua assinatura PRO caiu — você tem 7 dias de tolerância.
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Você continua visível na vitrine pública até{" "}
                  {new Date(professional.subscription_grace_until).toLocaleDateString("pt-BR")}. Regularize sua assinatura para não ser removido.
                </p>
              </div>
              <Button size="sm" className="rounded-xl shrink-0" onClick={() => navigate("/professional#pricing")}>
                Reativar
              </Button>
            </CardContent>
          </Card>
        )}
        <ConfirmEmailBanner user={user} />
        {profile?.professional_register_skipped && !professional && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 px-4 flex items-start gap-3">
              <Stethoscope className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-foreground">
                  Cadastro profissional pendente
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você ainda não concluiu seu cadastro PRO. Sem ele, você não aparece na vitrine
                  de profissionais nem libera o painel PRO. Você pode concluir quando quiser.
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-xl shrink-0"
                onClick={async () => {
                  try {
                    await (supabase as any)
                      .from("profiles")
                      .update({ professional_register_skipped: false })
                      .eq("user_id", user!.id);
                  } catch {}
                  navigate("/professional/register");
                }}
              >
                Completar cadastro
              </Button>
            </CardContent>
          </Card>
        )}
        {profile?.signup_origin === "professional" && !professional && (
          <SoloUpgradeBanner hasActiveProSubscription={false} />
        )}

        <WelcomeSection
          profileName={
            profile?.full_name?.trim() ||
            professional?.full_name?.trim() ||
            (isClinicMode ? activeClinic?.clinic_name : undefined) ||
            (user?.email ? user.email.split("@")[0] : undefined)
          }
          userEmail={user?.email}
          professional={professional}
          premiumAccess={premiumAccess}
          onRestart={onboarding.restart}
          showRestart={false}
          activeTab={activeTab}
        />

        <Suspense fallback={<TabFallback />}>
        {isClinicMode && activeClinic ? (
          /* ── Clinic Mode: 5 tabs matching demo layout ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList
              className="w-full grid"
              style={{ gridTemplateColumns: `repeat(${(canManageClinic ? 5 : 4) + (hasAgentAccess ? 1 : 0)}, 1fr)` }}
            >
              <TabsTrigger value="agenda" className="gap-1.5 text-xs" data-onboarding="clinic-tab-agenda">
                <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_agenda")}</span>
              </TabsTrigger>
              <TabsTrigger value="patients" className="gap-1.5 text-xs" data-onboarding="clinic-tab-patients">
                <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">Pacientes</span>
              </TabsTrigger>
              {canManageClinic && (
                <TabsTrigger value="insights" className="gap-1.5 text-xs" data-onboarding="clinic-tab-insights">
                  <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Insights</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="messages" className="gap-1.5 relative text-xs">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
              </TabsTrigger>
              {hasAgentAccess && (
                <button
                  type="button"
                  onClick={() => navigate("/agente")}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Brain className="h-4 w-4" /><span className="hidden sm:inline">Agente</span>
                </button>
              )}

              <TabsTrigger value="clinic" className="gap-1.5 text-xs" data-onboarding="clinic-tab-clinic">
                <Building2 className="h-4 w-4" /><span className="hidden sm:inline">Clínica</span>
              </TabsTrigger>
            </TabsList>

            {/* Agenda */}
            <TabsContent value="agenda" className="space-y-6">
              <ClinicTrialBanner />
              <div className="relative" id="agenda-schedule-anchor">
                <ProSchedule
                  key={`clinic:${activeClinic.clinic_id}`}
                  professionalId={professional?.id}
                  clinicId={activeClinic.clinic_id}
                  isSimulated={isSimulated}
                />
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>


            {/* Pacientes */}
            <TabsContent value="patients" className="space-y-6">
              <ClinicTrialBanner />
              <div className="relative">
                {isClinicSecretary || canManageClinic ? (
                  <ClinicSecretaryDashboard />
                ) : professional ? (
                  <ProDashboard key={`clinic:${activeClinic.clinic_id}`} professional={professional} hideForClinicTabs isSimulated={isSimulated} onSimulatedChange={setIsSimulated} />
                ) : (
                  // Therapist without professional profile — restricted view (no analytics/feedback/reports)
                  <ClinicSecretaryDashboard restrictedTherapistView />
                )}
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>

            {/* Insights (owner/secretary only) */}
            {canManageClinic && (
              <TabsContent value="insights" className="space-y-6">
                <ClinicTrialBanner />
                <div className="relative space-y-6">
                  <InsightsTab clinicId={activeClinic.clinic_id} fullClinicMode canManage={isClinicOwner} />
                  <FeedbackSurveyCard clinicId={activeClinic.clinic_id} lang={language} />
                  <FeedbackResultsCard clinicId={activeClinic.clinic_id} lang={language} />
                  <ProMetricsSection clinicId={activeClinic.clinic_id} />
                  <ClinicTrialBlockOverlay />
                </div>
              </TabsContent>
            )}

            {/* Mensagens */}
            <TabsContent value="messages" className="space-y-6">
              <ClinicTrialBanner />
              <div className="relative min-h-[400px]">
                <MessagesTab
                  professional={professional}
                  clinicId={activeClinic.clinic_id}
                  initialConversationId={convFromUrl}
                  canInitiateAsPatient={true}
                  canInitiateAsProfessional={true}
                  clinicStaffInboxId={(isClinicSecretary || canManageClinic) ? activeClinic.clinic_id : null}
                />
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>

            {/* Clínica — agrupa Equipe & Configurações + Link + Gestão */}
            <TabsContent value="clinic" className="space-y-6">
              <ClinicTrialBanner />
              <div className="relative">
                <Tabs
                  value={clinicSubTab}
                  onValueChange={setClinicSubTab}
                  className="space-y-5"
                >
                  <TabsList className="w-full grid" style={{ gridTemplateColumns: canManageClinic ? "repeat(3, 1fr)" : "repeat(2, 1fr)" }}>
                    <TabsTrigger value="team" className="gap-1.5 text-xs">
                      <Building2 className="h-4 w-4" /><span className="hidden sm:inline">Equipe & Config</span><span className="sm:hidden">Equipe</span>
                    </TabsTrigger>
                    <TabsTrigger value="link" className="gap-1.5 text-xs">
                      <Link2 className="h-4 w-4" /><span className="hidden sm:inline">Link da clínica</span><span className="sm:hidden">Link</span>
                    </TabsTrigger>
                    {canManageClinic && (
                      <TabsTrigger value="management" className="gap-1.5 text-xs">
                        <Activity className="h-4 w-4" /><span className="hidden sm:inline">Gestão & KPIs</span><span className="sm:hidden">Gestão</span>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="team" className="space-y-6">
                    <ClinicTeamManagement />
                  </TabsContent>

                  <TabsContent value="link" className="space-y-4">
                    <Card className="border-primary/20">
                      <CardContent className="py-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Link2 className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-foreground">Link de pré-avaliação da clínica</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Compartilhe este link com seus pacientes. As avaliações entram em um pool compartilhado da clínica e podem ser atribuídas a qualquer fisioterapeuta da equipe.
                        </p>
                        <div className="flex gap-2">
                          <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
                            {getPublicOrigin()}/assessment/clinic/{activeClinic.clinic_id}
                          </code>
                          <Button
                            onClick={() => {
                              const link = `${getPublicOrigin()}/assessment/clinic/${activeClinic.clinic_id}`;
                              navigator.clipboard.writeText(link);
                              setClinicLinkCopied(true);
                              setTimeout(() => setClinicLinkCopied(false), 2000);
                            }}
                            variant="outline"
                            className="gap-1.5 rounded-xl shrink-0"
                          >
                            {clinicLinkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            {clinicLinkCopied ? t("referral.copied") : t("referral.copy_link")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-5 space-y-3">
                        <h3 className="font-semibold text-foreground text-sm">Como funciona</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {[
                            "Paciente acessa o link e preenche a avaliação",
                            "A avaliação aparece no pool da clínica como 'Sem atribuição'",
                            "Secretária ou proprietário atribui a um fisioterapeuta",
                            "O diagnóstico IA é gerado automaticamente ao completar",
                            "O plano de tratamento é gratuito (incluso na assinatura)",
                          ].map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {canManageClinic && (
                    <TabsContent value="management" className="space-y-6">
                      <ClinicOwnerDashboard clinicId={activeClinic.clinic_id} />
                      {isClinicOwner && (
                        <>
                          <ExportDataCard
                            mode="clinic"
                            clinicId={activeClinic.clinic_id}
                            entityName={activeClinic.clinic_name}
                          />
                          <ImportDataCard
                            mode="clinic"
                            clinicId={activeClinic.clinic_id}
                            entityName={activeClinic.clinic_name}
                          />
                        </>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>
          </Tabs>
        ) : (activeContext === "professional" && professional) || activeContext === "professional_demo" ? (
          /* ── Professional Autonomous Mode (real or demo): 3 tabs ── */
          (() => {
            const isProDemo = activeContext === "professional_demo";
            const hasPaidProSubscription = !!professional && (
              professional.subscription_status === "active"
              && (
                !!professional.subscription_stripe_id
                || (professional.pro_access_expires_at && new Date(professional.pro_access_expires_at) > new Date())
              )
            );
            const isPartner = !!professional && professional.is_partner === true;
            const isAcademicPartner = !!professional && professional.is_partner_account === true && professional.is_student === true;
            const isVipAdmin = isFallbackVip(user?.email);
            const hasProAccess = isVipAdmin || (!isProDemo && !!professional && (
              hasPaidProSubscription
              || isPartner
              || isAcademicPartner
            ));
            const isStudentLocked = !!professional?.is_student && !hasProAccess;
            const ProLockedCard = ({ title, desc }: { title: string; desc: string }) => (
              <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <CardContent className="py-10 text-center space-y-4">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase tracking-wide">PRO</Badge>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{desc}</p>
                  </div>
                  {isStudentLocked && (
                    <div className="mx-auto max-w-md rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-left text-xs space-y-1.5">
                      <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                        🎓 Selo Alivia Acadêmico não libera assinatura
                      </p>
                      <p className="text-amber-900/85 leading-relaxed">
                        O modo Acadêmico é só um identificador visual nos seus PDFs e links. Para usar as ferramentas PRO, assine o plano profissional e mantenha o modo Acadêmico ativo enquanto ainda não tem CREFITO.
                      </p>
                    </div>
                  )}
                  <Button onClick={() => setActiveTab("professional")} variant="outline" className="rounded-xl">
                    Ver opções de assinatura
                  </Button>
                </CardContent>
              </Card>
            );
            const proStub: any = isProDemo ? {
              id: "demo",
              full_name: profile?.full_name || user?.email?.split("@")[0] || "Demo",
              email: user?.email || "",
              lifetime_treatment: false,
              is_partner: false,
              premium_granted: false,
              crefito: "DEMO",
              specialties: [],
              city: "",
              state: "",
              profile_photo_url: null,
              logo_url: null,
              clinic_name: null,
              clinic_address: null,
              bio: null,
              social_media: null,
              phone: null,
              active: true,
              approved: false,
              subscription_status: "active",
            } : professional;
            const showInsightsTab = (isProDemo || (hasProAccess && !!professional?.id));
            return (
              <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList
                  className="w-full grid"
                  style={{ gridTemplateColumns: `repeat(${(showInsightsTab ? 4 : 3) + (hasAgentAccess ? 1 : 0)}, 1fr)` }}
                >
                  <TabsTrigger value="professional" className="gap-1.5 text-xs" data-onboarding="pro-tab-trigger">
                    <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_professional")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="gap-1.5 text-xs" data-onboarding="pro-tab-agenda">
                    <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_agenda")}</span>
                  </TabsTrigger>
                  {showInsightsTab && (
                    <TabsTrigger value="insights" className="gap-1.5 text-xs" data-onboarding="pro-tab-insights">
                      <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Insights</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="messages" className="gap-1.5 relative text-xs" data-onboarding="pro-tab-messages">
                    <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
                  </TabsTrigger>
                  {hasAgentAccess && (
                    <button
                      type="button"
                      onClick={() => navigate("/agente")}
                      data-onboarding="pro-tab-agent"
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Brain className="h-4 w-4" /><span className="hidden sm:inline">Agente</span>
                    </button>
                  )}

                </TabsList>
                <TabsContent value="professional" className="space-y-6">
                  {isProDemo && <DemoUpsellBanner section="pro-patients" variant="pro" />}
                  {!isProDemo && !hasProAccess && <TryProDemoCard section="Pacientes" />}
                  <ProDashboard
                    professional={proStub}
                    isSimulated={isProDemo ? true : isSimulated}
                    onSimulatedChange={isProDemo ? undefined : setIsSimulated}
                    isDemoMode={isProDemo}
                  />
                </TabsContent>
                <TabsContent value="agenda" className="space-y-6" id="agenda-schedule-anchor">
                  {isProDemo ? (
                    <>
                      <DemoUpsellBanner section="pro-agenda" variant="pro" />
                      <ProSchedule professionalId={proStub.id} isSimulated={true} />
                    </>
                  ) : hasProAccess ? (
                    <ProSchedule professionalId={proStub.id} isSimulated={isSimulated} />
                  ) : (
                    <>
                      <TryProDemoCard section="Agenda" />
                      <ProLockedCard
                        title="Agenda exclusiva do plano PRO"
                        desc="Para agendar atendimentos, organizar sua semana e ver o resumo diário, ative sua assinatura PRO. O acesso de parceiro habilitado para você cobre apenas o perfil de Clínica."
                      />
                    </>
                  )}
                </TabsContent>

                {showInsightsTab && (
                  <TabsContent value="insights" className="space-y-6">
                    {isProDemo ? (
                      <>
                        <DemoUpsellBanner section="pro-insights" variant="pro" />
                        <DemoInsightsMock variant="pro" />
                      </>
                    ) : (
                      <>
                        <InsightsTab professionalId={professional.id} />
                        <ProMetricsSection professionalId={professional.id} />
                      </>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="messages" className="space-y-6">
                  {isProDemo ? (
                    <>
                      <DemoUpsellBanner section="pro-messages" variant="pro" />
                      <DemoMessagesMock />
                    </>
                  ) : hasProAccess ? (
                    <MessagesTab
                      professional={proStub}
                      initialConversationId={convFromUrl}
                      canInitiateAsPatient={false}
                      canInitiateAsProfessional={true}
                    />
                  ) : (
                    <>
                      <TryProDemoCard section="Mensagens" />
                      <ProLockedCard
                        title="Mensagens são parte do plano PRO"
                        desc="O chat com pacientes está disponível apenas para profissionais com assinatura PRO ativa. Seu acesso atual cobre o perfil de Clínica."
                      />
                    </>
                  )}
                </TabsContent>


              </Tabs>
              <ProBottomTabBar
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                hasAgentAccess={hasAgentAccess}
                professionalId={proStub.id}
                clinicId={activeClinic?.clinic_id || null}
                isDemo={isProDemo}
              />
              <div className="md:hidden h-20" aria-hidden="true" />
              </>
            );
          })()
        ) : (
          /* ── Personal Mode: Saúde + Mensagens ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="health" className="gap-1.5"><Heart className="h-4 w-4" />{t("dashboard.tab_my_health")}</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 relative text-xs">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="health" className="space-y-8">{renderClientContent()}</TabsContent>
            <TabsContent value="messages" className="space-y-6">
              <MessagesTab
                professional={professional}
                initialConversationId={convFromUrl}
                canInitiateAsPatient={true}
                canInitiateAsProfessional={false}
              />
            </TabsContent>
          </Tabs>
        )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <OnboardingTour
          step={onboarding.step}
          currentStep={onboarding.currentStep}
          totalSteps={onboarding.totalSteps}
          isActive={onboarding.isActive && !needsContextSelection}
          onNext={onboarding.next}
          onSkip={onboarding.skip}
        />
      </Suspense>

    </div>
  );

  return videoCallWrapper(dashboardContent);
};

export default Dashboard;

import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import logoAlivia from "@/assets/logo-alivia.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClinic } from "@/contexts/ClinicContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Eager — visible immediately on the default tab
import ReferralCard from "@/components/dashboard/ReferralCard";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import QuickActions from "@/components/dashboard/QuickActions";
import AssessmentHistory from "@/components/dashboard/AssessmentHistory";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";
import PushOptInBanner from "@/components/PushOptInBanner";
import PartnerPasswordBanner from "@/components/dashboard/PartnerPasswordBanner";
import ClinicContextSelector from "@/components/dashboard/ClinicContextSelector";
import ClinicTrialBanner, { ClinicTrialBlockOverlay, useClinicTrial } from "@/components/dashboard/ClinicTrialBanner";
// Lazy — only rendered when the corresponding tab/section opens
const PainDiary = lazy(() => import("@/components/dashboard/PainDiary"));
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
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import {
  Globe, HelpCircle, LogOut, Heart, Stethoscope, MessageCircle, Calendar as CalendarIcon, Building2,
  Link2, Copy, Check, Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

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

function buildOnboardingSteps(subscriptionType?: "monthly" | "single" | null, isProfessional?: boolean): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    { targetId: "patient-welcome", titleKey: "onboarding.patient.step1.title", descriptionKey: "onboarding.patient.step1.desc" },
    { targetId: "patient-assessments", titleKey: "onboarding.patient.step2.title", descriptionKey: "onboarding.patient.step2.desc", position: "bottom" },
    { targetId: "patient-find-pro", titleKey: "onboarding.patient.step4.title", descriptionKey: "onboarding.patient.step4.desc", position: "bottom" },
  ];
  if (subscriptionType !== "single") {
    steps.push({ targetId: "patient-diary", titleKey: "onboarding.patient.step3.title", descriptionKey: "onboarding.patient.step3.desc", position: "bottom" });
  }
  if (isProfessional) {
    steps.push(
      { targetId: "pro-tab-trigger", titleKey: "onboarding.pro_tab.title", descriptionKey: "onboarding.pro_tab.desc", position: "bottom" },
      { targetId: "pro-link", titleKey: "onboarding.pro.step2.title", descriptionKey: "onboarding.pro.step2.desc", position: "bottom" },
      { targetId: "pro-patients", titleKey: "onboarding.pro.step3.title", descriptionKey: "onboarding.pro.step3.desc", position: "bottom" },
      { targetId: "pro-subscription", titleKey: "onboarding.pro.step4.title", descriptionKey: "onboarding.pro.step4.desc", position: "bottom" },
    );
  }
  return steps;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading, ready: authReady } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const { memberships, activeClinic, isClinicMode, needsContextSelection, activeContext, setActiveContext, setHasProfessionalProfile, hasProfessionalProfile, availableContextsCount, canManageClinic, isClinicSecretary } = useClinic();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const convFromUrl = searchParams.get("conv");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("health");
  const [unreadCount, setUnreadCount] = useState(0);
  const [clinicLinkCopied, setClinicLinkCopied] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [allConversationIds, setAllConversationIds] = useState<string[]>([]);
  const [hasAutoSwitchedPro, setHasAutoSwitchedPro] = useState(false);

  const push = usePushNotifications();

  const onboardingSteps = useMemo(
    () => buildOnboardingSteps(premiumAccess?.subscription_type, !!professional),
    [premiumAccess?.subscription_type, !!professional]
  );
  const onboarding = useOnboarding("onboarding_patient_completed", onboardingSteps);

  useEffect(() => {
    if (!authReady || authLoading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [user, authLoading, authReady, navigate]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    const currentTab = nextParams.get("tab");
    const currentContext = nextParams.get("context");
    const currentClinicId = nextParams.get("clinicId");

    const nextContext = isClinicMode && activeClinic
      ? "clinic"
      : activeContext === "professional" && professional
        ? "professional"
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

      if (nextProfessional?.is_partner && (nextProfessional.crefito === "000000-X" || nextProfessional.city === "A definir")) {
        navigate("/complete-profile", { replace: true });
        return;
      }

      setProfessional(nextProfessional);

      if (!nextProfessional && tabFromUrl === "professional") {
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
  }, [authReady, user, navigate, tabFromUrl]);

  // Reset tab on context change or URL params
  useEffect(() => {
    if (activeContext === "clinic" && activeClinic) {
      if (tabFromUrl === "messages") setActiveTab("messages");
      else if (tabFromUrl === "agenda") setActiveTab("agenda");
      else if (tabFromUrl === "patients") setActiveTab("patients");
      else if (tabFromUrl === "team" || tabFromUrl === "clinic") setActiveTab("team");
      else if (tabFromUrl === "link") setActiveTab("link");
      else if (tabFromUrl === "analytics") setActiveTab("analytics");
      else setActiveTab("agenda");
    } else if (activeContext === "professional" && professional) {
      if (tabFromUrl === "messages") setActiveTab("messages");
      else if (tabFromUrl === "agenda") setActiveTab("agenda");
      else setActiveTab("professional");
    } else if (activeContext === "personal") {
      if (tabFromUrl === "messages") setActiveTab("messages");
      else setActiveTab("health");
    }
    // If activeContext is "professional"/"clinic" but the underlying data
    // (professional / activeClinic) hasn't arrived yet, do NOT set a tab —
    // the rendered branch is still "personal" and would show empty content.
    // The effect re-runs when professional/activeClinic become available.
  }, [tabFromUrl, activeContext, activeClinic, professional]);

  // Safety clamp: if activeTab doesn't belong to the currently rendered
  // tab branch (race between context switch and async data), reset it to
  // that branch's default so the first tab always shows content.
  useEffect(() => {
    const inClinicMode = isClinicMode && !!activeClinic;
    const inProMode = !inClinicMode && activeContext === "professional" && !!professional;

    const validTabs = inClinicMode
      ? ["agenda", "patients", "team", "link", "analytics", "messages"]
      : inProMode
        ? ["professional", "agenda", "messages"]
        : ["health", "messages"];

    if (!validTabs.includes(activeTab)) {
      setActiveTab(inClinicMode ? "agenda" : inProMode ? "professional" : "health");
    }
  }, [activeTab, activeContext, activeClinic, professional, isClinicMode]);


  // Sync professional profile flag & auto-switch on first load only
  useEffect(() => {
    setHasProfessionalProfile(!!professional);
    if (!hasAutoSwitchedPro && professional && tabFromUrl === "professional" && activeContext !== "professional" && activeContext !== "clinic") {
      setHasAutoSwitchedPro(true);
      setActiveContext("professional");
    }
  }, [professional, tabFromUrl, setHasProfessionalProfile]);

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
  }, [authReady, user]);

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
  }, [authReady, user]);

  const handleVideoCallNavigateToChat = useCallback((convId: string) => {
    setActiveTab("messages");
    navigate(`/dashboard?tab=messages&conv=${convId}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!onboarding.isActive || !onboarding.step) return;

    const proTargets = ["pro-link", "pro-patients", "pro-subscription"];

    if (proTargets.includes(onboarding.step.targetId)) {
      if (hasProfessionalProfile && activeContext !== "professional" && activeContext !== "clinic") {
        setActiveContext("professional");
      }
      setActiveTab("professional");
      return;
    }

    // Important: patient onboarding must never force the dashboard into a tab
    // that does not exist for the currently selected context. Otherwise the
    // professional/clinic shells can render their tab bar with no content.
    if (onboarding.step.targetId.startsWith("patient-") && activeContext === "personal") {
      setActiveTab("health");
    }
  }, [onboarding.step, onboarding.isActive, hasProfessionalProfile, activeContext, setActiveContext]);

  if (!authReady || authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => { await signOut(); navigate("/"); };


  const renderClientContent = () => (
    <>
      <UpgradeBanner premiumAccess={premiumAccess} premiumLoading={premiumLoading} professional={professional} push={push} />
      
      {/* Evolution Summary Card */}
      <EvolutionSummary assessments={assessments} />
      
      <QuickActions hasPremiumAccess={premiumAccess?.has_access} premiumLoading={premiumLoading} />
      <ReferralCard availableDiscount={premiumAccess?.available_discount} />

      {/* Exercise Checklist */}
      <ExerciseChecklist />

      {/* AI Adaptive Progression - only for self-service premium */}
      <AdaptiveProgressionCard premiumAccess={premiumAccess} assessments={assessments} />

      {premiumAccess?.has_access && premiumAccess?.subscription_type === "monthly" && (
        <div data-onboarding="patient-diary"><PainDiary /></div>
      )}
      {premiumAccess?.has_access && premiumAccess?.subscription_type === "monthly" && (
        <AssessmentComparison assessments={assessments} />
      )}

      <AssessmentHistory assessments={assessments} />
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
          </div>
        </div>
      </header>

      <main className={cn("container py-8 px-4 space-y-8", activeTab === "agenda" ? "max-w-7xl" : "max-w-4xl")}>
        <ClinicContextSelector />
        <PartnerPasswordBanner isPartner={professional?.is_partner} userId={user?.id} />
        <PushOptInBanner />
        <WelcomeSection
          profileName={profile?.full_name}
          userEmail={user?.email}
          professional={professional}
          premiumAccess={premiumAccess}
          onRestart={onboarding.restart}
          showRestart={!onboarding.isActive}
          activeTab={activeTab}
        />

        <Suspense fallback={<TabFallback />}>
        {isClinicMode && activeClinic ? (
          /* ── Clinic Mode: 5 tabs matching demo layout ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid" style={{ gridTemplateColumns: canManageClinic ? "repeat(6, 1fr)" : "repeat(5, 1fr)" }}>
              <TabsTrigger value="agenda" className="gap-1.5 text-xs">
                <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_agenda")}</span>
              </TabsTrigger>
              <TabsTrigger value="patients" className="gap-1.5 text-xs" data-onboarding="pro-tab-trigger">
                <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">Pacientes</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-1.5 text-xs">
                <Building2 className="h-4 w-4" /><span className="hidden sm:inline">Equipe</span>
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-1.5 text-xs">
                <Link2 className="h-4 w-4" /><span className="hidden sm:inline">Link</span>
              </TabsTrigger>
              {canManageClinic && (
                <TabsTrigger value="analytics" className="gap-1.5 text-xs">
                  <Activity className="h-4 w-4" /><span className="hidden sm:inline">Gestão</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="messages" className="gap-1.5 relative text-xs">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
              </TabsTrigger>
            </TabsList>

            {/* Agenda */}
            <TabsContent value="agenda" className="space-y-6">
              <ClinicTrialBanner />
              <DailySummaryCard
                professionalId={professional?.id}
                clinicId={activeClinic.clinic_id}
                onNavigateToAgenda={() => {}}
                onNavigateToPatients={() => setActiveTab("patients")}
              />
              <div className="relative">
                <ProSchedule
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
                {isClinicSecretary ? (
                  <ClinicSecretaryDashboard />
                ) : professional ? (
                  <ProDashboard professional={professional} hideForClinicTabs isSimulated={isSimulated} onSimulatedChange={setIsSimulated} />
                ) : (
                  <ClinicSecretaryDashboard />
                )}
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>

            {/* Equipe */}
            <TabsContent value="team" className="space-y-6">
              <ClinicTrialBanner />
              <div className="relative">
                <ClinicTeamManagement />
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>

            {/* Link */}
            <TabsContent value="link" className="space-y-6">
              <ClinicTrialBanner />
              <div className="relative">
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

                <Card className="mt-4">
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
                <ClinicTrialBlockOverlay />
              </div>
            </TabsContent>

            {/* Gestão (owner only) */}
            {canManageClinic && (
              <TabsContent value="analytics" className="space-y-6">
                <ClinicOwnerDashboard clinicId={activeClinic.clinic_id} />
              </TabsContent>
            )}

            {/* Mensagens */}
            <TabsContent value="messages" className="space-y-6">
              <MessagesTab
                professional={professional}
                clinicId={activeClinic.clinic_id}
                initialConversationId={convFromUrl}
                canInitiateAsPatient={true}
                canInitiateAsProfessional={true}
              />
            </TabsContent>
          </Tabs>
        ) : activeContext === "professional" && professional ? (
          /* ── Professional Autonomous Mode: 3 tabs (Profissional, Agenda, Mensagens) ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="professional" className="gap-1.5 text-xs" data-onboarding="pro-tab-trigger">
                <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_professional")}</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-1.5 text-xs">
                <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_agenda")}</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 relative text-xs">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="professional" className="space-y-8">
              <ProDashboard professional={professional} />
            </TabsContent>
            <TabsContent value="agenda" className="space-y-6">
              <DailySummaryCard
                professionalId={professional.id}
                onNavigateToAgenda={() => {}}
                onNavigateToPatients={() => setActiveTab("professional")}
              />
              <ProSchedule professionalId={professional.id} />
            </TabsContent>
            <TabsContent value="messages" className="space-y-6">
              <MessagesTab
                professional={professional}
                initialConversationId={convFromUrl}
                canInitiateAsPatient={false}
                canInitiateAsProfessional={true}
              />
            </TabsContent>
          </Tabs>
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

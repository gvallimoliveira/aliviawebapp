import { useEffect, useState, useMemo } from "react";
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
import PainDiary from "@/components/dashboard/PainDiary";
import ExerciseChecklist from "@/components/dashboard/ExerciseChecklist";
import EvolutionSummary from "@/components/dashboard/EvolutionSummary";
import AdaptiveProgressionCard from "@/components/dashboard/AdaptiveProgressionCard";
import AssessmentComparison from "@/components/dashboard/AssessmentComparison";
import ReferralCard from "@/components/dashboard/ReferralCard";
import ProDashboard from "@/components/dashboard/ProDashboard";
import MessagesTab from "@/components/dashboard/MessagesTab";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import QuickActions from "@/components/dashboard/QuickActions";
import AssessmentHistory from "@/components/dashboard/AssessmentHistory";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";
import PushOptInBanner from "@/components/PushOptInBanner";
import ClinicContextSelector from "@/components/dashboard/ClinicContextSelector";
import ClinicTeamManagement from "@/components/dashboard/ClinicTeamManagement";
import ClinicTrialBanner, { ClinicTrialBlockOverlay, useClinicTrial } from "@/components/dashboard/ClinicTrialBanner";
import ClinicSecretaryDashboard from "@/components/dashboard/ClinicSecretaryDashboard";
import ContextSelectionModal from "@/components/dashboard/ContextSelectionModal";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Globe, HelpCircle, LogOut, Heart, Stethoscope, MessageCircle, Calendar as CalendarIcon, Building2,
  Link2, Copy, Check, Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import ProSchedule from "@/components/dashboard/ProSchedule";
import DailySummaryCard from "@/components/dashboard/DailySummaryCard";
import ClinicOwnerDashboard from "@/components/dashboard/ClinicOwnerDashboard";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

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
  const { user, signOut, loading: authLoading } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const { memberships, activeClinic, isClinicMode, needsContextSelection } = useClinic();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const convFromUrl = searchParams.get("conv");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<string>("health");
  const [unreadCount, setUnreadCount] = useState(0);


  const [clinicLinkCopied, setClinicLinkCopied] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  const push = usePushNotifications();

  const onboardingSteps = useMemo(
    () => buildOnboardingSteps(premiumAccess?.subscription_type, !!professional),
    [premiumAccess?.subscription_type, !!professional]
  );
  const onboarding = useOnboarding("onboarding_patient_completed", onboardingSteps);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Reset tab on context change or URL params
  useEffect(() => {
    if (isClinicMode) {
      // Clinic mode: 5 tabs (agenda, patients, team, link, messages)
      if (tabFromUrl === "messages") setActiveTab("messages");
      else if (tabFromUrl === "agenda") setActiveTab("agenda");
      else if (tabFromUrl === "patients") setActiveTab("patients");
      else if (tabFromUrl === "team" || tabFromUrl === "clinic") setActiveTab("team");
      else if (tabFromUrl === "link") setActiveTab("link");
      else if (tabFromUrl === "analytics") setActiveTab("analytics");
      else setActiveTab("agenda");
    } else {
      // Personal mode
      if (tabFromUrl === "professional" && professional) setActiveTab("professional");
      else if (tabFromUrl === "messages") setActiveTab("messages");
      else if (tabFromUrl === "agenda") setActiveTab("agenda");
      else if (!tabFromUrl) setActiveTab("health");
    }
  }, [tabFromUrl, professional, isClinicMode, activeClinic?.clinic_id]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { data: convs } = await supabase.from("conversations").select("id");
    if (!convs || convs.length === 0) { setUnreadCount(0); return; }
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
    if (!user) return;
    fetchUnreadCount();
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchUnreadCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!onboarding.isActive || !onboarding.step) return;
    const proTargets = ["pro-link", "pro-patients", "pro-subscription"];
    if (proTargets.includes(onboarding.step.targetId)) setActiveTab("professional");
    else if (onboarding.step.targetId.startsWith("patient-")) setActiveTab("health");
  }, [onboarding.step, onboarding.isActive]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => setProfile(data));
    supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setAssessments(data || []));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) { setPremiumLoading(false); return; }
      supabase.functions.invoke("verify-payment", { body: { check_access: true } }).then(({ data, error }) => {
        setPremiumAccess(!error && !data?.error ? data : null);
        setPremiumLoading(false);
      }).catch(() => setPremiumLoading(false));
    });
    (supabase.from("professionals" as any) as any).select("*").eq("user_id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) {
        if (data.is_partner && (data.crefito === "000000-X" || data.city === "A definir")) {
          navigate("/complete-profile", { replace: true });
          return;
        }
        setProfessional(data);
      } else if (tabFromUrl === "professional") {
        navigate("/professional/register", { replace: true });
      }
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <ContextSelectionModal />
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />{t("nav.language")}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} title={t("support.badge")}>
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />{t("nav.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("container py-8 px-4 space-y-8", activeTab === "agenda" ? "max-w-7xl" : "max-w-4xl")}>
        {memberships.length > 0 && <ClinicContextSelector />}
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

        {isClinicMode && activeClinic ? (
          /* ── Clinic Mode: 5 tabs matching demo layout ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid" style={{ gridTemplateColumns: activeClinic.role === "owner" ? "repeat(6, 1fr)" : "repeat(5, 1fr)" }}>
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
              {activeClinic.role === "owner" && (
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
                {professional ? (
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
            {activeClinic.role === "owner" && (
              <TabsContent value="analytics" className="space-y-6">
                <ClinicOwnerDashboard clinicId={activeClinic.clinic_id} />
              </TabsContent>
            )}

            {/* Mensagens */}
            <TabsContent value="messages" className="space-y-6">
              <MessagesTab
                professional={professional}
                initialConversationId={convFromUrl}
                canInitiateConversation={true}
              />
            </TabsContent>
          </Tabs>
        ) : professional ? (
          /* ── Personal Mode with Professional ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="health" className="gap-1.5 text-xs"><Heart className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_my_health")}</span></TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 relative text-xs">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-1.5 text-xs">
                <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_agenda")}</span>
              </TabsTrigger>
              <TabsTrigger value="professional" className="gap-1.5 text-xs" data-onboarding="pro-tab-trigger">
                <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_professional")}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="health" className="space-y-8">{renderClientContent()}</TabsContent>
            <TabsContent value="messages" className="space-y-6">
              <MessagesTab
                professional={professional}
                initialConversationId={convFromUrl}
                canInitiateConversation={false}
              />
            </TabsContent>
            <TabsContent value="agenda" className="space-y-6">
              <DailySummaryCard
                professionalId={professional.id}
                onNavigateToAgenda={() => {}}
                onNavigateToPatients={() => setActiveTab("professional")}
              />
              <ProSchedule professionalId={professional.id} />
            </TabsContent>
            <TabsContent value="professional" className="space-y-8">
              <ProDashboard professional={professional} />
            </TabsContent>
          </Tabs>
        ) : (
          /* ── Personal Mode without Professional ── */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="health" className="gap-1.5"><Heart className="h-4 w-4" />{t("dashboard.tab_my_health")}</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 relative text-xs">
                <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("dashboard.tab_messages")}</span>{unreadBadge}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="health" className="space-y-8">{renderClientContent()}</TabsContent>
            <TabsContent value="messages" className="space-y-6">
              <MessagesTab initialConversationId={convFromUrl} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <OnboardingTour
        step={onboarding.step}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
        isActive={onboarding.isActive && !needsContextSelection}
        onNext={onboarding.next}
        onSkip={onboarding.skip}
      />
    </div>
  );
};

export default Dashboard;

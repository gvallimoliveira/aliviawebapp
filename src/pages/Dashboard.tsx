import { useEffect, useState, useMemo } from "react";
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
import ConversationList from "@/components/chat/ConversationList";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import QuickActions from "@/components/dashboard/QuickActions";
import AssessmentHistory from "@/components/dashboard/AssessmentHistory";
import UpgradeBanner from "@/components/dashboard/UpgradeBanner";
import PushOptInBanner from "@/components/PushOptInBanner";
import ClinicContextSelector from "@/components/dashboard/ClinicContextSelector";
import ClinicTeamManagement from "@/components/dashboard/ClinicTeamManagement";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Globe, HelpCircle, LogOut, Heart, Stethoscope, MessageCircle, Calendar as CalendarIcon, Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search, User, Stethoscope as StethoscopeIcon } from "lucide-react";
import ProSchedule from "@/components/dashboard/ProSchedule";

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
  const { memberships, activeClinic, isClinicMode } = useClinic();
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
  const [msgSearch, setMsgSearch] = useState("");
  const [msgFilter, setMsgFilter] = useState<"all" | "patient" | "professional">("all");

  const push = usePushNotifications();

  const onboardingSteps = useMemo(
    () => buildOnboardingSteps(premiumAccess?.subscription_type, !!professional),
    [premiumAccess?.subscription_type, !!professional]
  );
  const onboarding = useOnboarding("onboarding_patient_completed", onboardingSteps);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (tabFromUrl === "professional" && professional) setActiveTab("professional");
    else if (tabFromUrl === "messages") setActiveTab("messages");
    else if (tabFromUrl === "agenda" && professional) setActiveTab("agenda");
  }, [tabFromUrl, professional]);

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

      <main className="container max-w-4xl py-8 px-4 space-y-8">
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

        {professional ? (
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
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />{t("chat.messages_title")}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder={t("chat.search_placeholder")}
                  className="pl-9 rounded-xl"
                />
              </div>
              {professional && (
                <div className="flex gap-2">
                  <Button
                    variant={msgFilter === "all" ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => setMsgFilter("all")}
                  >
                    {t("chat.filter_all")}
                  </Button>
                  <Button
                    variant={msgFilter === "patient" ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs gap-1"
                    onClick={() => setMsgFilter("patient")}
                  >
                    <User className="h-3 w-3" />{t("chat.filter_patient")}
                  </Button>
                  <Button
                    variant={msgFilter === "professional" ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs gap-1"
                    onClick={() => setMsgFilter("professional")}
                  >
                    <StethoscopeIcon className="h-3 w-3" />{t("chat.filter_professional")}
                  </Button>
                </div>
              )}
              {(msgFilter === "all" || msgFilter === "patient") && (
                <ConversationList mode="patient" initialConversationId={convFromUrl} searchQuery={msgSearch} />
              )}
              {professional && (msgFilter === "all" || msgFilter === "professional") && (
                <ConversationList mode="professional" professionalId={professional.id} initialConversationId={convFromUrl} searchQuery={msgSearch} />
              )}
            </TabsContent>
            <TabsContent value="agenda" className="space-y-6">
              <ProSchedule professionalId={professional.id} />
            </TabsContent>
            <TabsContent value="professional" className="space-y-8">
              <ProDashboard professional={professional} />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="health" className="gap-1.5"><Heart className="h-4 w-4" />{t("dashboard.tab_my_health")}</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 relative">
                <MessageCircle className="h-4 w-4" />{t("dashboard.tab_messages")}{unreadBadge}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="health" className="space-y-8">{renderClientContent()}</TabsContent>
            <TabsContent value="messages" className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />{t("chat.messages_title")}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder={t("chat.search_placeholder")}
                  className="pl-9 rounded-xl"
                />
              </div>
              <ConversationList mode="patient" initialConversationId={convFromUrl} searchQuery={msgSearch} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <OnboardingTour
        step={onboarding.step}
        currentStep={onboarding.currentStep}
        totalSteps={onboarding.totalSteps}
        isActive={onboarding.isActive}
        onNext={onboarding.next}
        onSkip={onboarding.skip}
      />
    </div>
  );
};

export default Dashboard;

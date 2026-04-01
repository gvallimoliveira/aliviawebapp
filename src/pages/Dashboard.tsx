import { useEffect, useState, useMemo } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PainDiary from "@/components/dashboard/PainDiary";
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
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Globe, HelpCircle, LogOut, Heart, Stethoscope, MessageCircle, Users,
} from "lucide-react";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const convFromUrl = searchParams.get("conv");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("health");
  const [unreadCount, setUnreadCount] = useState(0);

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
    supabase.functions.invoke("verify-payment", { body: { check_access: true } }).then(({ data, error }) => {
      setPremiumAccess(!error && !data?.error ? data : null);
      setPremiumLoading(false);
    }).catch(() => setPremiumLoading(false));
    (supabase.from("professionals" as any) as any).select("*").eq("user_id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) {
        if (data.is_partner && (data.crefito === "000000-X" || data.city === "A definir")) {
          navigate("/complete-profile", { replace: true });
          return;
        }
        setProfessional(data);
        (supabase.from("professional_referrals" as any) as any).select("*").eq("professional_id", data.id).order("created_at", { ascending: false }).then(({ data: refs }: any) => setReferrals(refs || []));
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

  const renderReferrals = () => (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        {t("prof.referrals_title")}
      </h2>
      <div className="space-y-2">
        {referrals.map((r: any) => (
          <Card key={r.id} className="border-border/60">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="text-sm text-foreground">{t("prof.referral_from_patient")}</div>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">{r.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderClientContent = () => (
    <>
      <UpgradeBanner premiumAccess={premiumAccess} premiumLoading={premiumLoading} push={push} />
      <QuickActions hasPremiumAccess={premiumAccess?.has_access} premiumLoading={premiumLoading} hasProfessional={!!professional} />
      <ReferralCard availableDiscount={premiumAccess?.available_discount} />

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
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="health" className="gap-1.5"><Heart className="h-4 w-4" />{t("dashboard.tab_my_health")}</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 relative">
                <MessageCircle className="h-4 w-4" />{t("dashboard.tab_messages")}{unreadBadge}
              </TabsTrigger>
              <TabsTrigger value="professional" className="gap-1.5" data-onboarding="pro-tab-trigger">
                <Stethoscope className="h-4 w-4" />{t("dashboard.tab_professional")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="health" className="space-y-8">{renderClientContent()}</TabsContent>
            <TabsContent value="messages" className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />{t("chat.messages_title")}
              </h2>
              <ConversationList mode="patient" initialConversationId={convFromUrl} />
              {professional && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-foreground mb-3">{t("dashboard.tab_professional")} — {t("chat.messages_title")}</h3>
                  <ConversationList mode="professional" professionalId={professional.id} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="professional" className="space-y-8">
              <ProDashboard professional={professional} />
              {referrals.length > 0 && renderReferrals()}
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
              <ConversationList mode="patient" initialConversationId={convFromUrl} />
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

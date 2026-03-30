import { useEffect, useState } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PainDiary from "@/components/dashboard/PainDiary";
import AssessmentComparison from "@/components/dashboard/AssessmentComparison";
import ReferralCard from "@/components/dashboard/ReferralCard";
import ProDashboard from "@/components/dashboard/ProDashboard";
import ConversationList from "@/components/chat/ConversationList";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import {
  Globe, HelpCircle, LogOut, Plus, ClipboardList, Calendar, MapPin, ChevronRight,
  Crown, Clock, CheckCircle2, Loader2, Activity, FileText, Sparkles, Users, UserPlus, Heart, Stethoscope, RotateCcw, MessageCircle
} from "lucide-react";
import { useMemo } from "react";

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

  // Only add diary step if user is a subscriber (not single purchase)
  if (subscriptionType !== "single") {
    steps.push({ targetId: "patient-diary", titleKey: "onboarding.patient.step3.title", descriptionKey: "onboarding.patient.step3.desc", position: "bottom" });
  }

  // Add pro steps for professionals
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

  const onboardingSteps = useMemo(
    () => buildOnboardingSteps(premiumAccess?.subscription_type, !!professional),
    [premiumAccess?.subscription_type, !!professional]
  );
  const onboarding = useOnboarding("onboarding_patient_completed", onboardingSteps);
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Set initial tab from URL
  useEffect(() => {
    if (tabFromUrl === "professional" && professional) {
      setActiveTab("professional");
    } else if (tabFromUrl === "messages") {
      setActiveTab("messages");
    }
  }, [tabFromUrl, professional]);

  // Auto-switch tab when onboarding reaches pro steps
  useEffect(() => {
    if (!onboarding.isActive || !onboarding.step) return;
    const proTargets = ["pro-link", "pro-patients", "pro-subscription"];
    if (proTargets.includes(onboarding.step.targetId)) {
      setActiveTab("professional");
    } else if (onboarding.step.targetId.startsWith("patient-")) {
      setActiveTab("health");
    }
  }, [onboarding.step, onboarding.isActive]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setProfile(data));

      supabase
        .from("assessments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setAssessments(data || []));

      supabase.functions
        .invoke("verify-payment", { body: { check_access: true } })
        .then(({ data, error }) => {
          if (error || data?.error) {
            setPremiumAccess(null);
          } else {
            setPremiumAccess(data);
          }
          setPremiumLoading(false);
        })
        .catch(() => setPremiumLoading(false));

      // Check if user is a professional
      (supabase.from("professionals" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            // Redirect partners with placeholder data to complete profile
            if (data.is_partner && (data.crefito === "000000-X" || data.city === "A definir")) {
              navigate("/complete-profile", { replace: true });
              return;
            }
            setProfessional(data);
            // Fetch referrals for this professional
            (supabase.from("professional_referrals" as any) as any)
              .select("*")
              .eq("professional_id", data.id)
              .order("created_at", { ascending: false })
              .then(({ data: refs }: any) => setReferrals(refs || []));
          } else if (tabFromUrl === "professional") {
            // First-time pro user: redirect to registration
            navigate("/professional/register", { replace: true });
          }
        });
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getExpirationDate = () => {
    if (!premiumAccess?.paid_at) return null;
    const expDate = new Date(premiumAccess.paid_at);
    expDate.setDate(expDate.getDate() + 7);
    return expDate;
  };

  const getDaysRemaining = () => {
    const exp = getExpirationDate();
    if (!exp) return 0;
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { label: t("dashboard.completed") || "Concluída", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle2 };
      case "diagnosis_complete":
        return { label: t("dashboard.diagnosis_done") || "Diagnóstico pronto", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Activity };
      default:
        return { label: t("dashboard.in_progress") || "Em andamento", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Loader2 };
    }
  };

  const painRegionLabels: Record<string, string> = {
    head: "Cabeça", neck: "Pescoço", right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
    upper_back: "Coluna Torácica", lower_back: "Lombar", chest: "Tórax",
    right_elbow: "Cotovelo D.", left_elbow: "Cotovelo E.",
    right_wrist: "Punho D.", left_wrist: "Punho E.",
    right_hip: "Quadril D.", left_hip: "Quadril E.",
    right_knee: "Joelho D.", left_knee: "Joelho E.",
    right_ankle: "Tornozelo D.", left_ankle: "Tornozelo E.",
    right_gluteal: "Glúteo D.", left_gluteal: "Glúteo E.",
    right_hamstring: "Posterior Coxa D.", left_hamstring: "Posterior Coxa E.",
    right_calf: "Panturrilha D.", left_calf: "Panturrilha E.",
  };

  const usedCount = premiumAccess?.assessments_used ?? 0;
  const maxCount = premiumAccess?.max_assessments ?? 2;
  const remaining = Math.max(0, maxCount - usedCount);
  const daysLeft = getDaysRemaining();

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
      {/* Premium Access Indicator */}
      {!premiumLoading && premiumAccess?.paid_at && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Premium
                    {premiumAccess.has_access ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] px-1.5">
                        {t("dashboard.active") || "Ativo"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5">
                        {t("dashboard.expired") || "Expirado"}
                      </Badge>
                    )}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {daysLeft > 0
                      ? `${daysLeft} ${daysLeft === 1 ? (t("dashboard.day_left") || "dia restante") : (t("dashboard.days_left") || "dias restantes")}`
                      : (t("dashboard.access_expired") || "Acesso expirado")}
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("dashboard.assessments_used") || "Avaliações utilizadas"}</span>
                  <span className="font-semibold text-foreground">{usedCount}/{maxCount}</span>
                </div>
                <Progress value={(usedCount / maxCount) * 100} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {remaining > 0
                    ? `${remaining} ${remaining === 1 ? (t("dashboard.assessment_remaining") || "avaliação restante") : (t("dashboard.assessments_remaining") || "avaliações restantes")}`
                    : (t("dashboard.no_assessments_remaining") || "Nenhuma avaliação restante neste período")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div data-onboarding="patient-assessments" className="grid gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => navigate("/assessment/basic")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {t("dashboard.new_basic")}
            </CardTitle>
            <CardDescription className="text-sm">{t("dashboard.new_basic_desc")}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer border-primary/20 hover:border-primary/50 hover:shadow-md transition-all group bg-primary/[0.03]" onClick={() => navigate("/assessment/premium")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              {t("dashboard.new_premium")}
            </CardTitle>
            <CardDescription className="text-sm">{t("dashboard.new_premium_desc")}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Find Professional / Register CTA */}
      <div data-onboarding="patient-find-pro" className="grid gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group relative" onClick={() => navigate("/professionals")}>
          {!premiumLoading && !premiumAccess?.has_access && (
            <Badge variant="outline" className="absolute top-3 right-3 bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {t("prof.find_professional")}
            </CardTitle>
            <CardDescription className="text-sm">{t("prof.cta_text")}</CardDescription>
          </CardHeader>
        </Card>
        {!professional && (
          <Card className="cursor-pointer border-border hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => navigate("/professional/register")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                  <UserPlus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {t("prof.register_cta")}
              </CardTitle>
              <CardDescription className="text-sm">{t("prof.register_cta_desc")}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Referral Card */}
      <ReferralCard availableDiscount={premiumAccess?.available_discount} />

      {/* Single Purchase Upgrade Banner */}
      {!premiumLoading && premiumAccess?.subscription_type === "single" && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed">
                  {t("dashboard.single_purchase_banner")}
                </p>
              </div>
              <Button onClick={() => navigate("/assessment/premium")} size="sm" className="gap-1.5 shrink-0">
                <Crown className="h-3.5 w-3.5" />
                {t("dashboard.upgrade_to_monthly")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pain Diary — only for subscribers */}
      {premiumAccess?.subscription_type !== "single" && (
        <div data-onboarding="patient-diary">
          <PainDiary />
        </div>
      )}

      {/* Before/After Comparison — only for subscribers */}
      {premiumAccess?.subscription_type !== "single" && (
        <AssessmentComparison assessments={assessments} />
      )}

      {/* Assessment History */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          {t("dashboard.history")}
        </h2>
        {assessments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("dashboard.no_assessments")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => {
              const statusConfig = getStatusConfig(a.status);
              const StatusIcon = statusConfig.icon;
              const hypothesis = a.diagnosis?.hypothesis;
              const regions = (a.pain_regions || [])
                .map((r: string) => painRegionLabels[r] || r)
                .slice(0, 3);
              const extraRegions = (a.pain_regions || []).length - 3;
              const isClickable = a.diagnosis || ["completed", "diagnosis_complete"].includes(a.status);

              return (
                <Card
                  key={a.id}
                  className={`hover:shadow-md transition-all border-border/60 hover:border-border group ${isClickable ? "cursor-pointer" : ""}`}
                  onClick={isClickable ? () => navigate(`/assessment/view/${a.id}`) : undefined}
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-2 py-0.5 ${
                                a.type === "premium"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-secondary text-secondary-foreground border-border"
                              }`}
                            >
                              {a.type === "premium" ? "Premium" : t("compare.basic")}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(a.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${statusConfig.color}`}>
                            <StatusIcon className={`h-3 w-3 ${a.status === "in_progress" ? "animate-spin" : ""}`} />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        {hypothesis && (
                          <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">{hypothesis}</p>
                        )}
                        {regions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            {regions.map((r: string, i: number) => (
                              <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{r}</span>
                            ))}
                            {extraRegions > 0 && <span className="text-xs text-muted-foreground">+{extraRegions}</span>}
                            {a.pain_score != null && (
                              <span className="text-xs text-muted-foreground ml-1">• Dor: {a.pain_score}/10</span>
                            )}
                          </div>
                        )}
                      </div>
                      {isClickable && (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
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
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} title={t("support.badge")}>
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8 px-4 space-y-8">
        {/* Welcome */}
        <div data-onboarding="patient-welcome" className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("dashboard.welcome")}{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
          </div>
          {!onboarding.isActive && (
            <Button variant="ghost" size="sm" onClick={onboarding.restart} className="gap-1.5 text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("onboarding.restart")}
            </Button>
          )}
        </div>

        {professional ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="health" className="gap-1.5">
                <Heart className="h-4 w-4" />
                {t("dashboard.tab_my_health")}
              </TabsTrigger>
              <TabsTrigger value="professional" className="gap-1.5" data-onboarding="pro-tab-trigger">
                <Stethoscope className="h-4 w-4" />
                {t("dashboard.tab_professional")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-8">
              {renderClientContent()}
            </TabsContent>

            <TabsContent value="professional" className="space-y-8">
              <ProDashboard professional={professional} />
              {referrals.length > 0 && renderReferrals()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-8">
            {renderClientContent()}
          </div>
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

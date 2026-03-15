import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  PRO_PLAN_PRICE_FORMATTED,
  PRO_LIFETIME_TREATMENT_PRICE_FORMATTED,
  PRO_LIFETIME_TREATMENT_ORIGINAL_FORMATTED,
} from "@/constants/pricing";
import { mockPatientAssessments } from "@/data/mockPatientData";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Stethoscope, Link2, Copy, Check, Loader2, CreditCard, Users,
  Calendar, MapPin, ChevronRight, Crown, Sparkles, Target, Clock, Settings,
  AlertTriangle, FileCheck, Lock, Activity, FileText, Zap, Gift, RotateCcw,
} from "lucide-react";
import PatientEvolutionDashboard from "./PatientEvolutionDashboard";
import ProAnalyticsCharts from "./ProAnalyticsCharts";
import { generateAssessmentPdf } from "@/utils/generatePdf";

interface ProDashboardProps {
  professional: any;
}

const proSteps: OnboardingStep[] = [
  { targetId: "pro-welcome", titleKey: "onboarding.pro.step1.title", descriptionKey: "onboarding.pro.step1.desc" },
  { targetId: "pro-link", titleKey: "onboarding.pro.step2.title", descriptionKey: "onboarding.pro.step2.desc", position: "bottom" },
  { targetId: "pro-patients", titleKey: "onboarding.pro.step3.title", descriptionKey: "onboarding.pro.step3.desc", position: "bottom" },
  { targetId: "pro-subscription", titleKey: "onboarding.pro.step4.title", descriptionKey: "onboarding.pro.step4.desc", position: "bottom" },
];

const ProDashboard = ({ professional }: ProDashboardProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState<{ subscribed: boolean; subscription_end?: string; is_partner?: boolean } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [patientAssessments, setPatientAssessments] = useState<any[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const proOnboarding = useOnboarding("onboarding_pro_completed", proSteps);

  useEffect(() => {
    checkSubscription();
    loadPatientAssessments();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-pro-subscription");
      if (error) throw error;
      setSubscription(data);
    } catch {
      setSubscription({ subscribed: false });
    } finally {
      setSubLoading(false);
    }
  };

  const loadPatientAssessments = async () => {
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("professional_id", professional.id)
      .order("created_at", { ascending: false });
    setPatientAssessments(data || []);
  };

  const handleSubscribe = async (plan: "monthly" | "annual" = "monthly") => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-subscription", {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o portal de assinatura.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLifetimeCheckout = async () => {
    setLifetimeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-lifetime-treatment");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
    } finally {
      setLifetimeLoading(false);
    }
  };

  // Check if professional registered within last 30 days for urgency pricing
  const isWithinFirstMonth = useMemo(() => {
    if (!professional?.created_at) return false;
    const created = new Date(professional.created_at);
    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }, [professional?.created_at]);

  const daysLeftForOffer = useMemo(() => {
    if (!professional?.created_at) return 0;
    const created = new Date(professional.created_at);
    const deadline = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [professional?.created_at]);

  const copyLink = () => {
    const link = `${window.location.origin}/assessment/professional/${professional.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({ title: t("referral.copied") });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleDownloadPdf = async (assessment: any) => {
    if (!assessment.diagnosis) return;
    try {
      const lang = document.documentElement.lang === "en" ? "en" : "pt";
      await generateAssessmentPdf({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: lang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
      });
      toast({ title: t("pro.download_pdf") });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const thisMonthCount = patientAssessments.filter((a) => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const painRegionLabels: Record<string, string> = {
    head: "Cabeça", neck: "Pescoço", right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
    upper_back: "Torácica", lower_back: "Lombar", right_knee: "Joelho D.", left_knee: "Joelho E.",
    right_hip: "Quadril D.", left_hip: "Quadril E.",
  };

  if (subLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Use mock data for demo when not subscribed
  const displayAssessments = subscription?.subscribed ? patientAssessments : mockPatientAssessments;
  const displayThisMonthCount = subscription?.subscribed ? thisMonthCount : 2;
  const displayTotalCount = subscription?.subscribed ? patientAssessments.length : mockPatientAssessments.length;

  const renderBlurOverlay = () => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
      <div className="text-center max-w-sm px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{t("pro.paywall_title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("pro.paywall_desc")}</p>
        <div className="text-2xl font-bold text-foreground mb-4">{PRO_PLAN_PRICE_FORMATTED}</div>
        <Button
          onClick={() => handleSubscribe()}
          disabled={checkoutLoading}
          className="w-full rounded-xl gap-2"
          size="lg"
        >
          {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {t("pro.subscribe_cta")}
        </Button>
      </div>
    </div>
  );

  // Paywall — professional not subscribed: show blurred preview
  if (!subscription?.subscribed) {
    return (
      <div className="space-y-6">
        {/* Demo badge */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-5 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              {t("pro.demo_notice")}
            </p>
          </CardContent>
        </Card>

        {/* Blurred Generate Link */}
        <div className="relative">
          <Card className="border-primary/20 opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                {t("pro.generate_link_title")}
              </CardTitle>
              <CardDescription className="text-sm">{t("pro.generate_link_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
                  {window.location.origin}/assessment/professional/seu-id
                </code>
                <Button variant="outline" className="gap-1.5 rounded-xl shrink-0" disabled>
                  <Copy className="h-4 w-4" />
                  {t("referral.copy_link")}
                </Button>
              </div>
            </CardContent>
          </Card>
          {renderBlurOverlay()}
        </div>

        {/* Stats with mock */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-foreground">{displayTotalCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("pro.total_assessments")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">{displayThisMonthCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("pro.this_month")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts (demo) */}
        <div className="opacity-60">
          <ProAnalyticsCharts assessments={displayAssessments} />
        </div>

        {/* Blurred patient list & dashboard */}
        <div className="relative min-h-[300px]">
          <Tabs defaultValue="assessments" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="assessments" className="gap-1.5">
                <Users className="h-4 w-4" />
                {t("pro.patient_assessments")}
              </TabsTrigger>
              <TabsTrigger value="evolution" className="gap-1.5">
                <Activity className="h-4 w-4" />
                {t("pro.patients_title")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assessments">
              <div className="space-y-2 opacity-60">
                {displayAssessments.map((a: any) => {
                  const regions = (a.pain_regions || []).map((r: string) => painRegionLabels[r] || r).slice(0, 3);
                  return (
                    <Card key={a.id} className="border-border/60">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{a.patient_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                              {a.pain_score != null && <span>• Dor: {a.pain_score}/10</span>}
                            </div>
                            {a.diagnosis?.hypothesis && (
                              <p className="text-sm font-medium text-foreground line-clamp-1">{a.diagnosis.hypothesis}</p>
                            )}
                            {regions.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                {regions.map((r: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full">{r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="evolution">
              <div className="opacity-60">
                <PatientEvolutionDashboard
                  assessments={displayAssessments as any}
                  professionalId={professional.id}
                />
              </div>
            </TabsContent>
          </Tabs>
          {renderBlurOverlay()}
        </div>
      </div>
    );
  }

  // Active subscriber dashboard
  return (
    <div className="space-y-6">
      {/* Status bar */}
      <Card className="border-emerald-200 bg-emerald-500/5">
        <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Crown className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                {t("pro.plan_title")}
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                  {subscription?.is_partner ? t("pro.badge_partner") : t("dashboard.active")}
                </Badge>
              </p>
              {!subscription?.is_partner && subscription?.subscription_end && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("pro.renews")} {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate("/professional/register")} className="gap-1.5 rounded-xl">
              <Settings className="h-3.5 w-3.5" />
              {t("pro.edit_profile")}
            </Button>
            {!subscription?.is_partner && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="gap-1.5 rounded-xl">
                {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                {t("pro.manage_subscription")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lifetime Treatment Upsell — only for non-lifetime pros */}
      {!professional.lifetime_treatment && (isWithinFirstMonth ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground">{t("pro_lifetime.upsell_title")}</h3>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
                      <Gift className="h-3 w-3" />
                      {t("pro_lifetime.limited_offer")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("pro_lifetime.upsell_desc")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-foreground">{PRO_LIFETIME_TREATMENT_PRICE_FORMATTED}</span>
                  <span className="text-sm text-muted-foreground line-through">{PRO_LIFETIME_TREATMENT_ORIGINAL_FORMATTED}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {t("pro_lifetime.days_left").replace("{days}", String(daysLeftForOffer))}
                </div>
                <Button
                  onClick={handleLifetimeCheckout}
                  disabled={lifetimeLoading}
                  className="w-full sm:w-auto rounded-xl gap-2"
                >
                  {lifetimeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {t("pro_lifetime.buy_cta")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm">{t("pro_lifetime.upsell_title")}</h3>
              <p className="text-xs text-muted-foreground">{t("pro_lifetime.upsell_desc_regular")}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-bold text-foreground">{PRO_LIFETIME_TREATMENT_ORIGINAL_FORMATTED}</span>
            </div>
            <Button
              onClick={handleLifetimeCheckout}
              disabled={lifetimeLoading}
              size="sm"
              className="rounded-xl gap-1.5 shrink-0"
            >
              {lifetimeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {t("pro_lifetime.buy_cta")}
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Generate Link */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {t("pro.generate_link_title")}
          </CardTitle>
          <CardDescription className="text-sm">{t("pro.generate_link_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
              {window.location.origin}/assessment/professional/{professional.id}
            </code>
            <Button onClick={copyLink} variant="outline" className="gap-1.5 rounded-xl shrink-0">
              {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? t("referral.copied") : t("referral.copy_link")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">{patientAssessments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pro.total_assessments")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{thisMonthCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pro.this_month")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <ProAnalyticsCharts assessments={patientAssessments} />

      {/* Patient list grouped by email */}
      <PatientEvolutionDashboard
        assessments={patientAssessments}
        professionalId={professional.id}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
};

export default ProDashboard;

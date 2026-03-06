import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  AlertTriangle, FileCheck, Lock, Activity, FileText, Zap, Gift,
} from "lucide-react";
import PatientEvolutionDashboard from "./PatientEvolutionDashboard";
import { generateAssessmentPdf } from "@/utils/generatePdf";

interface ProDashboardProps {
  professional: any;
}

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

      {/* Stats */}
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

      {/* Tabs: Assessments vs Evolution */}
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
          {/* Patient Assessment List */}
          <div>
            {patientAssessments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("pro.no_patient_assessments")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {patientAssessments.map((a) => {
                  const regions = (a.pain_regions || []).map((r: string) => painRegionLabels[r] || r).slice(0, 3);
                  const hypothesis = a.diagnosis?.hypothesis;
                  const isRedFlagged = a.status === "red_flagged" || (a as any).red_flags != null;
                  const redFlagItems = (a as any).red_flags
                    ? Object.entries((a as any).red_flags).filter(([, v]) => v === true).map(([k]) => k)
                    : [];
                  return (
                    <Card
                      key={a.id}
                      className={`cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-border group ${isRedFlagged ? "border-destructive/30" : ""}`}
                      onClick={() => navigate(`/assessment/view/${a.id}`)}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">
                                {(a as any).patient_name || t("pro.anonymous_patient")}
                              </p>
                              {isRedFlagged && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("pro.redflag_badge")}
                                </Badge>
                              )}
                              {!isRedFlagged && a.diagnosis && !a.treatment_plan && (
                                <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-200">
                                  <Lock className="h-3 w-3" />
                                  {t("pro_treatment.badge_available")}
                                </Badge>
                              )}
                              {a.treatment_plan && (
                                <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                  <FileCheck className="h-3 w-3" />
                                  {t("pro_treatment.badge_unlocked")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                              {a.pain_score != null && <span>• Dor: {a.pain_score}/10</span>}
                              {isRedFlagged && !hypothesis && (
                                <span className="text-destructive font-medium">• {t("pro.redflag_status")}</span>
                              )}
                            </div>
                            {hypothesis && (
                              <p className="text-sm font-medium text-foreground line-clamp-1">{hypothesis}</p>
                            )}
                            {isRedFlagged && redFlagItems.length > 0 && (
                              <div className="flex items-start gap-1 flex-wrap text-[10px] text-destructive">
                                {redFlagItems.slice(0, 3).map((key: string, i: number) => (
                                  <span key={i} className="bg-destructive/10 px-1.5 py-0.5 rounded-full">{t(key)}</span>
                                ))}
                                {redFlagItems.length > 3 && (
                                  <span className="bg-destructive/10 px-1.5 py-0.5 rounded-full">+{redFlagItems.length - 3}</span>
                                )}
                              </div>
                            )}
                            {regions.length > 0 && !isRedFlagged && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                {regions.map((r: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full">{r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {a.diagnosis && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={t("pro.download_pdf")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPdf(a);
                                }}
                              >
                                <FileText className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="evolution">
          <PatientEvolutionDashboard
            assessments={patientAssessments}
            professionalId={professional.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProDashboard;

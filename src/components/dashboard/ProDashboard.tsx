import { useState, useEffect, useMemo } from "react";
import AddPatientModal from "./AddPatientModal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PRO_PLAN_PRICE_FORMATTED,
  PRO_PLAN_ANNUAL_PRICE_FORMATTED,
  PRO_PLAN_ANNUAL_TOTAL,
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
import { Switch } from "@/components/ui/switch";
import {
  Stethoscope, Link2, Copy, Check, Loader2, CreditCard, Users,
  Calendar, MapPin, ChevronRight, Crown, Sparkles, Target, Clock, Settings,
  AlertTriangle, FileCheck, Lock, Activity, FileText, Zap, Gift, Share2,
  MessageCircle, CheckCircle, XCircle, UserCheck, Play, ToggleLeft,
} from "lucide-react";
import PatientEvolutionDashboard from "./PatientEvolutionDashboard";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import ProAnalyticsCharts from "./ProAnalyticsCharts";
import ProScheduleCard from "./ProScheduleCard";
import ClinicVolumeAlert from "./ClinicVolumeAlert";
import SoloUpgradeBanner from "./SoloUpgradeBanner";
import { generateAssessmentPdf, generateAssessmentPdfBlob } from "@/utils/generatePdf";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

interface ProDashboardProps {
  professional: any;
  hideForClinicTabs?: boolean;
  isSimulated?: boolean;
  onSimulatedChange?: (val: boolean) => void;
}

const ProDashboard = ({ professional, hideForClinicTabs = false, isSimulated: isSimulatedProp, onSimulatedChange }: ProDashboardProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeClinic, isClinicMode } = useClinic();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subscription, setSubscription] = useState<{ subscribed: boolean; subscription_end?: string; is_partner?: boolean } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [patientAssessments, setPatientAssessments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralProfiles, setReferralProfiles] = useState<Record<string, string>>({});
  const [referralActionLoading, setReferralActionLoading] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isSimulatedInternal, setIsSimulatedInternal] = useState(false);
  const isSimulated = isSimulatedProp !== undefined ? isSimulatedProp : isSimulatedInternal;
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const setIsSimulated = (val: boolean) => {
    if (onSimulatedChange) onSimulatedChange(val);
    else setIsSimulatedInternal(val);
  };
  const [billingAnnual, setBillingAnnual] = useState(true);

  // Welcome card for new subscribers
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem("pro_onboarding_completed") !== "true";
  });

  // Check if this is a new registration requiring subscription
  const isSubscribeFlow = searchParams.get("subscribe") === "true";

  useEffect(() => {
    checkSubscription();
    loadPatientAssessments();
    loadReferrals();
  }, [isClinicMode, activeClinic?.clinic_id]);

  // Realtime: auto-refresh patient assessments on changes
  useEffect(() => {
    if (isSimulated || !professional?.id) return;
    const channel = supabase
      .channel(`pro-assessments-${professional.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessments", filter: `professional_id=eq.${professional.id}` },
        () => { loadPatientAssessments(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [professional?.id, isSimulated]);

  // Realtime for clinic assessments
  useEffect(() => {
    if (isSimulated || !isClinicMode || !activeClinic?.clinic_id) return;
    const channel = supabase
      .channel(`clinic-assessments-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessments", filter: `clinic_id=eq.${activeClinic.clinic_id}` },
        () => { loadPatientAssessments(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeClinic?.clinic_id, isClinicMode, isSimulated]);

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
    // Load assessments linked to this professional
    const { data: proData } = await supabase
      .from("assessments")
      .select("*")
      .eq("professional_id", professional.id)
      .order("created_at", { ascending: false });

    // Also load clinic assessments (professional_id may be null) when in clinic mode
    let clinicData: any[] = [];
    if (isClinicMode && activeClinic?.clinic_id) {
      const { data: cData } = await supabase
        .from("assessments")
        .select("*")
        .eq("clinic_id", activeClinic.clinic_id)
        .order("created_at", { ascending: false });
      clinicData = cData || [];
    }

    // Merge and deduplicate by id
    const merged = [...(proData || [])];
    const existingIds = new Set(merged.map((a) => a.id));
    for (const ca of clinicData) {
      if (!existingIds.has(ca.id)) {
        merged.push(ca);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setPatientAssessments(merged);
  };

  const loadReferrals = async () => {
    const { data: refs } = await (supabase.from("professional_referrals" as any) as any)
      .select("*")
      .eq("professional_id", professional.id)
      .order("created_at", { ascending: false });
    if (!refs || refs.length === 0) { setReferrals([]); return; }
    setReferrals(refs);
    const userIds: string[] = Array.from(new Set(refs.map((r: any) => String(r.patient_user_id))));
    const profiles: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", uid)
        .maybeSingle();
      if (profile?.full_name) profiles[uid] = profile.full_name;
    }
    setReferralProfiles(profiles);
  };

  const handleReferralAction = async (referralId: string, status: "accepted" | "declined") => {
    setReferralActionLoading(referralId);
    try {
      await (supabase.from("professional_referrals" as any) as any)
        .update({ status })
        .eq("id", referralId);
      setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, status } : r));
      toast({ title: status === "accepted" ? t("prof.referral_accepted") : t("prof.referral_declined") });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setReferralActionLoading(null);
    }
  };

  const handleReferralMessage = async (patientUserId: string) => {
    try {
      const { data, error } = await supabase.rpc("create_conversation_for_referral" as any, {
        _professional_id: professional.id,
        _patient_user_id: patientUserId,
      });
      if (error) throw error;
      navigate(`/dashboard?tab=messages&conv=${data}`);
    } catch (err) {
      console.error("Error creating conversation:", err);
      toast({ title: t("prof.referral_message_error"), variant: "destructive" });
    }
  };

  const handleSubscribe = async (plan: "monthly" | "annual" = "monthly") => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-subscription", {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
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
      if (data?.url) window.location.href = data.url;
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
      if (data?.url) window.location.href = data.url;
    } catch {
      toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
    } finally {
      setLifetimeLoading(false);
    }
  };

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
    const link = `${getPublicOrigin()}/assessment/professional/${professional.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({ title: t("referral.copied") });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleDownloadPdf = async (assessment: any) => {
    if (isSimulated) {
      toast({ title: "📋 Disponível apenas com dados reais", description: "No modo simulado, a geração de PDF é demonstrativa." });
      return;
    }
    if (!assessment.diagnosis) return;
    try {
      const lang = document.documentElement.lang === "en" ? "en" : "pt";
      let proNote: string | undefined;
      if (professional?.id) {
        const { data } = await supabase
          .from("professional_notes")
          .select("content, include_in_pdf")
          .eq("professional_id", professional.id)
          .eq("assessment_id", assessment.id)
          .maybeSingle();
        if (data?.content && (data as any).include_in_pdf) proNote = data.content;
      }
      await generateAssessmentPdf({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: lang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
        professionalNotes: proNote,
        professionalLogoUrl: professional?.logo_url || undefined,
        clinicLogoUrl: isClinicMode && activeClinic?.logo_url ? activeClinic.logo_url : undefined,
        clinicName: isClinicMode && activeClinic?.clinic_name ? activeClinic.clinic_name : undefined,
      });
      toast({ title: t("pro.download_pdf") });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = async (assessment: any) => {
    if (isSimulated) {
      toast({ title: "📋 Disponível apenas com dados reais", description: "No modo simulado, o compartilhamento é demonstrativo." });
      return;
    }
    if (!assessment.diagnosis) return;
    try {
      const lang = document.documentElement.lang === "en" ? "en" : "pt";
      let proNote: string | undefined;
      if (professional?.id) {
        const { data } = await supabase
          .from("professional_notes")
          .select("content, include_in_pdf")
          .eq("professional_id", professional.id)
          .eq("assessment_id", assessment.id)
          .maybeSingle();
        if (data?.content && (data as any).include_in_pdf) proNote = data.content;
      }
      const pdfBlob = await generateAssessmentPdfBlob({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: lang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
        professionalNotes: proNote,
        professionalLogoUrl: professional?.logo_url || undefined,
        clinicLogoUrl: isClinicMode && activeClinic?.logo_url ? activeClinic.logo_url : undefined,
        clinicName: isClinicMode && activeClinic?.clinic_name ? activeClinic.clinic_name : undefined,
      });
      const filePath = `${assessment.id}_pro_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("assessment-reports")
        .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });
      
      let pdfUrl = "";
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("assessment-reports")
          .getPublicUrl(filePath);
        pdfUrl = urlData.publicUrl;
      } else {
        console.warn("PDF upload failed, falling back to local download:", uploadError);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AliviA_Relatorio_Profissional.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      const origin = getPublicOrigin();
      const patientLabel = assessment.patient_name || "Paciente";
      const pdfLine = pdfUrl ? `\n\n📄 Relatório em PDF:\n${pdfUrl}` : "";
      const text = `🩺 *Aliv.iA — Relatório Profissional*\n\n👤 *Paciente:* ${patientLabel}\n📋 *Hipótese:* ${assessment.diagnosis.hypothesis}${pdfLine}\n\n💡 ${origin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } catch {
      toast({ title: "Erro ao compartilhar PDF", variant: "destructive" });
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

  // In clinic mode with active/trialing clinic subscription, skip personal subscription gate
  const clinicCoversAccess = isClinicMode && activeClinic &&
    (activeClinic.subscription_status === "active" || activeClinic.subscription_status === "trialing");

  // ── Plan Selection Screen (mandatory for new registrants without subscription) ──
  if (!clinicCoversAccess && !subscription?.subscribed && (isSubscribeFlow || professional.subscription_status === "inactive")) {
    return (
      <div className="space-y-6 max-w-lg mx-auto py-4">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Escolha seu plano</h2>
          <p className="text-sm text-muted-foreground">
            Para acessar o painel profissional com pacientes reais, escolha uma assinatura.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Mensal</span>
          <Switch checked={billingAnnual} onCheckedChange={setBillingAnnual} />
          <span className={`text-sm font-medium ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Anual
            <Badge variant="outline" className="ml-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
              -31%
            </Badge>
          </span>
        </div>

        {/* Plan card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <CardContent className="py-6 space-y-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">Plano Profissional</p>
              <p className="text-4xl font-bold text-foreground">
                {billingAnnual ? PRO_PLAN_ANNUAL_PRICE_FORMATTED : PRO_PLAN_PRICE_FORMATTED}
              </p>
              {billingAnnual && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cobrado R$ {PRO_PLAN_ANNUAL_TOTAL}/ano • ~R$ 2,30/dia
                </p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {[
                "Link de triagem personalizado",
                "Painel completo de pacientes",
                "Diagnóstico e impressão clínica com IA",
                "Relatórios evolutivos em PDF",
                "Programas de exercícios (HEP)",
                "Marketplace de profissionais",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-foreground">{feat}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => handleSubscribe(billingAnnual ? "annual" : "monthly")}
              disabled={checkoutLoading}
              className="w-full rounded-xl gap-2"
              size="lg"
            >
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {billingAnnual ? "Assinar plano anual" : "Assinar plano mensal"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Decide which data to show based on toggle
  const showingSimulated = isSimulated || (!subscription?.subscribed && !clinicCoversAccess);
  const displayAssessments = showingSimulated ? mockPatientAssessments : patientAssessments;
  const displayThisMonthCount = showingSimulated ? 2 : thisMonthCount;
  const displayTotalCount = showingSimulated ? mockPatientAssessments.length : patientAssessments.length;

  // ── Welcome card handler ──
  const handleStartSimulated = () => {
    setIsSimulated(true);
    setShowWelcome(false);
    localStorage.setItem("pro_onboarding_completed", "true");
  };

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("pro_onboarding_completed", "true");
  };

  // Active subscriber dashboard
  return (
    <div className="space-y-6">
      {/* Solo upgrade banner — therapist without own Pro subscription */}
      {!isClinicMode && (
        <SoloUpgradeBanner hasActiveProSubscription={professional.subscription_status === "active"} />
      )}

      {/* Clinic volume alert — only for owner in clinic mode */}
      {isClinicMode && activeClinic && (
        <ClinicVolumeAlert clinicId={activeClinic.clinic_id} />
      )}
      {/* Welcome card for new subscribers */}
      {showWelcome && subscription?.subscribed && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="py-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-foreground">Bem-vindo ao Painel Profissional! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  Sua assinatura está ativa. Como você ainda não tem pacientes cadastrados, que tal conhecer o ambiente com dados simulados?
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Button onClick={handleStartSimulated} className="rounded-xl gap-2">
                    <Play className="h-4 w-4" />
                    Conhecer ambiente simulado
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDismissWelcome}>
                    Pular
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status bar */}
      <Card data-onboarding="pro-welcome" className="border-emerald-200 bg-emerald-500/5">
        <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Crown className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                {clinicCoversAccess ? `Aliv.iA Clinic — ${activeClinic?.clinic_name}` : t("pro.plan_title")}
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                  {clinicCoversAccess
                    ? (activeClinic?.subscription_status === "trialing" ? "Trial" : t("dashboard.active"))
                    : subscription?.is_partner ? t("pro.badge_partner") : t("dashboard.active")}
                </Badge>
              </p>
              {!clinicCoversAccess && !subscription?.is_partner && subscription?.subscription_end && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("pro.renews")} {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Simulated toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {isSimulated ? "Painel Simulado" : "Painel Pro"}
              </span>
              <Switch
                checked={isSimulated}
                onCheckedChange={setIsSimulated}
                className="scale-90"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/professional/register")} className="gap-1.5 rounded-xl">
              <Settings className="h-3.5 w-3.5" />
              {t("pro.edit_profile")}
            </Button>
            {!clinicCoversAccess && !subscription?.is_partner && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="gap-1.5 rounded-xl">
                {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                {t("pro.manage_subscription")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Simulated mode banner */}
      {isSimulated && (
        <Card className="border-amber-200 bg-amber-500/5">
          <CardContent className="py-3 px-5 flex items-center gap-3">
            <ToggleLeft className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Modo simulado ativo.</span> Você está visualizando dados fictícios para conhecer a plataforma. Desative o toggle para ver seus dados reais.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lifetime Treatment Upsell — only for non-lifetime pros, not in clinic mode */}
      {!isSimulated && !clinicCoversAccess && !professional.lifetime_treatment && (isWithinFirstMonth ? (
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

      {/* Generate Link — hidden when in clinic tab layout (has own tab) */}
      {!isSimulated && !hideForClinicTabs && (
        <Card data-onboarding="pro-link" className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              {isClinicMode ? "Link de pré-avaliação da clínica" : t("pro.generate_link_title")}
            </CardTitle>
            <CardDescription className="text-sm">
              {isClinicMode
                ? "Compartilhe este link com pacientes da clínica. As avaliações ficarão visíveis para toda a equipe."
                : t("pro.generate_link_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
                {isClinicMode && activeClinic
                  ? `${getPublicOrigin()}/assessment/clinic/${activeClinic.clinic_id}`
                  : `${getPublicOrigin()}/assessment/professional/${professional.id}`}
              </code>
              <Button onClick={() => {
                const link = isClinicMode && activeClinic
                  ? `${getPublicOrigin()}/assessment/clinic/${activeClinic.clinic_id}`
                  : `${getPublicOrigin()}/assessment/professional/${professional.id}`;
                navigator.clipboard.writeText(link);
                setLinkCopied(true);
                toast({ title: t("referral.copied") });
                setTimeout(() => setLinkCopied(false), 2000);
              }} variant="outline" className="gap-1.5 rounded-xl shrink-0">
                {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {linkCopied ? t("referral.copied") : t("referral.copy_link")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Card — hidden when in clinic tab layout (has own tab) */}
      {!isSimulated && !hideForClinicTabs && (
        <ProScheduleCard
          professionalId={professional.id}
          onNavigateToSchedule={() => navigate("/dashboard?tab=agenda")}
        />
      )}

      {/* Stats Cards */}
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

      {/* Analytics Charts */}
      <ProAnalyticsCharts assessments={displayAssessments} />

      {/* Referrals Section — only in real mode */}
      {!isSimulated && referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              {t("prof.referrals_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {referrals.map((r: any) => {
              const patientName = referralProfiles[r.patient_user_id] || t("prof.referral_from_patient");
              const date = new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
              const isPending = r.status === "pending";
              const isAccepted = r.status === "accepted";
              const statusBadge = isPending
                ? <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-yellow-300 text-yellow-700 bg-yellow-50">{t("prof.referral_status_pending")}</Badge>
                : isAccepted
                ? <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-300 text-emerald-700 bg-emerald-50">{t("prof.referral_status_accepted")}</Badge>
                : <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-300 text-red-600 bg-red-50">{t("prof.referral_status_declined")}</Badge>;

              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{patientName}</span>
                      {statusBadge}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 rounded-lg gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          disabled={referralActionLoading === r.id}
                          onClick={() => handleReferralAction(r.id, "accepted")}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">{t("prof.referral_accept")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 rounded-lg gap-1 text-red-500 border-red-200 hover:bg-red-50"
                          disabled={referralActionLoading === r.id}
                          onClick={() => handleReferralAction(r.id, "declined")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">{t("prof.referral_decline")}</span>
                        </Button>
                      </>
                    )}
                    {(isPending || isAccepted) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 rounded-lg gap-1"
                        onClick={() => handleReferralMessage(r.patient_user_id)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">{t("prof.referral_send_message")}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Patient list grouped by email */}
      <div data-onboarding="pro-patients">
        {!showingSimulated && (
          <div className="flex justify-end mb-3">
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setAddPatientOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {language === "pt" ? "Adicionar paciente" : "Add patient"}
            </Button>
          </div>
        )}
        <DashboardErrorBoundary>
          <PatientEvolutionDashboard
            assessments={displayAssessments as any}
            professionalId={professional.id}
            lifetimeTreatment={professional.lifetime_treatment || (isClinicMode && (activeClinic?.subscription_status === 'active' || activeClinic?.subscription_status === 'trialing'))}
            professionalLogoUrl={professional.logo_url}
            clinicLogoUrl={isClinicMode && activeClinic?.logo_url ? activeClinic.logo_url : undefined}
            clinicName={isClinicMode && activeClinic?.clinic_name ? activeClinic.clinic_name : undefined}
            clinicId={isClinicMode ? activeClinic?.clinic_id : undefined}
            onDownloadPdf={handleDownloadPdf}
            onShareWhatsApp={handleShareWhatsApp}
            isDemo={showingSimulated}
          />
        </DashboardErrorBoundary>
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal
        open={addPatientOpen}
        onOpenChange={setAddPatientOpen}
        professionalId={professional.id}
        clinicId={isClinicMode ? activeClinic?.clinic_id : undefined}
        onAdded={() => loadPatientAssessments()}
      />

    </div>
  );
};

export default ProDashboard;

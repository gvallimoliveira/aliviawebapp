import RegistrationRequiredDialog, { goToRegistration } from "@/components/dashboard/RegistrationRequiredDialog";
import { careScope } from "@/lib/careScope";
import BlogPillCard from "@/components/dashboard/BlogPillCard";
import PhysioTechShortcut from "@/components/PhysioTechShortcut";
import { useState, useEffect, useMemo, useRef } from "react";
import AddPatientModal from "./AddPatientModal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { isFallbackVip } from "@/lib/vipEmails";
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
import { ENABLE_LIFETIME_TREATMENT_PURCHASE } from "@/lib/featureFlags";
import { mockPatientAssessments } from "@/data/mockPatientData";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Stethoscope, Link2, Copy, Check, Loader2, CreditCard, Users, Plus,
  Calendar, MapPin, ChevronRight, Crown, Sparkles, Target, Clock, Settings,
  AlertTriangle, FileCheck, Lock, Activity, FileText, Zap, Gift, Share2,
  MessageCircle, CheckCircle, XCircle, UserCheck, Play, ToggleLeft,
  Smartphone, GraduationCap,
} from "lucide-react";
import PatientEvolutionDashboard from "./PatientEvolutionDashboard";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
// ProAnalyticsCharts moved to the Insights tab (see ProMetricsSection).
import ProScheduleCard from "./ProScheduleCard";
import ClinicVolumeAlert from "./ClinicVolumeAlert";
import SoloUpgradeBanner from "./SoloUpgradeBanner";
import ExportDataCard from "./ExportDataCard";
import ImportDataCard from "./ImportDataCard";
import { generateAssessmentPdf, generateAssessmentPdfBlob } from "@/utils/generatePdf";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

import { format } from "date-fns";
import { ChevronDown, ChevronUp, FileArchive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InstallAppGuide from "@/components/InstallAppGuide";

const PendingReviewAlert = ({ assessments, language, navigate, onMarkReviewed }: { assessments: any[]; language: string; navigate: any; onMarkReviewed: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const isPt = language === "pt";
  return (
    <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 px-4 hover:bg-amber-500/10 transition-colors"
      >
        <FileCheck className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-xs text-muted-foreground flex-1 text-left">
          <span className="font-semibold text-amber-700">
            {assessments.length} {isPt ? "nova(s) avaliação(ões)" : "new assessment(s)"}
          </span>{" "}
          <span className="text-[11px]">
            {isPt ? "— pendentes de revisão" : "— pending review"}
          </span>
        </p>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-amber-500/20 divide-y divide-amber-500/10">
          {assessments.map((a: any) => (
            <div
              key={a.id}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-amber-500/10 transition-colors"
            >
              <button
                onClick={() => navigate(`/assessment/view/${a.id}?from=professional`)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {a.patient_name || a.patient_email || (isPt ? "Paciente anônimo" : "Anonymous patient")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </button>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] shrink-0 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 h-7 px-2 gap-1"
                onClick={(e) => { e.stopPropagation(); onMarkReviewed(a.id); }}
              >
                <CheckCircle className="h-3 w-3" />
                {isPt ? "Revisada" : "Reviewed"}
              </Button>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer"
                onClick={() => navigate(`/assessment/view/${a.id}?from=professional`)}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

interface ProDashboardProps {
  professional: any;
  hideForClinicTabs?: boolean;
  isSimulated?: boolean;
  onSimulatedChange?: (val: boolean) => void;
  /** When true, renders a clearly-labelled demo experience for clinic
   *  therapists without their own PRO profile. Hides real-account
   *  controls (manage subscription, edit profile, plan gate, upsells)
   *  and shows a single conversion CTA. */
  isDemoMode?: boolean;
}

const ProDashboard = ({ professional, hideForClinicTabs = false, isSimulated: isSimulatedProp, onSimulatedChange, isDemoMode = false }: ProDashboardProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { activeClinic, isClinicMode, canManageClinic } = useClinic();
  // In clinic mode, restrict analytics/feedback/reports to owner & secretary only
  const canViewClinicAnalytics = !isClinicMode || canManageClinic;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  

  const [subscription, setSubscription] = useState<{ subscribed: boolean; subscription_end?: string; is_partner?: boolean; is_academic_partner?: boolean; is_student?: boolean; is_vip?: boolean } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [patientAssessments, setPatientAssessments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralProfiles, setReferralProfiles] = useState<Record<string, string>>({});
  const [referralActionLoading, setReferralActionLoading] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  
  const [isSimulatedInternal, setIsSimulatedInternal] = useState(false);
  const isSimulated = isSimulatedProp !== undefined ? isSimulatedProp : isSimulatedInternal;
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [patientDetailOpen, setPatientDetailOpen] = useState(false);
  // metricsCollapsed removed: metrics now live in the Insights tab.
  const [clinicTherapists, setClinicTherapists] = useState<any[]>([]);
  const [assignTargetByAssessment, setAssignTargetByAssessment] = useState<Record<string, string>>({});
  const [assigningAssessmentId, setAssigningAssessmentId] = useState<string | null>(null);
  const setIsSimulated = (val: boolean) => {
    if (onSimulatedChange) onSimulatedChange(val);
    else setIsSimulatedInternal(val);
  };
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

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
  }, [isClinicMode, activeClinic?.clinic_id, professional.id]);

  // Debounce realtime refetches to avoid storms when multiple therapists
  // update assessments at the same time (clinic with 5+ active fisios).
  const assessmentRequest = useRef(0);
  const realtimeRefetchTimer = useRef<number | null>(null);
  const scheduleRealtimeRefetch = () => {
    if (realtimeRefetchTimer.current) {
      window.clearTimeout(realtimeRefetchTimer.current);
    }
    realtimeRefetchTimer.current = window.setTimeout(() => {
      loadPatientAssessments({ keepCurrent: true });
      realtimeRefetchTimer.current = null;
    }, 1500);
  };

  // Realtime: auto-refresh patient assessments on changes
  useEffect(() => {
    if (isSimulated || !professional?.id) return;
    const channel = supabase
      .channel(`pro-assessments-${professional.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessments", filter: `professional_id=eq.${professional.id}` },
        () => { scheduleRealtimeRefetch(); }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (realtimeRefetchTimer.current) {
        window.clearTimeout(realtimeRefetchTimer.current);
        realtimeRefetchTimer.current = null;
      }
    };
  }, [professional?.id, isSimulated]);

  // Realtime for clinic assessments
  useEffect(() => {
    if (isSimulated || !isClinicMode || !activeClinic?.clinic_id) return;
    const channel = supabase
      .channel(`clinic-assessments-${activeClinic.clinic_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessments", filter: `clinic_id=eq.${activeClinic.clinic_id}` },
        () => { scheduleRealtimeRefetch(); }
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

  // Explicit slim-but-complete column list. Excludes `pending_upgrade_data`
  // (large jsonb snapshot only used at upgrade-time, never read by the dashboard).
  // Hard limit of 500 newest rows per query keeps payload bounded for clinics
  // with thousands of historical assessments — pagination is a safer next step.
  const ASSESSMENT_COLUMNS =
    "id, user_id, professional_id, clinic_id, type, status, payment_status, " +
    "patient_name, patient_email, pain_score, pain_regions, anamnesis_data, " +
    "test_results, diagnosis, treatment_plan, red_flags, final_hypothesis, " +
    "final_hypothesis_by, final_hypothesis_at, original_assessment_id, redo_used, " +
    "pain_mechanism, reviewed_at, archived_at, paid_at, created_at, updated_at";

  const loadPatientAssessments = async (opts?: { keepCurrent?: boolean }) => {
    const request = ++assessmentRequest.current;
    // Só limpa ao trocar de escopo; recargas em tempo real mantêm o prontuário
    // aberto montado (limpar aqui desmontava o prontuário e voltava ao topo).
    if (!opts?.keepCurrent) setPatientAssessments([]);
    // One selected practice, never a union of solo and clinic records.
    const { data: proData } = await careScope(supabase
      .from("assessments")
      .select(ASSESSMENT_COLUMNS), isClinicMode ? activeClinic?.clinic_id : null, professional.id)
      .order("created_at", { ascending: false })
      .limit(500);

    const merged: any[] = (proData as any[]) || [];
    merged.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (request === assessmentRequest.current) setPatientAssessments(merged);
  };

  // Load clinic therapists (for assignment dropdown) when in clinic mode
  useEffect(() => {
    if (!isClinicMode || !activeClinic?.clinic_id) {
      setClinicTherapists([]);
      return;
    }
    const loadTherapists = async () => {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("user_id, role")
        .eq("clinic_id", activeClinic.clinic_id)
        .eq("status", "active")
        .in("role", ["owner", "therapist", "osteopath", "pilates_instructor", "doctor", "rpg_specialist", "massage_therapist"]);
      if (!members || members.length === 0) { setClinicTherapists([]); return; }
      const userIds = members.map((m: any) => m.user_id);
      const { data: pros } = await supabase
        .from("professionals")
        .select("id, user_id, full_name, profile_photo_url")
        .in("user_id", userIds);
      setClinicTherapists(pros || []);
    };
    loadTherapists();
  }, [isClinicMode, activeClinic?.clinic_id, professional.id]);

  const handleAssignProfessional = async (assessmentId: string, targetProId: string) => {
    if (!targetProId) return;
    setAssigningAssessmentId(assessmentId);
    const { error } = await supabase
      .from("assessments")
      .update({ professional_id: targetProId } as any)
      .eq("id", assessmentId);
    setAssigningAssessmentId(null);
    if (error) {
      toast({ title: language === "pt" ? "Erro ao atribuir" : "Assignment error", variant: "destructive" });
      return;
    }
    toast({ title: language === "pt" ? "Profissional atribuído!" : "Professional assigned!" });
    setAssignTargetByAssessment((prev) => {
      const next = { ...prev };
      delete next[assessmentId];
      return next;
    });
    loadPatientAssessments({ keepCurrent: true });
  };

  const loadReferrals = async () => {
    if (isClinicMode) { setReferrals([]); setReferralProfiles({}); return; }
    const { data: refs } = await (supabase.from("professional_referrals" as any) as any)
      .select("id, patient_user_id, professional_id, assessment_id, status, created_at")
      .eq("professional_id", professional.id)
      .order("created_at", { ascending: false })
      .limit(200);
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
      let coupon: string | undefined;
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      if (isDesktop) {
        const input = window.prompt(
          "Tem um cupom de desconto? Digite o código (ou deixe em branco):",
          ""
        );
        if (input && input.trim()) coupon = input.trim().toUpperCase();
      }
      const { data, error } = await supabase.functions.invoke("create-pro-subscription", {
        body: { plan, coupon },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
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

  const registrationPending = (professional as any)?.registration_pending === true && !isClinicMode && !isDemoMode;
  const [registrationGateOpen, setRegistrationGateOpen] = useState(false);
  const copyLink = () => {
    if (registrationPending) { setRegistrationGateOpen(true); return; }
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
      const { resolveResponsibleProfessional } = await import("@/lib/getResponsibleProfessional");
      const responsibleProfessional = await resolveResponsibleProfessional({
        userId: professional?.user_id,
        ownProfessional: professional ? { full_name: professional.full_name, crefito: professional.crefito } : null,
        clinicId: isClinicMode ? activeClinic?.clinic_id : null,
        clinicOwnerUserId: null,
      });
      await generateAssessmentPdf({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: lang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
        redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
        professionalNotes: proNote,
        professionalLogoUrl: professional?.logo_url || undefined,
        clinicLogoUrl: isClinicMode && activeClinic?.logo_url ? activeClinic.logo_url : undefined,
        clinicName: isClinicMode && activeClinic?.clinic_name ? activeClinic.clinic_name : undefined,
        responsibleProfessional,
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
      const { sharePdfFile, shareTextOrOpenWhatsApp } = await import("@/lib/whatsappShare");
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
      const { resolveResponsibleProfessional } = await import("@/lib/getResponsibleProfessional");
      const responsibleProfessional = await resolveResponsibleProfessional({
        userId: professional?.user_id,
        ownProfessional: professional ? { full_name: professional.full_name, crefito: professional.crefito } : null,
        clinicId: isClinicMode ? activeClinic?.clinic_id : null,
        clinicOwnerUserId: null,
      });
      const pdfBlob = await generateAssessmentPdfBlob({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: lang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
        redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
        professionalNotes: proNote,
        professionalLogoUrl: professional?.logo_url || undefined,
        clinicLogoUrl: isClinicMode && activeClinic?.logo_url ? activeClinic.logo_url : undefined,
        clinicName: isClinicMode && activeClinic?.clinic_name ? activeClinic.clinic_name : undefined,
        responsibleProfessional,
      });
      const patientLabel = assessment.patient_name || "Paciente";
      const nativeShareResult = await sharePdfFile({
        blob: pdfBlob,
        fileName: `AliviA_Relatorio_${patientLabel.replace(/\s+/g, "_")}.pdf`,
        title: "Aliv.iA",
        text: lang === "pt" ? `Relatório em PDF de ${patientLabel}` : `PDF report for ${patientLabel}`,
      });

      if (nativeShareResult === "shared" || nativeShareResult === "cancelled") {
        return;
      }

      const { data: { user: _authUser } } = await supabase.auth.getUser();
      const filePath = _authUser ? `${_authUser.id}/${assessment.id}_pro_${Date.now()}.pdf` : `${assessment.id}_pro_${Date.now()}.pdf`;
      const { error: uploadError } = _authUser
        ? await supabase.storage
            .from("assessment-reports")
            .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true })
        : { error: new Error("anonymous_upload_blocked") } as any;

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
        toast({
          title: lang === "pt" ? "PDF baixado" : "PDF downloaded",
          description: lang === "pt" ? "O arquivo foi salvo para envio manual, pois o anexo direto não ficou disponível neste dispositivo." : "The file was saved for manual sharing because direct attachment was not available on this device.",
        });
        return;
      }

      const origin = getPublicOrigin();
      const pdfLine = pdfUrl ? `\n\n📄 Relatório em PDF:\n${pdfUrl}` : "";
      const text = `🩺 *Aliv.iA — Relatório Profissional*\n\n👤 *Paciente:* ${patientLabel}\n📋 *Hipótese:* ${assessment.diagnosis.hypothesis}${pdfLine}\n\n💡 ${origin}`;
      await shareTextOrOpenWhatsApp(text, "Aliv.iA");
    } catch {
      toast({ title: "Erro ao compartilhar PDF", variant: "destructive" });
    }
  };

  // Memoized: avoids re-filtering full assessment list on every render,
  // which matters for clinics with hundreds of assessments.
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return patientAssessments.filter((a) => {
      const d = new Date(a.created_at);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  }, [patientAssessments]);

  // Assessments that need review: completed but not yet reviewed
  const pendingReviewAssessments = useMemo(
    () => patientAssessments.filter((a) => a.status === "completed" && !a.reviewed_at),
    [patientAssessments]
  );

  const handleMarkReviewed = async (assessmentId: string) => {
    try {
      await (supabase.from("assessments") as any).update({ reviewed_at: new Date().toISOString() }).eq("id", assessmentId);
      setPatientAssessments((prev) =>
        prev.map((a) => a.id === assessmentId ? { ...a, reviewed_at: new Date().toISOString() } : a)
      );
      toast({ title: language === "pt" ? "Avaliação marcada como revisada" : "Assessment marked as reviewed" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };
  const pendingReviewCount = pendingReviewAssessments.length;

  // Clinic-only: assessments without an assigned professional (need to be triaged)
  const unassignedClinicAssessments = useMemo(() => {
    if (!isClinicMode || !activeClinic?.clinic_id) return [];
    return patientAssessments.filter(
      (a: any) => a.clinic_id === activeClinic.clinic_id && !a.professional_id && a.status !== "in_progress"
    );
  }, [patientAssessments, isClinicMode, activeClinic?.clinic_id]);

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

  const hasPaidProSubscription = professional?.subscription_status === "active" && (
    !!professional?.subscription_stripe_id
    || (professional?.pro_access_expires_at && new Date(professional.pro_access_expires_at) > new Date())
  );
  // Grace period: assinatura caiu mas mantemos acesso ao dashboard por 7 dias
  // (mesma janela usada em check-pro-subscription e exibida no banner).
  const inGracePeriod = !!professional?.subscription_grace_until
    && new Date(professional.subscription_grace_until) > new Date();
  const isPartner = professional?.is_partner === true;
  const isAcademicPartner = professional?.is_partner_account === true && professional?.is_student === true;
  // Identificação acadêmica: acesso liberado como parceiro acadêmico (sem PRO).
  const academicAccess =
    (subscription?.is_academic_partner === true || (isAcademicPartner && !isPartner)) && !isPartner;

  const isVipAdmin = isFallbackVip(user?.email);
  const hasEffectiveProAccess = isVipAdmin || !!subscription?.subscribed || hasPaidProSubscription || inGracePeriod || isPartner || isAcademicPartner;

  // ── Plan Selection Screen (mandatory for new registrants without subscription) ──
  if (!isDemoMode && !clinicCoversAccess && !hasEffectiveProAccess) {
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

  // Decide which data to show. Simulated data must ONLY appear when:
  // (a) the user explicitly toggled the simulated mode, OR
  // (b) we are rendering the demo preview (isDemoMode).
  // We must NOT fall back to mock data based on subscription state — that
  // would leak mock patients into a real partner/PRO panel while the
  // subscription check is still loading or returns unexpected values.
  const showingSimulated = isSimulated || isDemoMode;
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
      <RegistrationRequiredDialog open={registrationGateOpen} onOpenChange={setRegistrationGateOpen} feature="O link de avaliação" />
      {registrationPending && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3 flex-wrap">
          <p className="text-sm text-foreground flex-1 min-w-[200px]">
            <span className="font-semibold">Complete seu cadastro profissional.</span>{" "}
            <span className="text-muted-foreground">Agente de raciocínio, agenda e pacientes já estão liberados. Avaliações e exercícios liberam após informar o CREFITO ou ativar o modo Acadêmico.</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => goToRegistration(navigate)}>Informar CREFITO</Button>
            <Button size="sm" variant="outline" onClick={() => goToRegistration(navigate, true)}>Sou estudante</Button>
          </div>
        </div>
      )}
      {/* Academic mode banner — student professionals */}
      {!isDemoMode && ((professional as any)?.active_profile_mode === "student" || (!(professional as any)?.active_profile_mode && professional?.is_student)) && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
          <Badge className="bg-primary/15 text-primary border-primary/40 text-[10px] uppercase tracking-wide hover:bg-primary/20">
            🎓 Alivia Acadêmico
          </Badge>
          <span className="text-xs text-muted-foreground">
            Modo estudante ativo
            {professional.student_institution ? ` · ${professional.student_institution}` : ""}
            {professional.student_period ? ` · ${professional.student_period}` : ""}
            {" "}— PDFs e links públicos exibem o selo acadêmico.
          </span>
        </div>
      )}



      {/* Clinic volume alert — only for owner in clinic mode */}
      {isClinicMode && activeClinic && (
        <ClinicVolumeAlert clinicId={activeClinic.clinic_id} />
      )}
      {/* Simulated welcome card removed — the demo experience now lives only on
          the public landing pages (/profissionais/demo and /clinica/demo). */}

      {/* Demo mode — link de pré-avaliação em evidência */}
      {isDemoMode && (
        <>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="py-4 px-5 relative flex items-start gap-3 flex-wrap">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 shrink-0">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">Seu link de pré-avaliação</p>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] uppercase">Demo</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada profissional PRO recebe um link único para enviar aos pacientes. Eles preenchem anamnese, mapa de dor e questionários antes da consulta — e o prontuário já chega pronto na sua agenda.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <code className="text-[11px] text-foreground truncate flex-1">{getPublicOrigin()}/assessment/professional/demo</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => {
                      const link = `${getPublicOrigin()}/assessment/professional/demo`;
                      navigator.clipboard.writeText(link);
                      toast({ title: "Link copiado!", description: "Abra em outra aba para ver o onboarding do paciente." });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg gap-1.5 text-[11px]"
                    onClick={() => window.open(`${getPublicOrigin()}/assessment/professional/demo`, "_blank")}
                  >
                    Abrir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="py-5 px-5 relative">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">Modo Demonstração</h3>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase tracking-wide">
                      Demo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você está conhecendo o <span className="font-semibold text-foreground">Painel Profissional Autônomo</span> com dados de exemplo.
                    Assine o plano PRO para atender pacientes particulares com seu link próprio, agenda, mensagens e relatórios em PDF.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button onClick={() => user ? handleSubscribe("annual") : navigate("/profissionais#planos")} disabled={checkoutLoading} className="rounded-xl gap-2">
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                      Plano anual ({PRO_PLAN_ANNUAL_PRICE_FORMATTED})
                    </Button>
                    <Button variant="outline" onClick={() => user ? handleSubscribe("monthly") : navigate("/profissionais#planos")} disabled={checkoutLoading} className="rounded-xl gap-2">
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Plano mensal ({PRO_PLAN_PRICE_FORMATTED})
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isDemoMode && (
        <>
          {/* Experimental blog pill — remove this line + BlogPillCard.tsx to undo */}
          {!isSimulated && <BlogPillCard />}
          {/* VIP-only PhysioTech shortcut — remove this line + PhysioTechShortcut.tsx to undo */}
          {!isSimulated && <PhysioTechShortcut variant="card" />}
          {/* Status bar */}
          {/* Status bar — faixa slim de 1 linha: selo do plano + status + renovação + ações */}
          <Card data-onboarding="pro-welcome" className="border-emerald-200 bg-emerald-500/5">
            <CardContent className="py-2.5 px-4 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {academicAccess
                  ? <GraduationCap className="h-4 w-4 text-emerald-600 shrink-0" />
                  : <Crown className="h-4 w-4 text-emerald-600 shrink-0" />}
                <p className="text-sm font-semibold text-foreground truncate">
                  {clinicCoversAccess
                    ? `Aliv.iA Clinic — ${activeClinic?.clinic_name}`
                    : academicAccess ? "Aliv.iA Acadêmico" : t("pro.plan_title")}
                </p>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] shrink-0">
                  {clinicCoversAccess
                    ? (activeClinic?.subscription_status === "trialing" ? "Trial" : t("dashboard.active"))
                    : academicAccess ? "Parceiro acadêmico"
                    : subscription?.is_partner ? t("pro.badge_partner") : t("dashboard.active")}
                </Badge>
                {!clinicCoversAccess && !academicAccess && !subscription?.is_partner && subscription?.subscription_end && (
                  <span className="hidden md:inline text-[11px] text-muted-foreground whitespace-nowrap">
                    · {t("pro.renews")} {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setInstallDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Instalar app"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">App</span>
                </button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/professional/register")} className="gap-1.5 rounded-lg h-7 px-2 text-[11px]">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("pro.edit_profile")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

        </>
      )}

      {/* Lifetime Treatment Upsell — only for non-lifetime pros, not in clinic mode */}
      {ENABLE_LIFETIME_TREATMENT_PURCHASE && !isDemoMode && !isSimulated && !clinicCoversAccess && !professional.lifetime_treatment && (isWithinFirstMonth ? (

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


      {/* Link de pré-avaliação — barra compacta de ação rápida (copiar/WhatsApp sempre visíveis) */}
      {!isSimulated && !hideForClinicTabs && (
        <Card data-onboarding="pro-link" className="border-primary/20">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {isClinicMode ? "Link de avaliação da clínica" : t("pro.generate_link_title")}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Sobre o link" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="max-w-xs text-xs text-muted-foreground">
                  {isClinicMode
                    ? "Compartilhe este link com pacientes da clínica. As avaliações ficarão visíveis para toda a equipe."
                    : t("pro.generate_link_desc")}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2 shrink-0 ml-auto">
              <Button
                size="icon"
                onClick={() => {
                  if (registrationPending) { setRegistrationGateOpen(true); return; }
                  const link = isClinicMode && activeClinic
                    ? `${getPublicOrigin()}/assessment/clinic/${activeClinic.clinic_id}`
                    : `${getPublicOrigin()}/assessment/professional/${professional.id}`;
                  navigator.clipboard.writeText(link);
                  setLinkCopied(true);
                  toast({ title: t("referral.copied") });
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                variant="outline"
                title={linkCopied ? t("referral.copied") : t("referral.copy_link")}
                aria-label={linkCopied ? t("referral.copied") : t("referral.copy_link")}
                className="rounded-xl h-8 w-8 border-primary/30 text-primary hover:bg-primary/10"
              >
                {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                onClick={async () => {
                  if (registrationPending) { setRegistrationGateOpen(true); return; }
                  const link = isClinicMode && activeClinic
                    ? `${getPublicOrigin()}/assessment/clinic/${activeClinic.clinic_id}`
                    : `${getPublicOrigin()}/assessment/professional/${professional.id}`;
                  const ownerName = isClinicMode && activeClinic
                    ? (activeClinic as any).clinics?.name || "nossa clínica"
                    : professional?.full_name || "seu fisioterapeuta";
                  const message = language === "pt"
                    ? `Olá! 👋\n\nSou ${ownerName} e gostaria de convidar você para realizar sua *pré-avaliação online* pelo Aliv.iA, nosso sistema de raciocínio clínico.\n\nÉ rápido (cerca de 10 minutos), 100% seguro e me ajuda a entender seu quadro *antes* da nossa consulta — assim ganhamos tempo no atendimento e o seu tratamento começa mais direcionado.\n\n👉 Acesse: ${link}\n\nQualquer dúvida, é só me chamar por aqui.`
                    : language === "es"
                      ? `¡Hola! 👋\n\nSoy ${ownerName} y me gustaría invitarte a realizar tu *pre-evaluación online* a través de Aliv.iA, nuestro sistema de razonamiento clínico.\n\nEs rápido (unos 10 minutos), 100% seguro y me ayuda a entender tu caso *antes* de nuestra consulta — así ganamos tiempo y tu tratamiento empieza más enfocado.\n\n👉 Accede: ${link}\n\nCualquier duda, escríbeme por aquí.`
                      : `Hi! 👋\n\nI'm ${ownerName} and I'd like to invite you to complete your *online pre-assessment* on Aliv.iA, our clinical reasoning system.\n\nIt's quick (about 10 minutes), fully secure and helps me understand your case *before* our appointment — saving time and making your treatment more targeted from day one.\n\n👉 Open: ${link}\n\nAny questions, just message me here.`;
                  const { shareTextOrOpenWhatsApp } = await import("@/lib/whatsappShare");
                  await shareTextOrOpenWhatsApp(message, "Aliv.iA");
                }}
                title="WhatsApp"
                aria-label="WhatsApp"
                className="rounded-xl h-8 w-8 bg-[#25D366] text-white hover:bg-[#1FB855]"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Card hidden per request — kept in codebase, not rendered here */}

      {/* Clinic-only: unassigned assessments needing triage */}
      {!isSimulated && isClinicMode && unassignedClinicAssessments.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <AlertTriangle className="h-4 w-4" />
              {language === "pt"
                ? `${unassignedClinicAssessments.length} avaliação(ões) sem profissional atribuído`
                : `${unassignedClinicAssessments.length} assessment(s) without assigned professional`}
            </CardTitle>
            <CardDescription className="text-xs">
              {language === "pt"
                ? "Direcione cada avaliação para um fisioterapeuta da clínica para revisão e plano de tratamento."
                : "Assign each assessment to a clinic professional for review and treatment plan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassignedClinicAssessments.slice(0, 8).map((a: any) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-blue-200 bg-background">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.patient_name || a.patient_email || "Paciente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                    {a.status && ` · ${a.status}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={assignTargetByAssessment[a.id] || ""}
                    onValueChange={(v) => setAssignTargetByAssessment((prev) => ({ ...prev, [a.id]: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs w-[180px] rounded-lg">
                      <SelectValue placeholder={language === "pt" ? "Atribuir a..." : "Assign to..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicTherapists.map((t: any) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={!assignTargetByAssessment[a.id] || assigningAssessmentId === a.id}
                    onClick={() => handleAssignProfessional(a.id, assignTargetByAssessment[a.id])}
                  >
                    {assigningAssessmentId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (language === "pt" ? "Atribuir" : "Assign")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending review alert - expandable with clickable items */}
      {!isSimulated && pendingReviewCount > 0 && (
        <PendingReviewAlert
          assessments={pendingReviewAssessments}
          language={language}
          navigate={navigate}
          onMarkReviewed={handleMarkReviewed}
        />
      )}

      {/* Metrics + Analytics were moved to the Insights tab to keep the
          Professional tab focused on day-to-day clinical work.
          See <ProMetricsSection /> rendered at the bottom of Insights. */}

      {/* Referrals received moved to the Messages tab (see ReceivedReferralsCard). */}

      {/* Backup/exportação migrado para Minha Conta → Privacidade e dados.
          No modo demo/simulado permanece aqui apenas para demonstração. */}
      {(isDemoMode || isSimulated) && (
      <details className="group rounded-xl border border-border/60 bg-muted/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition">
          <span className="flex items-center gap-2">
            <FileArchive className="h-3.5 w-3.5" />
            {language === "pt" ? "Backup e exportação de dados" : "Data backup & export"}
            {(isDemoMode || isSimulated) && (
              <span className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-px text-[9px]">
                demo
              </span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-2 pb-2 space-y-3">
          <ExportDataCard
            mode={isDemoMode || isSimulated ? "demo" : "professional"}
            professionalId={professional.id}
            entityName={professional.full_name}
          />
          <ImportDataCard
            mode={isDemoMode || isSimulated ? "demo" : "professional"}
            professionalId={professional.id}
            entityName={professional.full_name}
          />
        </div>
      </details>
      )}


      {/* Patient list grouped by email */}
      <div data-onboarding="pro-patients">
        <DashboardErrorBoundary>
          <PatientEvolutionDashboard
            key={isClinicMode ? activeClinic?.clinic_id : `solo:${professional.id}`}
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
            onSelectionChange={(sel) => {
              setPatientDetailOpen(!!sel);
              if (sel) {
                const scrollToAnchor = () => {
                  const el = document.getElementById("patient-detail-anchor");
                  if (!el) return;
                  const y = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
                };
                setTimeout(scrollToAnchor, 120);
                setTimeout(scrollToAnchor, 360);
              }
            }}
            onAssessmentsDeleted={(ids) => {
              const idSet = new Set(ids);
              setPatientAssessments((prev) => prev.filter((a) => !idSet.has(a.id)));
            }}
          />
        </DashboardErrorBoundary>
      </div>


      {/* Add Patient Modal */}
      <AddPatientModal
        open={addPatientOpen}
        onOpenChange={setAddPatientOpen}
        professionalId={professional.id}
        clinicId={isClinicMode ? activeClinic?.clinic_id : undefined}
        onAdded={() => loadPatientAssessments({ keepCurrent: true })}
      />

      {/* Install app instructions dialog */}
      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === "pt"
                ? "Instalar Aliv.iA no seu dispositivo"
                : language === "es"
                  ? "Instalar Aliv.iA en tu dispositivo"
                  : "Install Aliv.iA on your device"}
            </DialogTitle>
          </DialogHeader>
          <InstallAppGuide />
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProDashboard;

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { mockPatientAssessments } from "@/data/mockPatientData";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { formatHealthConditions, formatContinuousMedication, healthHistoryLabel } from "@/lib/healthHistory";
import logoAlivia from "@/assets/logo-alivia.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Calendar, MapPin, Activity, Loader2, FileText, Stethoscope, TrendingUp, Clock, Dumbbell, Heart, ClipboardCheck, Lock, Sparkles, Download, Share2, Trash2, ChevronRight, User, Pencil, Brain, MoreVertical, Target, AlertCircle, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClinicalAgentAccess } from "@/hooks/useClinicalAgentAccess";
import ManualAssessmentModal from "@/components/dashboard/ManualAssessmentModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DiagnosisResult from "@/components/assessment/DiagnosisResult";
import TreatmentPlan from "@/components/assessment/TreatmentPlan";
import VoiceNoteCard from "@/components/dashboard/VoiceNoteCard";
import FinalHypothesisEditor from "@/components/dashboard/FinalHypothesisEditor";
import { getDisplayHypothesis, useCanEditFinalHypothesis } from "@/lib/finalHypothesis";
import PainMapView from "@/components/assessment/PainMapView";
import { regionsByView } from "@/components/assessment/painMapData";
import { questionnaires, type QuestionnaireResult } from "@/data/questionnaireData";
import { functionalTests } from "@/data/functionalTestsData";
import QuestionnaireResultCard from "@/components/assessment/QuestionnaireResultCard";
import { PRO_TREATMENT_PRICE_FORMATTED } from "@/constants/pricing";
import { ENABLE_LIFETIME_TREATMENT_PURCHASE } from "@/lib/featureFlags";
import { useToast } from "@/hooks/use-toast";

import { normalizeAssessment } from "@/lib/anamnesisCompat";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { Separator } from "@/components/ui/separator";
import AssessmentSummaryView from "@/components/assessment/AssessmentSummaryView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PendingQuestionnairesCard from "@/components/assessment/PendingQuestionnairesCard";
import RomTable, { sanitizeRomRows } from "@/components/assessment/RomTable";
import StrengthTable, { sanitizeStrengthRows } from "@/components/assessment/StrengthTable";

// Translate i18n keys for display
function translateKey(key: string, isPt: boolean): string {
  const map: Record<string, [string, string]> = {
    "anamnesis.complaint.neck_pain": ["Dor no pescoço", "Neck pain"],
    "anamnesis.complaint.back_pain": ["Dor nas costas", "Back pain"],
    "anamnesis.complaint.shoulder_pain": ["Dor no ombro", "Shoulder pain"],
    "anamnesis.complaint.knee_pain": ["Dor no joelho", "Knee pain"],
    "anamnesis.complaint.hip_pain": ["Dor no quadril", "Hip pain"],
    "anamnesis.complaint.ankle_pain": ["Dor no tornozelo", "Ankle pain"],
    "anamnesis.complaint.wrist_pain": ["Dor no punho", "Wrist pain"],
    "anamnesis.complaint.elbow_pain": ["Dor no cotovelo", "Elbow pain"],
    "anamnesis.complaint.arm_pain": ["Dor no braço", "Arm pain"],
    "anamnesis.complaint.hand_pain": ["Dor na mão", "Hand pain"],
    "anamnesis.complaint.foot_pain": ["Dor no pé", "Foot pain"],
    "anamnesis.complaint.headache": ["Cefaleia", "Headache"],
    "anamnesis.onset.sudden": ["Início súbito", "Sudden onset"],
    "anamnesis.onset.gradual": ["Início gradual", "Gradual onset"],
    "anamnesis.onset.trauma": ["Trauma / Lesão", "Trauma / Injury"],
    "anamnesis.onset.post_surgery": ["Pós-operatório", "Post-operative"],
    "anamnesis.pain_type.local": ["Dor local", "Local pain"],
    "anamnesis.pain_type.radiating": ["Dor irradiada", "Radiating pain"],
    "anamnesis.pain_type.burning": ["Queimação", "Burning"],
    "anamnesis.pain_type.tingling": ["Formigamento", "Tingling"],
    "anamnesis.pain_type.throbbing": ["Latejante", "Throbbing"],
    "anamnesis.pain_type.stabbing": ["Pontada", "Stabbing"],
    "anamnesis.evolution.improving": ["Melhorando", "Improving"],
    "anamnesis.evolution.stable": ["Estável", "Stable"],
    "anamnesis.evolution.worsening": ["Piorando", "Worsening"],
    "anamnesis.evolution.fluctuating": ["Oscilando", "Fluctuating"],
    "anamnesis.activity.sedentary": ["Sedentário", "Sedentary"],
    "anamnesis.activity.light": ["Atividade leve", "Light activity"],
    "anamnesis.activity.regular": ["Atividade regular", "Regular activity"],
    "anamnesis.activity.athlete": ["Atleta", "Athlete"],
    "anamnesis.duration.less_week": ["Menos de uma semana", "Less than a week"],
    "anamnesis.duration.one_month": ["Cerca de 1 mês", "About 1 month"],
    "anamnesis.duration.three_six_months": ["3 a 6 meses", "3 to 6 months"],
    "anamnesis.duration.one_year_plus": ["1 ano ou mais", "1 year or more"],
    "anamnesis.gym.yes": ["Sim", "Yes"],
    "anamnesis.gym.no": ["Não", "No"],
    "anamnesis.sex.male": ["Masculino", "Male"],
    "anamnesis.sex.female": ["Feminino", "Female"],
    "anamnesis.age.under_25": ["Menos de 25 anos", "Under 25"],
    "anamnesis.age.25_34": ["25–34 anos", "25–34"],
    "anamnesis.age.35_44": ["35–44 anos", "35–44"],
    "anamnesis.age.45_55": ["45–55 anos", "45–55"],
    "anamnesis.age.over_55": ["Mais de 55 anos", "Over 55"],
  };
  const entry = map[key];
  if (entry) return isPt ? entry[0] : entry[1];
  // Fallback: bare values like "sudden"/"gradual"/"trauma" stored by manual assessment
  const suffix = "." + key;
  for (const k of Object.keys(map)) {
    if (k.endsWith(suffix)) return isPt ? map[k][0] : map[k][1];
  }
  return key;
}

function getRegionLabel(id: string, isPt: boolean): string {
  for (const view of Object.values(regionsByView)) {
    const r = view.find(reg => reg.id === id);
    if (r) return isPt ? r.label_pt : r.label_en;
  }
  return id;
}

const AssessmentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const { hasAccess: hasAgentAccess } = useClinicalAgentAccess();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const patientParam = searchParams.get("patient");
  const tabParam = searchParams.get("tab");
  const backUrl = searchParams.get("from") === "professional"
    ? `/dashboard?tab=${tabParam || "professional"}${patientParam ? `&patient=${encodeURIComponent(patientParam)}` : ""}`
    : "/dashboard";
  // Snapshot whether we have in-app history at mount time. If yes, prefer
  // history.back() so the user lands exactly where they were (preserving
  // scroll position, selected patient card, charts state, etc.). Fallback
  // to backUrl when this page was opened directly (e.g. from email/PDF).
  const hasInAppHistoryRef = useRef<boolean>(false);
  useEffect(() => {
    try {
      hasInAppHistoryRef.current =
        typeof window !== "undefined" &&
        window.history.length > 1 &&
        document.referrer.includes(window.location.host);
    } catch {
      hasInAppHistoryRef.current = false;
    }
  }, []);
  const goBack = () => {
    if (hasInAppHistoryRef.current) {
      navigate(-1);
    } else {
      navigate(backUrl);
    }
  };
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canEditFinalHypothesis = useCanEditFinalHypothesis(assessment);
  const [showTreatment, setShowTreatment] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const isPt = language === "pt";

  const handleDelete = async () => {
    if (!assessment?.id) return;
    setDeleting(true);
    try {
      // Exclusão SEMPRE via RPC segura: valida permissão (paciente, profissional
      // vinculado ou equipe da clínica) e limpa/desvincula todos os registros
      // filhos. O delete direto por RLS falhava em silêncio (0 linhas) quando a
      // política exigia assinatura ativa, dando a impressão de "não encontrada".
      const { data: rpcOk, error: rpcError } = await (supabase as any).rpc("delete_assessment_secure", {
        _assessment_id: assessment.id,
      });
      if (rpcError) throw rpcError;
      if (rpcOk === false) {
        throw new Error(isPt ? "Avaliação não encontrada." : "Assessment not found.");
      }
      toast({ title: isPt ? "Avaliação excluída" : "Assessment deleted" });
      goBack();
    } catch (err: any) {
      console.error("Delete assessment error:", err);
      toast({ title: isPt ? "Erro ao excluir avaliação" : "Error deleting assessment", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };


  const handleDownloadPdf = async () => {
    if (!assessment?.diagnosis) return;
    setPdfLoading(true);
    try {
      const { generateAssessmentPdf, generateBasicReportPdfBlob } = await import("@/utils/generatePdf");
      const finalHypothesis = assessment.final_hypothesis?.trim() || undefined;
      // Branding (clinic / solo professional logo) applies to EVERY report,
      // including the basic self-assessment made through a pro or clinic link.
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const branding = await resolveAssessmentBranding({
        clinicId: (assessment as any).clinic_id || null,
        professionalId: (assessment as any).professional_id || null,
        userId: user?.id || null,
      });
      if (assessment.type === "basic") {
        const pdfBlob = await generateBasicReportPdfBlob({
          diagnosis: assessment.diagnosis,
          // Passo E2 — mecanismo de dor + extensão vão para o relatório
          painMechanism: (assessment.diagnosis as any)?.pain_mechanism ?? (assessment as any).pain_mechanism,
          painExtent: typeof (assessment as any).pain_extent === "number" ? (assessment as any).pain_extent : null,
          finalHypothesis,
          language,
          patientName: assessment.patient_name || (user?.user_metadata?.full_name as string) || undefined,
          painRegions: assessment.pain_regions || undefined,
          painScore: assessment.pain_score,
          anamnesisData: assessment.anamnesis_data || undefined,
          redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
          redFlagAnswers: (assessment.red_flags as any)?.answers,
          redFlagsAnsweredAt: (assessment.red_flags as any)?.answered_at,
          clinicLogoUrl: branding.clinicLogoUrl,
          clinicName: branding.clinicName,
        brandColor: branding.brandColor,
          professionalLogoUrl: branding.professionalLogoUrl,
        });
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AliviA_Resultado.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {

        await generateAssessmentPdf({
          diagnosis: assessment.diagnosis,
          // Passo E2 — mecanismo de dor + extensão vão para o relatório
          painMechanism: (assessment.diagnosis as any)?.pain_mechanism ?? (assessment as any).pain_mechanism,
          painExtent: typeof (assessment as any).pain_extent === "number" ? (assessment as any).pain_extent : null,
          finalHypothesis,
          treatmentPlan: assessment.treatment_plan,
          language,
          userName: assessment.patient_name || (user?.user_metadata?.full_name as string) || "Paciente",
          anamnesisData: assessment.anamnesis_data,
          painRegions: assessment.pain_regions,
          testResults: assessment.test_results,
          redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
          redFlagAnswers: (assessment.red_flags as any)?.answers,
          redFlagsAnsweredAt: (assessment.red_flags as any)?.answered_at,
          addenda: await (await import("@/lib/assessmentAddenda")).fetchAssessmentAddenda(assessment.id),
          ...branding,
        });
      }
    } catch {
      toast({ title: isPt ? "Erro ao gerar PDF" : "Error generating PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!assessment?.diagnosis) return;
    setWhatsappLoading(true);
    try {
      const { sharePdfFile, shareTextOrOpenWhatsApp } = await import("@/lib/whatsappShare");
      const { generateAssessmentPdfBlob, generateBasicReportPdfBlob } = await import("@/utils/generatePdf");
      const { getPublicOrigin } = await import("@/lib/getPublicOrigin");
      const finalHypothesis = assessment.final_hypothesis?.trim() || undefined;
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const branding = await resolveAssessmentBranding({
        clinicId: (assessment as any).clinic_id || null,
        professionalId: (assessment as any).professional_id || null,
        userId: user?.id || null,
      });
      let pdfBlob: Blob;
      if (assessment.type === "basic") {
        pdfBlob = await generateBasicReportPdfBlob({
          diagnosis: assessment.diagnosis,
          // Passo E2 — mecanismo de dor + extensão vão para o relatório
          painMechanism: (assessment.diagnosis as any)?.pain_mechanism ?? (assessment as any).pain_mechanism,
          painExtent: typeof (assessment as any).pain_extent === "number" ? (assessment as any).pain_extent : null,
          finalHypothesis,
          language,
          patientName: assessment.patient_name || (user?.user_metadata?.full_name as string) || undefined,
          painRegions: assessment.pain_regions || undefined,
          painScore: assessment.pain_score,
          anamnesisData: assessment.anamnesis_data || undefined,
          redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
          redFlagAnswers: (assessment.red_flags as any)?.answers,
          redFlagsAnsweredAt: (assessment.red_flags as any)?.answered_at,
          clinicLogoUrl: branding.clinicLogoUrl,
          clinicName: branding.clinicName,
        brandColor: branding.brandColor,
          professionalLogoUrl: branding.professionalLogoUrl,
        });
      } else {
        pdfBlob = await generateAssessmentPdfBlob({

          diagnosis: assessment.diagnosis,
          // Passo E2 — mecanismo de dor + extensão vão para o relatório
          painMechanism: (assessment.diagnosis as any)?.pain_mechanism ?? (assessment as any).pain_mechanism,
          painExtent: typeof (assessment as any).pain_extent === "number" ? (assessment as any).pain_extent : null,
          finalHypothesis,
          treatmentPlan: assessment.treatment_plan,
          language,
          userName: assessment.patient_name || (user?.user_metadata?.full_name as string) || "Paciente",
          anamnesisData: assessment.anamnesis_data,
          painRegions: assessment.pain_regions,
          testResults: assessment.test_results,
          redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
          redFlagAnswers: (assessment.red_flags as any)?.answers,
          redFlagsAnsweredAt: (assessment.red_flags as any)?.answered_at,
          addenda: await (await import("@/lib/assessmentAddenda")).fetchAssessmentAddenda(assessment.id),
          ...branding,
        });
      }

      const nativeShareResult = await sharePdfFile({
        blob: pdfBlob,
        fileName: `AliviA_Relatorio_${(assessment.patient_name || "Paciente").replace(/\s+/g, "_")}.pdf`,
        title: "Aliv.iA",
        text: isPt ? `Relatório em PDF de ${assessment.patient_name || "Paciente"}` : `PDF report for ${assessment.patient_name || "Patient"}`,
      });

      if (nativeShareResult === "shared" || nativeShareResult === "cancelled") {
        return;
      }

      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user: _authUser } } = await supabase.auth.getUser();
      const filePath = _authUser ? `${_authUser.id}/${assessment.id}_view_${Date.now()}.pdf` : `${assessment.id}_view_${Date.now()}.pdf`;
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
        a.download = `AliviA_Resultado.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: isPt ? "PDF baixado" : "PDF downloaded",
          description: isPt ? "O arquivo foi salvo para envio manual, pois o anexo direto não ficou disponível neste dispositivo." : "The file was saved for manual sharing because direct attachment was not available on this device.",
        });
        return;
      }

      const origin = getPublicOrigin();
      const pdfLine = pdfUrl ? `\n\n📄 ${isPt ? "Relatório em PDF" : "PDF Report"}:\n${pdfUrl}` : "";
      const displayHypothesis = finalHypothesis || assessment.diagnosis.hypothesis;
      const text = `🩺 *Aliv.iA — ${isPt ? "Relatório de Avaliação" : "Assessment Report"}*\n\n📋 *${isPt ? "Hipótese" : "Hypothesis"}:* ${displayHypothesis}${pdfLine}\n\n💡 ${origin}`;
      await shareTextOrOpenWhatsApp(text, "Aliv.iA");
    } catch {
      toast({ title: isPt ? "Erro ao compartilhar" : "Error sharing", variant: "destructive" });
    } finally {
      setWhatsappLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user && !id?.startsWith("demo-")) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, id]);

  useEffect(() => {
    if (!id) return;

    // Reset view state when switching between assessments. We do NOT auto-open
    // the treatment plan: clinical data (diagnosis, anamnesis, map, tests) must
    // appear first; treatment plan is rendered further down as a collapsible.
    setShowTreatment(false);
    setAssessment(null);
    setLoading(true);

    // Handle demo/simulated assessments
    if (id.startsWith("demo-")) {
      const mockAssessment = mockPatientAssessments.find(a => a.id === id);
      if (mockAssessment) {
        setAssessment(mockAssessment);
      } else {
        navigate(backUrl);
      }
      setLoading(false);
      return;
    }

    if (user) {
      supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            navigate(backUrl);
          } else {
            setAssessment(normalizeAssessment(data));
          }
          setLoading(false);
        });
    }
  }, [user, id, navigate, reloadKey]);

  const scrollToTreatment = () => {
    setShowTreatment(true);
    setTimeout(() => {
      document.getElementById("treatment-plan-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const isDemo = id?.startsWith("demo-") ?? false;

  if ((authLoading && !isDemo) || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment) return null;

  const anamnesis = assessment.anamnesis_data as any;
  const painRegions = (assessment.pain_regions || []) as string[];
  const regions = painRegions.map((r: string) => getRegionLabel(r, isPt));

  // Patient mode: clean summary view (demo-style) replaces the report-style layout.
  // Pro/clinic users keep the existing detailed prontuário view with Resumo + Prontuário completo tabs.
  // Detect professional context via explicit URL flag OR by the assessment being linked to a professional/clinic
  // AND the current authenticated user being the owner of that context (not the patient).
  const hasFromParam = searchParams.get("from") === "professional";
  const belongsToProContext = !!(assessment?.professional_id || assessment?.clinic_id);
  const viewerIsProOwner = !!user && belongsToProContext && user.id !== (assessment as any)?.user_id;
  const isProfessionalView = hasFromParam || viewerIsProOwner;
  if (!isProfessionalView) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="container flex h-16 items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
              <span className="text-xl font-bold text-foreground">Aliv.iA</span>
            </button>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
          </div>
        </header>
        <main className="container max-w-2xl py-6 px-4">
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center mb-4">
              <span className="text-xs font-medium text-amber-700">
                {isPt ? "🎓 Modo Demonstração — dados simulados" : "🎓 Demo Mode — simulated data"}
              </span>
            </div>
          )}
          <AssessmentSummaryView
            assessment={assessment}
            onBack={goBack}
            onDownloadPdf={handleDownloadPdf}
            onShareWhatsApp={handleShareWhatsApp}
            pdfLoading={pdfLoading}
            whatsappLoading={whatsappLoading}
            professionalContext={!!(assessment.professional_id || assessment.clinic_id || assessment.type === "professional")}
            onAssessmentUpdated={() => setReloadKey((k) => k + 1)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-4 w-4" />
            {t("nav.language")}
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4 space-y-6">

        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <span className="text-xs font-medium text-amber-700">
              {isPt ? "🎓 Modo Demonstração — dados simulados" : "🎓 Demo Mode — simulated data"}
            </span>
          </div>
        )}
        {/* Breadcrumb + ações na mesma linha para evitar gap vertical */}
        {(assessment.patient_name || (!isDemo && user)) && (
          <div className="flex items-start justify-between gap-3 flex-wrap">
            {assessment.patient_name ? (
              <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap min-w-0">
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  title={isPt ? "Voltar para o paciente" : "Back to patient"}
                >
                  <User className="h-3 w-3" />
                  <span className="font-medium">{assessment.patient_name}</span>
                </button>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="capitalize">
                  {assessment.type === "premium" ? (isPt ? "Avaliação Premium" : "Premium Assessment") : assessment.type === "professional" ? (isPt ? "Avaliação Pro" : "Pro Assessment") : (isPt ? "Avaliação" : "Assessment")}
                </span>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span>
                  {new Date(assessment.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </nav>
            ) : <span />}

            {!isDemo && user && (
              <div className="flex items-center justify-end gap-2 shrink-0">
                {assessment.anamnesis_data?.manualEntry && (assessment.professional_id || assessment.clinic_id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    {isPt ? "Editar avaliação" : "Edit assessment"}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2" aria-label={isPt ? "Mais ações" : "More actions"}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      disabled={deleting}
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      {isPt ? "Excluir avaliação" : "Delete assessment"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {anamnesis?.source === "external_upload" && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {isPt ? "Avaliação externa interpretada pela IA" : "External assessment interpreted by AI"}
              </p>
              <p className="text-muted-foreground leading-snug mt-0.5">
                {isPt
                  ? "Os dados abaixo foram extraídos de um arquivo enviado (PDF/imagem) e revisados pelo profissional antes de salvar."
                  : "The data below was extracted from an uploaded file (PDF/image) and reviewed by the professional before saving."}
              </p>
            </div>
          </div>
        )}


        {editOpen && assessment && (
          <ManualAssessmentModal
            open={editOpen}
            onOpenChange={setEditOpen}
            professionalId={assessment.professional_id || ""}
            clinicId={assessment.clinic_id || null}
            patientName={assessment.patient_name || ""}
            patientEmail={assessment.patient_email || undefined}
            editAssessment={assessment}
            onSaved={() => setReloadKey((k) => k + 1)}
          />
        )}



        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isPt ? "Excluir esta avaliação?" : "Delete this assessment?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isPt
                  ? "Esta ação é irreversível. A avaliação, o plano de tratamento, notas e e-mails de acompanhamento vinculados a ela serão permanentemente apagados. O paciente e as demais avaliações dele NÃO serão removidos."
                  : "This action is irreversible. The assessment, its treatment plan, notes and follow-up e-mails will be permanently deleted. The patient and other assessments will NOT be removed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{isPt ? "Cancelar" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                disabled={deleting}
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isPt ? "Excluir permanentemente" : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm mb-4">
            <TabsTrigger value="resumo" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isPt ? "Resumo" : "Summary"}
            </TabsTrigger>
            <TabsTrigger value="completo" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {isPt ? "Prontuário completo" : "Full record"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-6 mt-0">
            <AssessmentSummaryView
              assessment={assessment}
              onBack={goBack}
              onDownloadPdf={handleDownloadPdf}
              onShareWhatsApp={handleShareWhatsApp}
              pdfLoading={pdfLoading}
              whatsappLoading={whatsappLoading}
              professionalContext={!!(assessment.professional_id || assessment.clinic_id || assessment.type === "professional")}
              onAssessmentUpdated={() => setReloadKey((k) => k + 1)}
            />
          </TabsContent>

          <TabsContent value="completo" className="space-y-6 mt-0">
        {/* Header card */}

        <Card>
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2 py-0.5 ${
                    assessment.type === "premium"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : assessment.type === "professional"
                      ? "bg-blue-500/10 text-blue-600 border-blue-200"
                      : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
                  {assessment.type === "premium" ? "Premium" : assessment.type === "professional" ? (
                    <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Pro</span>
                  ) : t("compare.basic")}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(assessment.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Patient name */}
            {assessment.patient_name && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{isPt ? "Paciente:" : "Patient:"}</span>
                <span className="text-muted-foreground">{assessment.patient_name}</span>
              </div>
            )}

            {/* Pain score */}
            {assessment.pain_score != null && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("assessment_view.pain_score")}:</span>
                <span className="text-sm font-semibold text-foreground">{assessment.pain_score}/10</span>
              </div>
            )}

            {/* Pain regions chips with per-region scores */}
            {regions.length > 0 && (() => {
              const perRegion = (anamnesis?.painScoresPerRegion || anamnesis?.pain_scores_per_region) as Record<string, number> | undefined;
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  {painRegions.map((rid: string, i: number) => {
                    const label = getRegionLabel(rid, isPt);
                    const score = perRegion?.[rid];
                    return (
                      <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
                        {label}{score != null ? ` · ${score}/10` : ""}
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {/* PDF & WhatsApp actions — destaque para exportação clínica */}
            {assessment.diagnosis && (
              <div className="flex gap-2 pt-3 border-t border-border/60 mt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-xl flex-1 font-semibold shadow-sm"
                  disabled={pdfLoading}
                  onClick={handleDownloadPdf}
                >
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isPt ? "Baixar PDF" : "Download PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl flex-1 font-semibold text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800"
                  disabled={whatsappLoading}
                  onClick={handleShareWhatsApp}
                >
                  {whatsappLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  WhatsApp
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis (clinical conclusion — appears first below header) */}
        {assessment.diagnosis && (
          <>
            <DiagnosisResult
              diagnosis={
                assessment.final_hypothesis?.trim()
                  ? { ...assessment.diagnosis, hypothesis: assessment.final_hypothesis.trim() }
                  : assessment.diagnosis
              }
              mode={assessment.type as "basic" | "premium"}
              onBack={goBack}
              onNewAssessment={() => navigate("/assessment/premium")}
              onGenerateTreatment={
                assessment.treatment_plan ? scrollToTreatment : undefined
              }
              hideFooterActions
            />
            {canEditFinalHypothesis && (
              <FinalHypothesisEditor
                assessmentId={assessment.id}
                aiHypothesis={assessment.diagnosis.hypothesis}
                finalHypothesis={assessment.final_hypothesis}
                finalHypothesisAt={assessment.final_hypothesis_at}
                onSaved={(newValue) =>
                  setAssessment((prev: any) =>
                    prev
                      ? {
                          ...prev,
                          final_hypothesis: newValue,
                          final_hypothesis_at: newValue ? new Date().toISOString() : null,
                        }
                      : prev,
                  )
                }
              />
            )}
          </>
        )}

        {/* Blurred Treatment Preview for Professional Assessments (sem plano gerado) */}
        {assessment.type === "professional" && assessment.diagnosis && !assessment.treatment_plan && !showTreatment && (
          <BlurredTreatmentPreview
            onUnlock={async () => {
              setUnlockLoading(true);
              try {
                if (isDemo) {
                  // Simulate treatment generation for demo
                  await new Promise(r => setTimeout(r, 1500));
                  const mockTreatment = {
                    phases: [
                      {
                        id: "1", duration: "Semanas 1-3", goal: "Alívio sintomático",
                        focus: "Controle da dor e educação terapêutica",
                        exercises: [
                          { name: "Mobilização articular", sets: "2", reps: "10", frequency: "Diário" },
                          { name: "Alongamento local", sets: "3", reps: "30s", frequency: "Diário" },
                        ],
                      },
                      {
                        id: "2", duration: "Semanas 4-8", goal: "Fortalecimento progressivo",
                        focus: "Estabilização e ganho de força",
                        exercises: [
                          { name: "Fortalecimento isométrico", sets: "3", reps: "10x10s", frequency: "3x/semana" },
                          { name: "Exercícios de controle motor", sets: "3", reps: "12", frequency: "3x/semana" },
                        ],
                      },
                    ],
                    generalGuidelines: [
                      "Evitar posturas prolongadas (>45 min)",
                      "Pausas ativas frequentes",
                      "Manter hidratação adequada",
                    ],
                    progressionCriteria: "Redução de 50% na dor e melhora funcional",
                    disclaimer: "Plano gerado por IA (modo demonstração). Consulte seu fisioterapeuta.",
                  };
                  setAssessment({ ...assessment, treatment_plan: mockTreatment });
                  setShowTreatment(true);
                  return;
                }
                const { data, error } = await supabase.functions.invoke("create-pro-treatment-payment", {
                  body: { assessment_id: assessment.id },
                });
                if (error) throw error;
                if (data?.free) {
                  const { data: treatmentResult, error: treatmentError } = await supabase.functions.invoke("generate-treatment", {
                    body: {
                      anamnesisData: assessment.anamnesis_data,
                      testResults: assessment.test_results,
                      questionnaireResults: [],
                      diagnosis: assessment.diagnosis,
                      mode: "professional",
                      language: language,
                    },
                  });
                  if (treatmentError) throw treatmentError;
                  if (treatmentResult?.treatmentPlan) {
                    await supabase.from("assessments").update({
                      treatment_plan: treatmentResult.treatmentPlan,
                      status: "completed",
                    }).eq("id", assessment.id);
                    setAssessment({ ...assessment, treatment_plan: treatmentResult.treatmentPlan });
                    setShowTreatment(true);
                  }
                } else if (data?.url) {
                  const w = window.open(data.url, "_blank");
                  if (!w) window.location.href = data.url;
                }
              } catch {
                toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
              } finally {
                setUnlockLoading(false);
              }
            }}
            loading={unlockLoading}
            isPt={isPt}
            isDemo={isDemo}
          />
        )}

        <Separator className="opacity-40" />

        {/* Anamnesis Details — colapsável */}
        {anamnesis && (
          <Card>
            <CardContent className="py-3">
              <CollapsibleSection
                storageKey={`assessment:${assessment.id}:anamnese`}
                defaultOpen
                header={
                  <div className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {isPt ? "Anamnese" : "Anamnesis"}
                  </div>
                }
              >
                <div className="py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                  {(anamnesis.chiefComplaints || (anamnesis.chiefComplaint ? [anamnesis.chiefComplaint] : [])).length > 0 && (
                    <AnamnesisField
                      icon={<Heart className="h-3.5 w-3.5" />}
                      label={isPt ? "Queixa Principal" : "Chief Complaint"}
                      value={(anamnesis.chiefComplaints || [anamnesis.chiefComplaint]).filter(Boolean).map((c: string) => translateKey(c, isPt)).join(", ")}
                    />
                  )}
                  {anamnesis.customComplaint && (
                    <AnamnesisField
                      label={isPt ? "Queixa Adicional" : "Additional Complaint"}
                      value={anamnesis.customComplaint}
                    />
                  )}
                  {anamnesis.onset && (
                    <AnamnesisField
                      icon={<TrendingUp className="h-3.5 w-3.5" />}
                      label={isPt ? "Modo de Início" : "Onset"}
                      value={translateKey(anamnesis.onset, isPt)}
                    />
                  )}
                  {anamnesis.painTypes?.length > 0 && (
                    <AnamnesisField
                      label={isPt ? "Tipos de Dor" : "Pain Types"}
                      value={anamnesis.painTypes.map((p: string) => translateKey(p, isPt)).join(", ")}
                    />
                  )}
                  {anamnesis.painTypesPerRegion && Object.keys(anamnesis.painTypesPerRegion).length > 1 && (
                    <AnamnesisField
                      label={isPt ? "Tipo de Dor por Região" : "Pain Type per Region"}
                      value={Object.entries(anamnesis.painTypesPerRegion)
                        .map(([region, type]) => `${region}: ${translateKey(String(type), isPt)}`)
                        .join(" · ")}
                    />
                  )}
                  {anamnesis.additionalClinicalNotes && (
                    <AnamnesisField
                      label={isPt ? "Observações Clínicas Adicionais" : "Additional Clinical Notes"}
                      value={anamnesis.additionalClinicalNotes}
                    />
                  )}
                  {anamnesis.additionalExternalInfo && (
                    <AnamnesisField
                      label={isPt ? "Informações Externas Adicionais" : "Additional External Info"}
                      value={anamnesis.additionalExternalInfo}
                    />
                  )}
                  {formatHealthConditions(anamnesis, language) && (
                    <AnamnesisField
                      label={healthHistoryLabel("conditions", language)}
                      value={formatHealthConditions(anamnesis, language)}
                    />
                  )}
                  {formatContinuousMedication(anamnesis, language) && (
                    <AnamnesisField
                      label={healthHistoryLabel("medication", language)}
                      value={formatContinuousMedication(anamnesis, language)}
                    />
                  )}
                  {anamnesis.evolution && (
                    <AnamnesisField
                      label={isPt ? "Evolução" : "Evolution"}
                      value={translateKey(anamnesis.evolution, isPt)}
                    />
                  )}
                  {anamnesis.painDuration && (
                    <AnamnesisField
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label={isPt ? "Duração da Dor" : "Pain Duration"}
                      value={translateKey(anamnesis.painDuration, isPt)}
                    />
                  )}
                  {anamnesis.aggravatingFactors && (
                    <AnamnesisField
                      label={isPt ? "Fatores Agravantes" : "Aggravating Factors"}
                      value={anamnesis.aggravatingFactors}
                    />
                  )}
                  {anamnesis.relievingFactors && (
                    <AnamnesisField
                      label={isPt ? "Fatores Aliviantes" : "Relieving Factors"}
                      value={anamnesis.relievingFactors}
                    />
                  )}
                  {anamnesis.activityLevel && (
                    <AnamnesisField
                      icon={<Dumbbell className="h-3.5 w-3.5" />}
                      label={isPt ? "Nível de Atividade" : "Activity Level"}
                      value={translateKey(anamnesis.activityLevel, isPt)}
                    />
                  )}
                  {anamnesis.hasGymAccess && (
                    <AnamnesisField
                      label={isPt ? "Acesso a Academia" : "Gym Access"}
                      value={translateKey(anamnesis.hasGymAccess, isPt)}
                    />
                  )}
                  {anamnesis.sex && (
                    <AnamnesisField
                      label={isPt ? "Sexo Biológico" : "Biological Sex"}
                      value={translateKey(anamnesis.sex, isPt)}
                    />
                  )}
                  {anamnesis.ageRange && (
                    <AnamnesisField
                      label={isPt ? "Faixa Etária" : "Age Range"}
                      value={translateKey(anamnesis.ageRange, isPt)}
                    />
                  )}
                </div>
                {anamnesis.history && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {isPt ? "Histórico" : "History"}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{anamnesis.history}</p>
                  </div>
                )}
                {anamnesis.complementaryExams && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {isPt ? "Exames Complementares" : "Complementary Exams"}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{anamnesis.complementaryExams}</p>
                  </div>
                )}
              </CollapsibleSection>
            </CardContent>
          </Card>
        )}

        {/* Joint Mobility (ROM) — manual assessment only */}
        {sanitizeRomRows(anamnesis?.romTable).length > 0 && (
          <Card>
            <CardContent className="py-3">
              <CollapsibleSection
                storageKey={`assessment:${assessment.id}:rom`}
                defaultOpen
                header={
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {isPt ? "Mobilidade Articular (ADM)" : "Joint Mobility (ROM)"}
                  </div>
                }
              >
                <div className="py-2">
                  <RomTable
                    value={anamnesis.romTable}
                    readOnly
                    bare
                    lang={isPt ? "pt" : language === "es" ? "es" : "en"}
                  />
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>
        )}

        {/* Dynamometry / Muscle strength — manual assessment only */}
        {sanitizeStrengthRows(anamnesis?.strengthTable).length > 0 && (
          <Card>
            <CardContent className="py-3">
              <CollapsibleSection
                storageKey={`assessment:${assessment.id}:strength`}
                defaultOpen
                header={
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    {isPt ? "Dinamometria (Força Muscular)" : language === "es" ? "Dinamometría (Fuerza Muscular)" : "Dynamometry (Muscle Strength)"}
                  </div>
                }
              >
                <div className="py-2">
                  <StrengthTable
                    value={anamnesis.strengthTable}
                    readOnly
                    bare
                    lang={isPt ? "pt" : language === "es" ? "es" : "en"}
                  />
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>
        )}

        {/* Pain Map Visual */}
        {painRegions.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <CollapsibleSection
                storageKey={`assessment:${assessment.id}:painmap`}
                defaultOpen
                header={
                  <div className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {isPt ? "Mapa de Dor" : "Pain Map"}
                  </div>
                }
              >
                <div className="py-2">
                  <PainMapView painRegions={painRegions} />
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>
        )}

        {/* Questionnaire Results — only render items that actually have questionnaireId */}
        {assessment.test_results && Array.isArray(assessment.test_results) && (assessment.test_results as any[]).filter((r: any) => r.questionnaireId).length > 0 && (
          <Card>
            <CardContent className="py-3">
              <CollapsibleSection
                storageKey={`assessment:${assessment.id}:questionarios`}
                defaultOpen
                header={
                  <div className="text-base font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    {isPt ? "Questionários Funcionais" : "Functional Questionnaires"}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {(assessment.test_results as any[]).filter((r: any) => r.questionnaireId).length}
                    </Badge>
                  </div>
                }
              >
                <div className="py-2 space-y-4">
                  {(assessment.test_results as any[]).filter((r: any) => r.questionnaireId).map((r: QuestionnaireResult) => (
                    <QuestionnaireResultCard key={r.questionnaireId} result={r} language={language} />
                  ))}
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>
        )}

        {/* Functional Tests — resultados assinalados pelo paciente (testId + painful) */}
        {assessment.test_results && Array.isArray(assessment.test_results) && (assessment.test_results as any[]).filter((r: any) => r.testId && !r.questionnaireId).length > 0 && (
          <Card>
            <CardContent className="py-3">
              <CollapsibleSection
                storageKey={`assessment:${assessment.id}:testes-funcionais`}
                defaultOpen
                header={
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {isPt ? "Testes Funcionais" : language === "es" ? "Pruebas Funcionales" : "Functional Tests"}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {(assessment.test_results as any[]).filter((r: any) => r.testId && !r.questionnaireId).length}
                    </Badge>
                  </div>
                }
              >
                <div className="py-2">
                  <div className="rounded-xl border divide-y overflow-hidden">
                    {(assessment.test_results as any[])
                      .filter((r: any) => r.testId && !r.questionnaireId)
                      .map((r: any, i: number) => {
                        const def = functionalTests.find((ft) => ft.id === r.testId);
                        const name = def ? t(def.nameKey) : r.testId;
                        const positive = !!r.painful;
                        const Icon = positive ? AlertCircle : CheckCircle2;
                        const color = positive ? "text-destructive" : "text-emerald-600";
                        return (
                          <div key={`${r.testId}-${i}`} className="px-3 py-2 flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color} shrink-0`} />
                            <span className="text-xs text-foreground flex-1">{name}</span>
                            <span className={`text-xs font-medium ${color}`}>
                              {positive
                                ? (isPt ? "Positivo / com dor" : language === "es" ? "Positivo / con dolor" : "Positive / painful")
                                : (isPt ? "Negativo / sem dor" : language === "es" ? "Negativo / sin dolor" : "Negative / no pain")}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>
        )}

        {/* Specialty / pending questionnaires (cardio/geri) */}
        {!String(assessment.id).startsWith("demo-") && (
          <PendingQuestionnairesCard assessmentId={assessment.id} canManage={viewerIsProOwner} />
        )}



        {/* Voice notes (AI transcription) tied to this assessment */}
        <VoiceNoteCard assessmentId={assessment.id} />

        {/* Treatment Plan — exibido por último, colapsável (fechado por padrão) */}
        {assessment.treatment_plan && (
          <div id="treatment-plan-section">
            <Card>
              <CardContent className="py-3">
                <CollapsibleSection
                  storageKey={`assessment:${assessment.id}:treatment`}
                  defaultOpen={false}
                  header={
                    <div className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {isPt ? "Plano de Tratamento" : "Treatment Plan"}
                    </div>
                  }
                >
                  <div className="pt-3">
                    <TreatmentPlan
                      plan={assessment.treatment_plan}
                      diagnosis={assessment.diagnosis}
                      assessmentId={assessment.id}
                      anamnesisData={anamnesis}
                      painRegions={painRegions}
                      testResults={assessment.test_results}
                      mode={assessment.type === "professional" ? "professional" : undefined}
                      patientName={assessment.patient_name || undefined}
                      onBack={() => {
                        document.getElementById("treatment-plan-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      onNewAssessment={() => navigate("/assessment/premium")}
                    />
                  </div>
                </CollapsibleSection>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No diagnosis yet */}
        {!assessment.diagnosis && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">{t("assessment_view.no_diagnosis")}</p>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>

        {/* Footer actions — Voltar + Nova Avaliação após métricas e plano */}

        <div className="flex flex-wrap justify-between gap-2 pt-6 border-t border-border/40">
          <Button variant="outline" onClick={goBack} className="gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            {t("assessment_view.back")}
          </Button>
          <Button onClick={() => navigate("/assessment/premium")} className="rounded-xl">
            {isPt ? "Nova avaliação" : "New assessment"}
          </Button>
        </div>
      </main>
    </div>
  );
};

// Small helper component for anamnesis fields
const AnamnesisField = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
    {!icon && <span className="w-3.5 shrink-0" />}
    <div>
      <span className="text-xs font-medium text-foreground">{label}: </span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  </div>
);

// Blurred treatment preview for professional assessments
const BlurredTreatmentPreview = ({
  onUnlock,
  loading,
  isPt,
  isDemo,
}: {
  onUnlock: () => void;
  loading: boolean;
  isPt: boolean;
  isDemo?: boolean;
}) => {
  const [lifetimeLoading, setLifetimeLoading] = useState(false);

  const handleLifetime = async () => {
    setLifetimeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-lifetime-treatment");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
    } finally {
      setLifetimeLoading(false);
    }
  };
  const fakePhases = [
    {
      title: isPt ? "Fase 1 — Curto Prazo" : "Phase 1 — Short Term",
      duration: isPt ? "1-2 semanas" : "1-2 weeks",
      exercises: isPt
        ? ["Controle de dor e inflamação", "Mobilização articular suave", "Exercícios respiratórios"]
        : ["Pain and inflammation control", "Gentle joint mobilization", "Breathing exercises"],
    },
    {
      title: isPt ? "Fase 2 — Médio Prazo" : "Phase 2 — Medium Term",
      duration: isPt ? "3-6 semanas" : "3-6 weeks",
      exercises: isPt
        ? ["Fortalecimento progressivo", "Exercícios de estabilidade", "Alongamentos específicos", "Treino de controle motor"]
        : ["Progressive strengthening", "Stability exercises", "Specific stretches", "Motor control training"],
    },
    {
      title: isPt ? "Fase 3 — Longo Prazo" : "Phase 3 — Long Term",
      duration: isPt ? "7-12 semanas" : "7-12 weeks",
      exercises: isPt
        ? ["Força específica para atividade", "Retorno à atividade plena", "Programa de prevenção"]
        : ["Activity-specific strength", "Full return to activity", "Prevention program"],
    },
  ];

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {isPt ? "Plano de Tratamento Personalizado" : "Personalized Treatment Plan"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blurred fake phases */}
        <div className="space-y-3 relative">
          {fakePhases.map((phase, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50 blur-[6px] select-none pointer-events-none">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm text-foreground">{phase.title}</p>
                <span className="text-xs text-muted-foreground">{phase.duration}</span>
              </div>
              <ul className="space-y-1">
                {phase.exercises.map((ex, j) => (
                  <li key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
            <div className="text-center space-y-3 px-4 max-w-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {isPt
                  ? "Plano de tratamento disponível para esta avaliação"
                  : "Treatment plan available for this assessment"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPt
                  ? "Desbloqueie exercícios personalizados em 3 fases (curto, médio e longo prazo) gerados pela IA com base nesta avaliação."
                  : "Unlock personalized exercises in 3 phases (short, medium and long term) generated by AI based on this assessment."}
              </p>
              <Button
                onClick={onUnlock}
                disabled={loading}
                className="rounded-xl gap-2"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {isDemo
                  ? (isPt ? "Desbloquear (Demonstração)" : "Unlock (Demo)")
                  : (isPt ? `Desbloquear por R$ 29,90` : `Unlock for R$ 29.90`)}
              </Button>
              {ENABLE_LIFETIME_TREATMENT_PURCHASE && !isDemo && (
                <button
                  onClick={handleLifetime}
                  disabled={lifetimeLoading}
                  className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                >
                  {lifetimeLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isPt
                    ? "Ou desbloqueie todos os tratamentos por R$ 149,90 — acesso permanente!"
                    : "Or unlock all treatments for R$ 149.90 — permanent access!"}
                </button>
              )}

            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentView;

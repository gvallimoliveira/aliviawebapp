import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import SessionNotesSection from "./SessionNotesSection";
import { questionnaires } from "@/data/questionnaireData";
import QuestionnaireResultCard from "@/components/assessment/QuestionnaireResultCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  ArrowLeft, Activity, Calendar, Mail, User, ChevronRight, Plus, Phone,
  FileText, ClipboardList, Stethoscope, Search, NotebookPen, Download, Loader2, Share2,
  Sparkles, FileCheck, Lock, Archive, ArchiveRestore, Eye, EyeOff, Brain, RefreshCw, Dumbbell, RotateCcw, TrendingUp,
  Copy, ExternalLink, Trash2, Pencil, MessageCircle, FilePlus, Link2,
} from "lucide-react";
import { PRO_TREATMENT_PRICE_FORMATTED } from "@/constants/pricing";
import { useToast } from "@/hooks/use-toast";
import PainMapView from "@/components/assessment/PainMapView";
import JSZip from "jszip";
import CreateExerciseProgramModal from "@/components/dashboard/CreateExerciseProgramModal";
import { generateEvolutionPdfBlob, type EvolutionSummary } from "@/utils/generatePdf";
import { mockClinicalImpressions, mockEvolutionSummary } from "@/data/mockPatientData";
import PatientFilesSection from "./PatientFilesSection";
import PatientPhotosSection from "./PatientPhotosSection";
import AddPatientModal, { type PatientToEdit } from "./AddPatientModal";
import ManualAssessmentModal from "./ManualAssessmentModal";

// Translate i18n anamnesis keys to display text
function translateKey(key: string): string {
  const map: Record<string, string> = {
    "anamnesis.complaint.neck_pain": "Dor no pescoço",
    "anamnesis.complaint.back_pain": "Dor nas costas",
    "anamnesis.complaint.shoulder_pain": "Dor no ombro",
    "anamnesis.complaint.knee_pain": "Dor no joelho",
    "anamnesis.complaint.hip_pain": "Dor no quadril",
    "anamnesis.complaint.ankle_pain": "Dor no tornozelo",
    "anamnesis.complaint.wrist_pain": "Dor no punho",
    "anamnesis.complaint.elbow_pain": "Dor no cotovelo",
    "anamnesis.complaint.foot_pain": "Dor no pé",
    "anamnesis.complaint.headache": "Cefaleia",
    "anamnesis.onset.sudden": "Início súbito",
    "anamnesis.onset.gradual": "Início gradual",
    "anamnesis.onset.trauma": "Trauma / Lesão",
    "anamnesis.pain_type.local": "Dor local",
    "anamnesis.pain_type.radiating": "Dor irradiada",
    "anamnesis.pain_type.burning": "Queimação",
    "anamnesis.pain_type.tingling": "Formigamento",
    "anamnesis.pain_type.throbbing": "Latejante",
    "anamnesis.pain_type.stabbing": "Pontada",
    "anamnesis.evolution.improving": "Melhorando",
    "anamnesis.evolution.stable": "Estável",
    "anamnesis.evolution.worsening": "Piorando",
    "anamnesis.activity.sedentary": "Sedentário",
    "anamnesis.activity.light": "Atividade leve",
    "anamnesis.activity.regular": "Atividade regular",
    "anamnesis.activity.athlete": "Atleta",
    "anamnesis.duration.less_week": "Menos de uma semana",
    "anamnesis.duration.one_month": "Cerca de 1 mês",
    "anamnesis.duration.three_six_months": "3 a 6 meses",
    "anamnesis.duration.one_year_plus": "1 ano ou mais",
    "anamnesis.gym.yes": "Sim",
    "anamnesis.gym.no": "Não",
    "anamnesis.sex.male": "Masculino",
    "anamnesis.sex.female": "Feminino",
    "anamnesis.age.under_25": "Menos de 25 anos",
    "anamnesis.age.25_34": "25–34 anos",
    "anamnesis.age.35_44": "35–44 anos",
    "anamnesis.age.45_55": "45–55 anos",
    "anamnesis.age.over_55": "Mais de 55 anos",
    "anamnesis.pain_pattern.continuous": "Contínua (24h)",
    "anamnesis.pain_pattern.intermittent": "Intermitente",
    "anamnesis.weekly_freq.daily": "Todos os dias",
    "anamnesis.weekly_freq.4_6": "4-6x/semana",
    "anamnesis.weekly_freq.2_3": "2-3x/semana",
    "anamnesis.weekly_freq.1_or_less": "1x/semana ou menos",
    "anamnesis.night_waking.frequent": "Sim, frequentemente",
    "anamnesis.night_waking.sometimes": "Às vezes",
    "anamnesis.night_waking.no": "Não",
    "anamnesis.migraine_freq.daily": "Diariamente",
    "anamnesis.migraine_freq.weekly": "Semanalmente",
    "anamnesis.migraine_freq.monthly": "Mensalmente",
    "anamnesis.migraine_freq.sporadic": "Esporádica",
    "anamnesis.trauma.yes": "Sim",
    "anamnesis.trauma.no": "Não",
  };
  return map[key] || key;
}

// Normalize test_results: could be null, {}, or an array
function normalizeTestResults(tr: any): any[] {
  if (Array.isArray(tr)) return tr;
  if (tr && typeof tr === "object" && Object.keys(tr).length > 0) return [tr];
  return [];
}

interface PatientEvolutionDashboardProps {
  assessments: any[];
  professionalId: string;
  lifetimeTreatment?: boolean;
  professionalLogoUrl?: string;
  clinicLogoUrl?: string;
  clinicName?: string;
  clinicId?: string | null;
  onDownloadPdf?: (assessment: any) => void;
  onShareWhatsApp?: (assessment: any) => void;
  isDemo?: boolean;
  readOnly?: boolean;
}

interface PatientGroup {
  email: string;
  name: string;
  assessments: any[];
  lastDate: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 80%, 55%)",
  "hsl(280, 60%, 55%)",
];

const SEVERITY_COLORS: Record<string, string> = {
  minimal: "bg-emerald-500",
  mild: "bg-yellow-500",
  moderate: "bg-orange-500",
  severe: "bg-destructive",
  extreme: "bg-destructive",
};
// Inline CTA component for unlocking treatment plans
const TreatmentUnlockCTA = ({ assessmentId, lifetimeTreatment, onUnlocked }: {
  assessmentId: string;
  lifetimeTreatment?: boolean;
  onUnlocked: (treatmentPlan: any) => void;
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-treatment-payment", {
        body: { assessment_id: assessmentId },
      });
      if (error) throw error;

      if (data?.free) {
        // Lifetime treatment — fetch assessment data then generate treatment
        const { data: assessment } = await supabase
          .from("assessments")
          .select("*")
          .eq("id", assessmentId)
          .single();

        if (!assessment) throw new Error("Assessment not found");

        const { data: genData, error: genError } = await supabase.functions.invoke("generate-treatment", {
          body: {
            anamnesisData: assessment.anamnesis_data,
            testResults: assessment.test_results,
            questionnaireResults: Array.isArray(assessment.test_results) ? assessment.test_results : [],
            diagnosis: assessment.diagnosis,
            mode: "professional",
            language: document.documentElement.lang === "en" ? "en" : "pt",
          },
        });
        if (genError) throw genError;

        await supabase
          .from("assessments")
          .update({ treatment_plan: genData.treatmentPlan, payment_status: "treatment_paid" })
          .eq("id", assessmentId);

        toast({ title: t("pro.treatment_generated") || "Plano de tratamento gerado!" });
        onUnlocked(genData?.treatmentPlan || true);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: t("payment.error_title"), description: err?.message || t("payment.error_desc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-primary/20 pt-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{t("pro.unlock_treatment_cta")}</p>
            <p className="text-[10px] text-muted-foreground">{t("pro.unlock_treatment_desc")}</p>
          </div>
        </div>
        <Button
          onClick={handleUnlock}
          disabled={loading}
          size="sm"
          className="w-full rounded-xl gap-1.5 text-xs"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
          {lifetimeTreatment ? t("pro.unlock_treatment_cta") : `${t("pro.unlock_treatment_cta")} — ${PRO_TREATMENT_PRICE_FORMATTED}`}
        </Button>
      </div>
    </div>
  );
};

// Retry component for paid-but-not-generated treatments
const TreatmentPaidRetry = ({ assessmentId, onGenerated }: {
  assessmentId: string;
  onGenerated: (treatmentPlan: any) => void;
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const { data: assessment } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (!assessment) throw new Error("Assessment not found");

      const { data: treatmentData, error } = await supabase.functions.invoke("generate-treatment", {
        body: {
          anamnesisData: assessment.anamnesis_data,
          testResults: assessment.test_results,
          questionnaireResults: Array.isArray(assessment.test_results) ? assessment.test_results : [],
          diagnosis: assessment.diagnosis,
          mode: "professional",
          language,
        },
      });

      if (error) throw error;

      await supabase
        .from("assessments")
        .update({ treatment_plan: treatmentData.treatmentPlan })
        .eq("id", assessmentId);

      toast({ title: t("pro.treatment_generated") || "Plano de tratamento gerado!" });
      onGenerated(treatmentData.treatmentPlan);
    } catch (err: any) {
      toast({ title: "Erro ao gerar tratamento", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-primary/20 pt-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Pagamento confirmado!</p>
            <p className="text-[10px] text-muted-foreground">Clique para gerar o plano de tratamento.</p>
          </div>
        </div>
        <Button
          onClick={handleRetry}
          disabled={loading}
          size="sm"
          className="w-full rounded-xl gap-1.5 text-xs"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Gerando tratamento..." : "Gerar Plano de Tratamento"}
        </Button>
      </div>
    </div>
  );
};

// Clinical Impression card (AI-generated)
const ClinicalImpressionCard = ({ assessment, existingImpression, allAssessments, isDemo }: {
  assessment: any;
  existingImpression?: { overview: string; therapeuticObjectives: string[] } | null;
  allAssessments?: any[];
  isDemo?: boolean;
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [impression, setImpression] = useState<{ overview: string; therapeuticObjectives: string[] } | null>(
    existingImpression || null
  );

  const buildTimeline = () => {
    if (!allAssessments || allAssessments.length === 0) return undefined;
    const withDiagnosis = allAssessments
      .filter((a: any) => a.diagnosis)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (withDiagnosis.length === 0) return undefined;
    return withDiagnosis.map((a: any) => {
      const results = normalizeTestResults(a.test_results);
      const questionnaires = results
        .filter((r: any) => r.questionnaireId && r.percentageScore != null)
        .map((r: any) => ({ name: r.questionnaireId, score: `${Math.round(r.percentageScore)}%` }));
      return {
        date: new Date(a.created_at).toLocaleDateString("pt-BR"),
        pain_score: a.pain_score,
        pain_regions: a.pain_regions || [],
        hypothesis: a.diagnosis?.hypothesis || null,
        questionnaires,
      };
    });
  };

  const generate = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        // Use mock clinical impression data
        await new Promise((r) => setTimeout(r, 1200)); // Simulate delay
        const mockCI = mockClinicalImpressions[assessment.id];
        if (mockCI) {
          setImpression(mockCI);
        } else {
          setImpression({
            overview: "Impressão clínica simulada para demonstração. Em dados reais, a IA analisará todos os dados clínicos do paciente.",
            therapeuticObjectives: ["Objetivo terapêutico simulado 1", "Objetivo terapêutico simulado 2"],
          });
        }
      } else {
        const { data, error } = await supabase.functions.invoke("generate-clinical-impression", {
          body: {
            anamnesisData: assessment.anamnesis_data,
            painRegions: assessment.pain_regions,
            painScore: assessment.pain_score,
            questionnaireResults: assessment.test_results,
            diagnosis: assessment.diagnosis,
            language,
            assessmentTimeline: buildTimeline(),
          },
        });
        if (error) throw error;
        const ci = data?.clinicalImpression;
        if (!ci?.overview) throw new Error("Empty response");
        setImpression(ci);

        // Persist into diagnosis.clinicalImpression
        const updatedDiagnosis = { ...(assessment.diagnosis || {}), clinicalImpression: ci };
        await supabase.from("assessments").update({ diagnosis: updatedDiagnosis as any }).eq("id", assessment.id);
      }
    } catch (err: any) {
      console.error("Clinical impression error:", err);
      toast({ title: "Erro", description: "Não foi possível gerar a impressão clínica.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Impressão Clínica
          </CardTitle>
          <div className="flex items-center gap-2">
            {impression && (
              <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="h-7 px-2 text-xs gap-1">
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Regenerar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!impression && !loading && (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Gere uma visão integrativa do quadro clínico baseada nos dados da avaliação.
            </p>
            <Button onClick={generate} size="sm" className="rounded-xl gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Gerar Impressão Clínica
            </Button>
          </div>
        )}
        {loading && !impression && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analisando dados clínicos...</span>
          </div>
        )}
        {impression && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground italic leading-relaxed">{impression.overview}</p>
            {impression.therapeuticObjectives?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Objetivos Terapêuticos Principais:</p>
                <div className="flex flex-wrap gap-2">
                  {impression.therapeuticObjectives.map((obj, i) => (
                    <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


const PatientEvolutionDashboard = ({ assessments, professionalId, lifetimeTreatment, professionalLogoUrl, clinicLogoUrl, clinicName, clinicId, onDownloadPdf, onShareWhatsApp, isDemo, readOnly }: PatientEvolutionDashboardProps) => {

  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get("patient");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(initialPatient);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteIncludeInPdf, setNoteIncludeInPdf] = useState<Record<string, boolean>>({});
  const [noteSaving, setNoteSaving] = useState<Record<string, boolean>>({});
  const [batchExporting, setBatchExporting] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [quickNotePatient, setQuickNotePatient] = useState<{ groupKey: string; email: string; name: string } | null>(null);
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const [exerciseAdherence, setExerciseAdherence] = useState<Record<string, { total: number; completed: number }>>({});
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [hepModalOpen, setHepModalOpen] = useState(false);
  const [editingHepId, setEditingHepId] = useState<string | null>(null);
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [hepHistory, setHepHistory] = useState<any[]>([]);
  const [hepHistoryLoading, setHepHistoryLoading] = useState(false);
  const [deletingHepId, setDeletingHepId] = useState<string | null>(null);
  const [longPressPatient, setLongPressPatient] = useState<{ groupKey: string; name: string } | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<string | null>(null);
  const [deleteConfirmPatient, setDeleteConfirmPatient] = useState<{ groupKey: string; name: string; assessmentIds: string[] } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [manualAssessmentTarget, setManualAssessmentTarget] = useState<{ name: string; email?: string } | null>(null);
   const [editPatientData, setEditPatientData] = useState<PatientToEdit | null>(null);
   const [newPatientName, setNewPatientName] = useState("");
   const [newPatientEmail, setNewPatientEmail] = useState("");
   const [newPatientPhone, setNewPatientPhone] = useState("");
   const [addingPatient, setAddingPatient] = useState(false);
   const [patientsTableData, setPatientsTableData] = useState<any[]>([]);

  // Load hidden patients (stored as patient_email in DB, but used as groupKey)
  useEffect(() => {
    if (!professionalId || isDemo) return;
    (supabase.from("professional_hidden_patients" as any) as any)
      .select("patient_email")
      .eq("professional_id", professionalId)
      .then(({ data }: any) => {
        if (data) setHiddenKeys(new Set(data.map((d: any) => d.patient_email)));
      });
  }, [professionalId, isDemo]);

  // Load patients from dedicated patients table
  useEffect(() => {
    if (!professionalId || isDemo) return;
    const loadPatients = async () => {
      let query = (supabase.from("patients" as any) as any).select("*");
      if (clinicId) {
        query = query.eq("clinic_id", clinicId);
      } else {
        query = query.eq("professional_id", professionalId);
      }
      const { data } = await query;
      setPatientsTableData(data || []);
    };
    loadPatients();
    const handler = () => loadPatients();
    window.addEventListener("reload-pro-patients", handler);
    return () => window.removeEventListener("reload-pro-patients", handler);
  }, [professionalId, clinicId, isDemo]);

  // Fetch exercise adherence for all patients' programs
  useEffect(() => {
    if (!professionalId || isDemo) return;
    const fetchAdherence = async () => {
      const { data: programs } = await (supabase.from("exercise_programs") as any)
        .select("id, assessment_id")
        .eq("professional_id", professionalId);
      if (!programs || programs.length === 0) return;
      const programIds = programs.map((p: any) => p.id);
      const { data: items } = await (supabase.from("exercise_program_items") as any)
        .select("id, program_id")
        .in("program_id", programIds);
      const { data: completions } = await (supabase.from("exercise_completions") as any)
        .select("exercise_item_id, program_id")
        .in("program_id", programIds);
      // Group by assessment_id -> adherence
      const adherenceMap: Record<string, { total: number; completed: number }> = {};
      programs.forEach((prog: any) => {
        const progItems = (items || []).filter((i: any) => i.program_id === prog.id);
        const progCompletions = (completions || []).filter((c: any) => c.program_id === prog.id);
        const uniqueCompleted = new Set(progCompletions.map((c: any) => c.exercise_item_id));
        if (prog.assessment_id) {
          adherenceMap[prog.assessment_id] = {
            total: progItems.length,
            completed: uniqueCompleted.size,
          };
        }
      });
      setExerciseAdherence(adherenceMap);
    };
    fetchAdherence();
  }, [professionalId, isDemo]);

  // Quick note save handler
  const handleQuickNoteSave = async () => {
    if (!quickNotePatient || !quickNoteContent.trim() || !professionalId) return;
    setQuickNoteSaving(true);
    try {
      await (supabase.from("session_notes" as any) as any).insert({
        professional_id: professionalId,
        patient_email: quickNotePatient.email,
        session_date: new Date().toISOString().slice(0, 10),
        content: quickNoteContent.trim(),
        ...(clinicId ? { clinic_id: clinicId } : {}),
      });
      toast({ title: "Evolução registrada!" });
      setQuickNotePatient(null);
      setQuickNoteContent("");
    } catch {
      toast({ title: "Erro ao salvar evolução", variant: "destructive" });
    } finally {
      setQuickNoteSaving(false);
    }
  };

  useEffect(() => {
    if (!professionalId || !selectedEmail || isDemo) { setHepHistory([]); return; }
    setHepHistoryLoading(true);
    (supabase.from("exercise_programs") as any)
      .select("id, token, patient_name, created_at, expires_at, notes, assessment_id")
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setHepHistory(data || []);
        setHepHistoryLoading(false);
      });
  }, [professionalId, selectedEmail, hepModalOpen, isDemo]);

  const handleDeleteHep = async (hepId: string) => {
    if (deletingHepId) return;
    setDeletingHepId(hepId);
    try {
      // Delete items first, then program
      await (supabase as any).from("exercise_program_items").delete().eq("program_id", hepId);
      await (supabase as any).from("exercise_programs").delete().eq("id", hepId);
      setHepHistory((prev) => prev.filter((h: any) => h.id !== hepId));
      toast({ title: "Programa excluído com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir programa", variant: "destructive" });
    } finally {
      setDeletingHepId(null);
    }
  };

  const handleEditHep = (hepId: string) => {
    setEditingHepId(hepId);
    setHepModalOpen(true);
  };

  const handleSendHepViaChat = async (link: string, patientEmail: string) => {
    if (!professionalId || readOnly) return;
    try {
      // Find conversation with this patient
      const { data: convs } = await (supabase.from("conversations") as any)
        .select("id, patient_user_id")
        .eq("professional_id", professionalId);

      // Find patient user_id by email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .limit(1000);

      // Match patient email to user_id through assessments
      const { data: patientAssessments } = await supabase
        .from("assessments")
        .select("user_id")
        .eq("patient_email", patientEmail)
        .not("user_id", "is", null)
        .limit(1);

      const patientUserId = patientAssessments?.[0]?.user_id;
      if (!patientUserId) {
        toast({ title: language === "pt" ? "Paciente não possui conta para chat" : "Patient has no account for chat", variant: "destructive" });
        return;
      }

      const conv = convs?.find((c: any) => c.patient_user_id === patientUserId);
      if (!conv) {
        toast({ title: language === "pt" ? "Nenhuma conversa encontrada com este paciente" : "No conversation found with this patient", variant: "destructive" });
        return;
      }

      // Send message with the link
      const { data: pro } = await supabase
        .from("professionals")
        .select("user_id")
        .eq("id", professionalId)
        .single();

      if (!pro?.user_id) return;

      await (supabase.from("messages") as any).insert({
        conversation_id: conv.id,
        sender_user_id: pro.user_id,
        content: `💪 ${language === "pt" ? "Seu programa de exercícios" : "Your exercise program"}: ${link}`,
      });

      toast({ title: language === "pt" ? "Link enviado via chat!" : "Link sent via chat!" });
    } catch {
      toast({ title: language === "pt" ? "Erro ao enviar via chat" : "Error sending via chat", variant: "destructive" });
    }
  };

  const handleDeletePatient = async (groupKey: string, assessmentIds: string[]) => {
    setDeletingPatient(groupKey);
    try {
      // Delete related data for each assessment
      for (const aid of assessmentIds) {
        // Delete exercise program items & programs
        const { data: programs } = await (supabase as any)
          .from("exercise_programs")
          .select("id")
          .eq("professional_id", professionalId)
          .eq("assessment_id", aid);
        if (programs) {
          for (const prog of programs) {
            await (supabase as any).from("exercise_program_items").delete().eq("program_id", prog.id);
            await (supabase as any).from("exercise_programs").delete().eq("id", prog.id);
          }
        }
        // Delete notes, referrals, follow-ups
        await supabase.from("professional_notes").delete().eq("professional_id", professionalId).eq("assessment_id", aid);
        await (supabase as any).from("follow_up_emails").delete().eq("assessment_id", aid);
      }

      // Delete all assessments for this patient
      for (const aid of assessmentIds) {
        await supabase.from("assessments").delete().eq("id", aid);
      }

      // Also remove from hidden if applicable
      await (supabase.from("professional_hidden_patients" as any) as any)
        .delete()
        .eq("professional_id", professionalId)
        .eq("patient_email", groupKey);

      setSelectedEmail(null);
      toast({ title: "Paciente e dados excluídos permanentemente" });
    } catch (err: any) {
      console.error("Delete patient error:", err);
      toast({ title: "Erro ao excluir paciente", description: err?.message, variant: "destructive" });
    } finally {
      setDeletingPatient(null);
      setDeleteConfirmPatient(null);
    }
  };

  const handleArchivePatient = async (groupKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!professionalId || archiving || !groupKey) return;
    setArchiving(groupKey);
    try {
      await (supabase.from("professional_hidden_patients" as any) as any)
        .insert({ professional_id: professionalId, patient_email: groupKey });
      setHiddenKeys((prev) => new Set([...prev, groupKey]));
      toast({ title: "Paciente arquivado" });
    } catch (err: any) {
      toast({ title: "Erro ao arquivar", variant: "destructive" });
    } finally {
      setArchiving(null);
    }
  };

  const handleRestorePatient = async (groupKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!professionalId || archiving || !groupKey) return;
    setArchiving(groupKey);
    try {
      await (supabase.from("professional_hidden_patients" as any) as any)
        .delete()
        .eq("professional_id", professionalId)
        .eq("patient_email", groupKey);
      setHiddenKeys((prev) => { const s = new Set(prev); s.delete(groupKey); return s; });
      toast({ title: "Paciente restaurado" });
    } catch (err: any) {
      toast({ title: "Erro ao restaurar", variant: "destructive" });
    } finally {
      setArchiving(null);
    }
  };

  const handleAddExternalPatient = async () => {
    if (!newPatientName.trim() || !professionalId) return;
    setAddingPatient(true);
    try {
      // Create a placeholder assessment so the patient appears in the list
      const email = newPatientEmail.trim() || `external_${Date.now()}@manual.alivia`;
      await supabase.from("assessments").insert({
        type: "professional",
        status: "completed",
        professional_id: professionalId,
        patient_name: newPatientName.trim(),
        patient_email: email,
        anamnesis_data: { externalPatient: true, phone: newPatientPhone.trim() || undefined },
      });
      toast({ title: t("pro.patient_added") });
      setAddPatientOpen(false);
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
      // Trigger parent reload
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));
    } catch (err: any) {
      toast({ title: t("pro.patient_add_error"), variant: "destructive" });
    } finally {
      setAddingPatient(false);
    }
  };


  useEffect(() => {
    if (!professionalId || assessments.length === 0 || isDemo) return;
    const assessmentIds = assessments.map((a) => a.id);
    supabase
      .from("professional_notes")
      .select("assessment_id, content, include_in_pdf")
      .eq("professional_id", professionalId)
      .in("assessment_id", assessmentIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          const pdfMap: Record<string, boolean> = {};
          data.forEach((n: any) => { map[n.assessment_id] = n.content; pdfMap[n.assessment_id] = !!n.include_in_pdf; });
          setNotes(map);
          setNoteIncludeInPdf(pdfMap);
        }
      });
  }, [professionalId, assessments, isDemo]);

  const saveNote = useCallback((assessmentId: string, content: string) => {
    if (!professionalId) return;
    setNotes((prev) => ({ ...prev, [assessmentId]: content }));
    if (debounceTimers.current[assessmentId]) clearTimeout(debounceTimers.current[assessmentId]);
    debounceTimers.current[assessmentId] = setTimeout(async () => {
      setNoteSaving((prev) => ({ ...prev, [assessmentId]: true }));
      await supabase.from("professional_notes").upsert(
        { professional_id: professionalId, assessment_id: assessmentId, content, updated_at: new Date().toISOString() },
        { onConflict: "professional_id,assessment_id" }
      );
      setNoteSaving((prev) => ({ ...prev, [assessmentId]: false }));
    }, 1000);
  }, [professionalId]);

  const toggleNoteInPdf = useCallback(async (assessmentId: string, include: boolean) => {
    if (!professionalId) return;
    setNoteIncludeInPdf((prev) => ({ ...prev, [assessmentId]: include }));
    await supabase.from("professional_notes").upsert(
      { professional_id: professionalId, assessment_id: assessmentId, include_in_pdf: include, content: notes[assessmentId] || "", updated_at: new Date().toISOString() },
      { onConflict: "professional_id,assessment_id" }
    );
  }, [professionalId, notes]);

  const handleBatchExport = useCallback(async (targetAssessments: any[]) => {
    const withDiagnosis = targetAssessments.filter((a) => a.diagnosis);
    if (withDiagnosis.length === 0) {
      toast({ title: t("pro.no_pdfs"), variant: "destructive" });
      return;
    }
    setBatchExporting(true);
    try {
      const { generateAssessmentPdfBlob } = await import("@/utils/generatePdf");
      const lang = document.documentElement.lang === "en" ? "en" : "pt";
      if (withDiagnosis.length === 1) {
        // Single PDF — just download directly
        if (onDownloadPdf) { onDownloadPdf(withDiagnosis[0]); }
      } else {
        const zip = new JSZip();
        for (const a of withDiagnosis) {
          const blob = await generateAssessmentPdfBlob({
            diagnosis: a.diagnosis,
            treatmentPlan: a.treatment_plan,
            language: lang as "pt" | "en",
            userName: a.patient_name || "Paciente",
            anamnesisData: a.anamnesis_data,
            painRegions: a.pain_regions,
            testResults: a.test_results,
            professionalNotes: noteIncludeInPdf[a.id] ? (notes[a.id] || undefined) : undefined,
          });
          const date = new Date(a.created_at).toISOString().slice(0, 10);
          const name = (a.patient_name || "paciente").replace(/\s+/g, "_");
          zip.file(`AliviA_${name}_${date}.pdf`, blob);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `AliviA_Relatorios_${new Date().toISOString().slice(0, 10)}.zip`;
        link.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: t("pro.export_done") });
    } catch (e) {
      console.error(e);
      toast({ title: t("pro.export_error"), variant: "destructive" });
    } finally {
      setBatchExporting(false);
    }
  }, [notes, onDownloadPdf, t, toast]);

  // Group assessments by patient_email (fallback to patient_name, then id)
  // Also merge patients from the dedicated patients table
  const patients = useMemo(() => {
    const map = new Map<string, PatientGroup & { groupKey: string; patientRecord?: any }>();
    assessments.forEach((a) => {
      const email = (a as any).patient_email;
      const name = (a as any).patient_name;
      const key = email || name || a.id; // unique grouping key
      if (!map.has(key)) {
        map.set(key, {
          email: email || "",
          name: name || email || "Sem nome",
          assessments: [],
          lastDate: a.created_at,
          groupKey: key, // stable unique identifier
        });
      }
      const group = map.get(key)!;
      group.assessments.push(a);
      if (a.created_at > group.lastDate) {
        group.lastDate = a.created_at;
        group.name = name || group.name;
      }
    });

    // Merge patients from patients table (those without assessments will appear as new entries)
    patientsTableData.forEach((pt: any) => {
      const key = pt.email || pt.full_name || pt.id;
      if (map.has(key)) {
        // Attach patient record data to existing group
        map.get(key)!.patientRecord = pt;
      } else {
        // Patient exists only in patients table (e.g. imported via AI), create entry with empty assessments
        map.set(key, {
          email: pt.email || "",
          name: pt.full_name || "Sem nome",
          assessments: [],
          lastDate: pt.created_at,
          groupKey: key,
          patientRecord: pt,
        });
      }
    });

    // Also try to match by name for patients without email
    patientsTableData.forEach((pt: any) => {
      if (pt.email) return; // already matched by email key
      const nameKey = pt.full_name;
      if (nameKey && map.has(nameKey) && !map.get(nameKey)!.patientRecord) {
        map.get(nameKey)!.patientRecord = pt;
      }
    });

    map.forEach((g) => g.assessments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    return Array.from(map.values()).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [assessments, patientsTableData]);

  // Find selected patient (may be null)
  const patient = selectedEmail ? patients.find((p) => p.email === selectedEmail || (p as any).groupKey === selectedEmail) || null : null;

  const painData = useMemo(() => {
    if (!patient) return [];
    return patient.assessments
      .filter((a: any) => a.pain_score != null)
      .map((a: any) => ({
        date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        score: a.pain_score,
      }));
  }, [patient]);

  // Build detailed questionnaire evolution data with subscales
  const questionnaireEvolution = useMemo(() => {
    if (!patient) return [];
    const resultsByQuestionnaire = new Map<string, {
      name: string;
      qDef: typeof questionnaires[0] | undefined;
      entries: { date: string; percentageScore: number; subscaleScores: Record<string, number> }[];
    }>();

    patient.assessments.forEach((a: any) => {
      const results = normalizeTestResults(a.test_results);
      results.forEach((r: any) => {
        if (!r.questionnaireId || r.percentageScore == null) return;
        const name = r.questionnaireName || r.questionnaireId.toUpperCase();
        if (!resultsByQuestionnaire.has(r.questionnaireId)) {
          resultsByQuestionnaire.set(r.questionnaireId, {
            name,
            qDef: questionnaires.find((q) => q.id === r.questionnaireId),
            entries: [],
          });
        }
        resultsByQuestionnaire.get(r.questionnaireId)!.entries.push({
          date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          percentageScore: r.percentageScore,
          subscaleScores: r.subscaleScores || {},
        });
      });
    });

    const charts: {
      name: string;
      totalKey: string;
      subscaleKeys: { key: string; label: string }[];
      data: any[];
    }[] = [];

    resultsByQuestionnaire.forEach((info) => {
      const { name, qDef, entries } = info;
      if (entries.length === 0) return;

      const latestEntry = entries[entries.length - 1];
      const subscaleLabels = qDef?.subscaleLabels || {};
      const isHigherWorse = qDef?.scoringDirection === "higher_worse";
      const lang = document.documentElement.lang === "en" ? "en" : "pt";

      const subscaleEntries = Object.entries(latestEntry.subscaleScores)
        .filter(([key]) => subscaleLabels[key])
        .map(([key, value]) => ({
          key,
          label: subscaleLabels[key]?.[lang] || key,
          score: value as number,
        }))
        .sort((a, b) => isHigherWorse ? b.score - a.score : a.score - b.score)
        .slice(0, 3);

      const totalKey = `${name} (Total)`;
      const data = entries.map((entry, i) => {
        const point: any = {
          index: i + 1,
          date: entry.date,
          [totalKey]: Math.round(entry.percentageScore),
        };
        subscaleEntries.forEach((sub) => {
          const subscaleValue = entry.subscaleScores[sub.key];
          if (subscaleValue != null) {
            // subscaleScores are already stored as percentages (0-100)
            point[sub.label] = Math.round(subscaleValue);
          }
        });
        return point;
      });

      charts.push({
        name,
        totalKey,
        subscaleKeys: subscaleEntries.map((s) => ({ key: s.label, label: s.label })),
        data,
      });
    });

    return charts;
  }, [patient]);

  const SUBSCALE_COLORS = [
    "hsl(210, 70%, 55%)",
    "hsl(150, 60%, 45%)",
    "hsl(35, 80%, 55%)",
  ];

  // Helper to extract questionnaire results from a single assessment
  const getQuestionnaireResults = (a: any) => {
    const results = normalizeTestResults(a.test_results);
    return results.filter((r: any) => r.questionnaireId && r.percentageScore != null);
  };

  // Helper to get anamnesis summary fields with translated values
  const getAnamnesisFields = (a: any) => {
    const d = a.anamnesis_data;
    if (!d) return [];
    const fields: { label: string; value: string }[] = [];
    const complaints = d.chiefComplaints || (d.chiefComplaint ? [d.chiefComplaint] : []);
    if (complaints.length > 0) fields.push({ label: "Queixa Principal", value: complaints.map((c: string) => translateKey(c)).join(", ") });
    if (d.customComplaint) fields.push({ label: "Queixa (detalhe)", value: d.customComplaint });
    if (d.onset) fields.push({ label: "Modo de Início", value: translateKey(d.onset) });
    if (d.evolution) fields.push({ label: "Evolução", value: translateKey(d.evolution) });
    if (d.painDuration) fields.push({ label: "Duração da Dor", value: translateKey(d.painDuration) });
    if (d.painTypes?.length) fields.push({ label: "Tipos de Dor", value: d.painTypes.map((p: string) => translateKey(p)).join(", ") });
    if (d.activityLevel) fields.push({ label: "Nível de Atividade", value: translateKey(d.activityLevel) });
    if (d.aggravatingFactors) fields.push({ label: "Agravantes", value: d.aggravatingFactors });
    if (d.relievingFactors) fields.push({ label: "Aliviantes", value: d.relievingFactors });
    if (d.hasGymAccess) fields.push({ label: "Acesso a Academia", value: translateKey(d.hasGymAccess) });
    if (d.sex) fields.push({ label: "Sexo Biológico", value: translateKey(d.sex) });
    if (d.ageRange) fields.push({ label: "Faixa Etária", value: translateKey(d.ageRange) });
    if (d.painPattern) fields.push({ label: "Padrão da Dor", value: translateKey(d.painPattern) });
    if (d.painWeeklyFrequency) fields.push({ label: "Frequência Semanal", value: translateKey(d.painWeeklyFrequency) });
    if (d.painNightWaking) fields.push({ label: "Dor Noturna (Acorda)", value: translateKey(d.painNightWaking) });
    if (d.hasPhotophobia) fields.push({ label: "Fotofobia", value: translateKey(d.hasPhotophobia) });
    if (d.hasVisualAura) fields.push({ label: "Aura Visual", value: translateKey(d.hasVisualAura) });
    if (d.hasNausea) fields.push({ label: "Náusea nas Crises", value: translateKey(d.hasNausea) });
    if (d.headacheCrisisFrequency) fields.push({ label: "Frequência de Crises", value: translateKey(d.headacheCrisisFrequency) });
    if (d.painScoreMode === "per_region" && d.painScoresPerRegion) {
      const scores = Object.entries(d.painScoresPerRegion).map(([k, v]) => `${translateKey(k)}: ${v}/10`).join(", ");
      fields.push({ label: "Dor por Região", value: scores });
    }
    return fields;
  };

  // Centralize latestWithDiagnosis — must be before early returns (hooks rule)
  const latestWithDiagnosis = useMemo(() => {
    if (!patient) return null;
    return [...patient.assessments].reverse().find((a: any) => a.diagnosis) || null;
  }, [patient]);

  const latestAssessment = patient ? patient.assessments[patient.assessments.length - 1] : null;
  const latestAnamnesisFields = latestAssessment ? getAnamnesisFields(latestAssessment) : [];

  // Empty state
  if (patients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("pro.no_patients")}</p>
        </CardContent>
      </Card>
    );
  }

  // Patient list view
  if (!patient) {
    return (
      <div className="space-y-3">
        <div className="mb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t("pro.patients_title")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("pro.patients_desc")}</p>
            </div>
            {!readOnly && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => { setEditPatientData(null); setAddPatientOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("pro.add_patient")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                disabled={batchExporting}
                onClick={() => handleBatchExport(assessments)}
              >
                {batchExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{t("pro.export_pdfs")}</span>
              </Button>
            </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "pt" ? "Buscar por nome, email, CPF ou telefone..." : "Search by name, email, CPF or phone..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {hiddenKeys.size > 0 && (
              <Button
                variant={showHidden ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5 shrink-0 text-xs"
                onClick={() => setShowHidden(!showHidden)}
              >
                {showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showHidden ? "Ocultar arquivados" : `Arquivados (${hiddenKeys.size})`}
              </Button>
            )}
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "inactive"] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className="text-xs rounded-xl h-7"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? (language === "pt" ? "Todos" : "All") : status === "active" ? (language === "pt" ? "Ativos" : "Active") : (language === "pt" ? "Inativos (30d+)" : "Inactive (30d+)")}
              </Button>
            ))}
          </div>
        </div>
        {patients
          .filter((p) => {
            const isHidden = hiddenKeys.has((p as any).groupKey);
            if (isHidden && !showHidden) return false;
            // Status filter: active = last activity within 30 days, inactive = older
            if (statusFilter !== "all") {
              const daysSinceLast = Math.floor((Date.now() - new Date(p.lastDate).getTime()) / (1000 * 60 * 60 * 24));
              const isActive = daysSinceLast <= 30;
              if (statusFilter === "active" && !isActive) return false;
              if (statusFilter === "inactive" && isActive) return false;
            }
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().replace(/[.\-/()\s]/g, "");
            const rec = (p as any).patientRecord;
            const cpfRaw = (rec?.cpf || "").replace(/\D/g, "");
            const phoneRaw = (rec?.phone || "").replace(/\D/g, "");
            return (
              p.name.toLowerCase().includes(q) ||
              p.email.toLowerCase().includes(q) ||
              cpfRaw.includes(q) ||
              phoneRaw.includes(q)
            );
          })
          .map((p) => {
          const firstScore = p.assessments[0]?.pain_score;
          const lastScore = p.assessments[p.assessments.length - 1]?.pain_score;
          const trend = firstScore != null && lastScore != null
            ? lastScore < firstScore ? "improving" : lastScore > firstScore ? "worsening" : "stable"
            : null;

          const isHidden = hiddenKeys.has((p as any).groupKey);

          const groupKey = (p as any).groupKey;
          const patientRec = (p as any).patientRecord;
          const isIncomplete = patientRec && (!patientRec.email || !patientRec.cpf || !patientRec.phone);
          const isImportedOnly = !patientRec && p.assessments.length === 0;
          const showIncomplete = isIncomplete || isImportedOnly;
          const startLongPress = () => {
            longPressFiredRef.current = false;
            longPressTimerRef.current = setTimeout(() => {
              longPressTimerRef.current = null;
              longPressFiredRef.current = true;
              setLongPressPatient({ groupKey, name: p.name });
            }, 400);
          };
          const cancelLongPress = () => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          };

          return (
            <Card
              key={groupKey}
              className={`cursor-pointer hover:shadow-md transition-all hover:border-primary/20 group select-none ${isHidden ? "opacity-50" : ""}`}
              onClick={() => {
                if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
                setSelectedEmail(p.email || groupKey);
              }}
              onTouchStart={readOnly ? undefined : startLongPress}
              onTouchEnd={readOnly ? undefined : cancelLongPress}
              onTouchMove={readOnly ? undefined : cancelLongPress}
              onMouseDown={readOnly ? undefined : startLongPress}
              onMouseUp={readOnly ? undefined : cancelLongPress}
              onMouseLeave={readOnly ? undefined : cancelLongPress}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.name}
                      </p>
                      {isHidden && (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                          Arquivado
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {p.assessments.length} {t("pro.assessments_count")}
                      </Badge>
                      {trend === "improving" && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          Melhorando
                        </Badge>
                      )}
                      {trend === "worsening" && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                          Piorando
                        </Badge>
                      )}
                      {trend === "stable" && (
                        <Badge variant="outline" className="text-[10px]">
                          Estável
                        </Badge>
                      )}
                      {p.assessments.some((a: any) => a.treatment_plan) ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
                          <FileCheck className="h-3 w-3" /> Tratamento Liberado
                        </Badge>
                      ) : p.assessments.some((a: any) => a.diagnosis) ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
                          <Lock className="h-3 w-3" /> Adquirir Tratamento
                        </Badge>
                      ) : null}
                      {showIncomplete && !readOnly && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-200 gap-1 cursor-pointer hover:bg-orange-500/20 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rec = patientRec || { id: "", full_name: p.name, email: p.email || null };
                            setEditPatientData(rec);
                            setAddPatientOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          {language === "pt" ? "Completar cadastro" : "Complete registration"}
                        </Badge>
                      )}
                      {/* Exercise adherence indicator */}
                      {(() => {
                        const patientAdherence = p.assessments.reduce((acc: { total: number; completed: number }, a: any) => {
                          const adh = exerciseAdherence[a.id];
                          if (adh) { acc.total += adh.total; acc.completed += adh.completed; }
                          return acc;
                        }, { total: 0, completed: 0 });
                        if (patientAdherence.total > 0) {
                          const pct = Math.round((patientAdherence.completed / patientAdherence.total) * 100);
                          const color = pct >= 70 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : pct >= 40 ? "bg-amber-500/10 text-amber-600 border-amber-200" : "bg-destructive/10 text-destructive border-destructive/20";
                          return (
                            <Badge variant="outline" className={`text-[10px] gap-1 ${color}`}>
                              <Dumbbell className="h-3 w-3" /> {pct}% {language === "pt" ? "adesão" : "adherence"}
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {p.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t("pro.last_assessment")}: {new Date(p.lastDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        title={language === "pt" ? "Nova avaliação manual" : "New manual assessment"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setManualAssessmentTarget({ name: p.name, email: p.email || "" });
                        }}
                      >
                        <FilePlus className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {!readOnly && !isHidden && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        title={language === "pt" ? "Nota rápida" : "Quick note"}
                        onClick={(e) => {
                          e.stopPropagation();
                          const emailKey = p.email || `imported:${(p as any).groupKey || p.name}`;
                          setQuickNotePatient({ groupKey: (p as any).groupKey, email: emailKey, name: p.name });
                          setQuickNoteContent("");
                        }}
                      >
                        <NotebookPen className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    {!readOnly && (isHidden ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Restaurar paciente"
                        disabled={archiving === (p as any).groupKey}
                        onClick={(e) => handleRestorePatient((p as any).groupKey, e)}
                      >
                        {archiving === (p as any).groupKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        title="Arquivar paciente"
                        disabled={archiving === (p as any).groupKey}
                        onClick={(e) => handleArchivePatient((p as any).groupKey, e)}
                      >
                        {archiving === (p as any).groupKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    ))}
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add/Edit Patient Modal */}
        <AddPatientModal
          open={addPatientOpen}
          onOpenChange={(open) => {
            setAddPatientOpen(open);
            if (!open) setEditPatientData(null);
          }}
          professionalId={professionalId}
          clinicId={clinicId}
          onAdded={() => window.dispatchEvent(new CustomEvent("reload-pro-patients"))}
          editPatient={editPatientData}
          onCreateManualAssessment={(p) => setManualAssessmentTarget(p)}
        />

        {/* Manual Assessment Modal */}
        {manualAssessmentTarget && (
          <ManualAssessmentModal
            open={!!manualAssessmentTarget}
            onOpenChange={(o) => { if (!o) setManualAssessmentTarget(null); }}
            professionalId={professionalId}
            clinicId={clinicId}
            patientName={manualAssessmentTarget.name}
            patientEmail={manualAssessmentTarget.email}
          />
        )}

        {/* Quick note dialog */}
        <Dialog open={!!quickNotePatient} onOpenChange={(open) => { if (!open) setQuickNotePatient(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-primary" />
                {language === "pt" ? "Nota rápida de evolução" : "Quick evolution note"}
              </DialogTitle>
              <DialogDescription>
                {quickNotePatient?.name} — {new Date().toLocaleDateString("pt-BR")}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder={language === "pt" ? "Ex: Paciente relata melhora de 30% na dor. Mantém exercícios..." : "Ex: Patient reports 30% pain improvement..."}
              value={quickNoteContent}
              onChange={(e) => setQuickNoteContent(e.target.value)}
              className="min-h-[100px] resize-y text-sm"
            />
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setQuickNotePatient(null)}>
                {language === "pt" ? "Cancelar" : "Cancel"}
              </Button>
              <Button size="sm" className="gap-1.5 rounded-xl" onClick={handleQuickNoteSave} disabled={quickNoteSaving || !quickNoteContent.trim()}>
                {quickNoteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
                {language === "pt" ? "Salvar" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Long-press popup */}
        <AlertDialog open={!!longPressPatient} onOpenChange={(open) => { if (!open) setLongPressPatient(null); }}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>{longPressPatient?.name}</AlertDialogTitle>
              <AlertDialogDescription>
                O que deseja fazer com este paciente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  if (longPressPatient) {
                    handleArchivePatient(longPressPatient.groupKey);
                    setLongPressPatient(null);
                  }
                }}
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </Button>
              <Button
                variant="destructive"
                className="gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  if (longPressPatient) {
                    const p = patients.find((pat) => (pat as any).groupKey === longPressPatient.groupKey);
                    if (p) {
                      setDeleteConfirmPatient({
                        groupKey: longPressPatient.groupKey,
                        name: longPressPatient.name,
                        assessmentIds: p.assessments.map((a: any) => a.id),
                      });
                    }
                    setLongPressPatient(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Excluir permanentemente
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteConfirmPatient} onOpenChange={(open) => { if (!open) setDeleteConfirmPatient(null); }}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão permanente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <span className="font-semibold">{deleteConfirmPatient?.name}</span> e todas as suas {deleteConfirmPatient?.assessmentIds.length} avaliação(ões)?
                <br /><br />
                <span className="text-destructive font-medium">Esta ação é irreversível. Todos os dados de avaliações, planos de tratamento, exercícios e notas serão permanentemente apagados.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!deletingPatient} onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                disabled={!!deletingPatient}
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteConfirmPatient) {
                    handleDeletePatient(deleteConfirmPatient.groupKey, deleteConfirmPatient.assessmentIds);
                  }
                }}
              >
                {deletingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Evolution detail view ──

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" /> {t("pro.back_to_patients")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={!!deletingPatient}
          onClick={() => setDeleteConfirmPatient({
            groupKey: (patient as any).groupKey,
            name: patient.name,
            assessmentIds: patient.assessments.map((a: any) => a.id),
          })}
        >
          {deletingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir paciente
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
            {patient.assessments.some((a: any) => a.treatment_plan) ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
                <FileCheck className="h-3 w-3" /> Tratamento Liberado
              </Badge>
            ) : patient.assessments.some((a: any) => a.diagnosis) ? (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
                <Lock className="h-3 w-3" /> Adquirir Tratamento
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> {patient.email}
            <span className="mx-1">•</span>
            {patient.assessments.length} {t("pro.assessments_count")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {latestWithDiagnosis && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => navigate(`/assessment/view/${latestWithDiagnosis.id}?from=professional&patient=${encodeURIComponent(patient.email)}`)}
            >
              <FileText className="h-4 w-4" /> {t("pro.view_full_assessment")}
            </Button>
          )}
          {latestWithDiagnosis && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => {
                const base = clinicId
                  ? `${window.location.origin}/assessment/clinic/${clinicId}`
                  : `${window.location.origin}/assessment/professional/${professionalId}`;
                const link = `${base}?reassessment=${latestWithDiagnosis.id}`;
                navigator.clipboard.writeText(link);
                toast({ title: "Link de reavaliação copiado!" });
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reavaliação
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => { setEditingHepId(null); setHepModalOpen(true); }}
          >
            <Dumbbell className="h-4 w-4" /> Exercícios
          </Button>
          {latestWithDiagnosis && onShareWhatsApp && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              onClick={() => onShareWhatsApp(latestWithDiagnosis)}
            >
              <Share2 className="h-4 w-4" /> WhatsApp
            </Button>
          )}
          {patient.assessments.filter((a: any) => a.diagnosis).length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={evolutionLoading}
              onClick={async () => {
                setEvolutionLoading(true);
                try {
                  const withDiagnosis = patient.assessments
                    .filter((a: any) => a.diagnosis)
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  const firstA = withDiagnosis[0];
                  const lastA = withDiagnosis[withDiagnosis.length - 1];

                  let summary: any;

                  if (isDemo) {
                    // Use mock evolution summary
                    await new Promise((r) => setTimeout(r, 1500));
                    summary = mockEvolutionSummary;
                  } else {
                    const normalizeQ = (tr: any) => {
                      if (Array.isArray(tr)) return tr.filter((t: any) => t.questionnaireId && t.percentageScore != null).map((t: any) => ({ id: t.questionnaireId, name: t.questionnaireName || t.questionnaireId, score: Math.round(t.percentageScore) }));
                      return [];
                    };

                    const payload = {
                      assessments: [
                        { date: firstA.created_at, pain_score: firstA.pain_score, hypothesis: firstA.diagnosis?.hypothesis, pain_regions: firstA.pain_regions || [], questionnaires: normalizeQ(firstA.test_results) },
                        { date: lastA.created_at, pain_score: lastA.pain_score, hypothesis: lastA.diagnosis?.hypothesis, pain_regions: lastA.pain_regions || [], questionnaires: normalizeQ(lastA.test_results) },
                      ],
                      language,
                    };

                    const { data: summaryData, error } = await supabase.functions.invoke("generate-evolution-summary", { body: payload });
                    if (error) throw new Error(error?.message || "Erro ao conectar com o servidor de IA");
                    if (!summaryData || summaryData?.error) throw new Error(summaryData?.error || "Resposta inválida da IA");
                    if (!summaryData.narrative || !summaryData.conclusion || !summaryData.recommendation) {
                      throw new Error("Resumo incompleto gerado pela IA. Tente novamente.");
                    }
                    summary = summaryData;
                  }

                  const blob = await generateEvolutionPdfBlob({
                    patientName: patient.name,
                    firstAssessment: { date: firstA.created_at, pain_score: firstA.pain_score, pain_regions: firstA.pain_regions || [], test_results: firstA.test_results, hypothesis: firstA.diagnosis?.hypothesis },
                    lastAssessment: { date: lastA.created_at, pain_score: lastA.pain_score, pain_regions: lastA.pain_regions || [], test_results: lastA.test_results, hypothesis: lastA.diagnosis?.hypothesis },
                    totalAssessments: withDiagnosis.length,
                    summary: summary as EvolutionSummary,
                    language,
                    professionalLogoUrl,
                    clinicLogoUrl,
                    clinicName,
                  });

                  // Download
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `AliviA_Evolucao_${patient.name.replace(/\s/g, "_")}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);

                  if (!isDemo) {
                    // Upload to bucket for sharing (real mode only)
                    const fileName = `evolution_${patient.name.replace(/\s/g, "_")}_${Date.now()}.pdf`;
                    const { error: uploadError } = await supabase.storage.from("assessment-reports").upload(fileName, blob, { contentType: "application/pdf", upsert: true });

                    // WhatsApp share option
                    if (!uploadError) {
                      const { data: publicUrl } = supabase.storage.from("assessment-reports").getPublicUrl(fileName);
                      if (publicUrl?.publicUrl) {
                        const whatsappText = encodeURIComponent(`${t("evolution.title")} - ${patient.name}\n${publicUrl.publicUrl}`);
                        window.open(`https://wa.me/?text=${whatsappText}`, "_blank");
                      }
                    }
                  }

                  toast({ title: t("evolution.success") });
                } catch (err: any) {
                  console.error("Evolution report error:", err);
                  toast({ title: t("evolution.error"), description: err?.message, variant: "destructive" });
                } finally {
                  setEvolutionLoading(false);
                }
              }}
            >
              {evolutionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {t("evolution.title")}
            </Button>
          )}
        </div>
      </div>

      {/* HEP Modal */}
      <CreateExerciseProgramModal
        open={hepModalOpen}
        onOpenChange={(open) => { setHepModalOpen(open); if (!open) setEditingHepId(null); }}
        professionalId={professionalId}
        patientName={patient.name}
        assessmentId={latestWithDiagnosis?.id}
        editProgramId={editingHepId}
      />

      {/* ── HEP History ── */}
      {(() => {
        const patientHeps = hepHistory.filter(
          (h: any) => (h.patient_name || "").toLowerCase().trim() === (patient.name || "").toLowerCase().trim()
        );
        if (patientHeps.length === 0) return null;
        const origin = window.location.origin;
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" /> Programas de Exercícios Enviados
              </CardTitle>
              <CardDescription className="text-xs">{patientHeps.length} programa(s) criado(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {patientHeps.map((hep: any) => {
                const link = `${origin}/hep/${hep.token}`;
                const isExpired = new Date(hep.expires_at) < new Date();
                return (
                  <div key={hep.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {new Date(hep.created_at).toLocaleDateString("pt-BR")}
                        {hep.notes && <span className="text-muted-foreground ml-2">— {hep.notes}</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{link}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isExpired && (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Expirado</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Editar programa"
                        onClick={() => handleEditHep(hep.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Copiar link"
                        onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Link copiado!" }); }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Abrir link"
                        onClick={() => window.open(link, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Enviar via WhatsApp"
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Seu programa de exercícios: ${link}`)}`, "_blank")}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      {!readOnly && patient.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={language === "pt" ? "Enviar via chat interno" : "Send via internal chat"}
                          onClick={() => handleSendHepViaChat(link, patient.email)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Excluir programa"
                        disabled={deletingHepId === hep.id}
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este programa de exercícios?")) {
                            handleDeleteHep(hep.id);
                          }
                        }}
                      >
                        {deletingHepId === hep.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}
      {/* ── 2. DIAGNÓSTICO (Hipótese Principal) ── */}
      {latestWithDiagnosis?.diagnosis?.hypothesis && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Hipótese Diagnóstica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {latestWithDiagnosis.diagnosis.hypothesis}
            </p>
            {latestWithDiagnosis.diagnosis.confidence === "high" && (
              <Badge variant="outline" className="text-[10px] capitalize">
                Confiança: {latestWithDiagnosis.diagnosis.confidence}
              </Badge>
            )}
            {latestWithDiagnosis.diagnosis.reasoning && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {latestWithDiagnosis.diagnosis.reasoning}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 3. IMPRESSÃO CLÍNICA (IA) ── */}
      {latestWithDiagnosis && (
        <ClinicalImpressionCard
          assessment={latestWithDiagnosis}
          existingImpression={latestWithDiagnosis.diagnosis?.clinicalImpression}
          allAssessments={patient?.assessments}
          isDemo={isDemo}
        />
      )}

      {/* ── 4. CTA PLANO DE TRATAMENTO ── */}
      {latestWithDiagnosis && (() => {
        const a = latestWithDiagnosis;
        const hasTreatment = a.treatment_plan;
        const isPaidPending = !a.treatment_plan && (a.payment_status === "treatment_paid" || a.payment_status === "treatment_generating");
        const needsUnlock = a.diagnosis && !a.treatment_plan && !isPaidPending;

        if (hasTreatment) {
          return (
            <Card className="border-emerald-200 bg-emerald-500/5">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">{t("pro.treatment_unlocked")}</p>
                      <p className="text-xs text-muted-foreground">Plano de tratamento disponível para este paciente.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => navigate(`/assessment/view/${a.id}?from=professional&patient=${encodeURIComponent(selectedEmail || "")}`)}
                  >
                    {t("pro.view_treatment")}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (isPaidPending) {
          return (
            <TreatmentPaidRetry
              assessmentId={a.id}
              onGenerated={(treatmentPlan) => {
                a.treatment_plan = treatmentPlan;
                setNotes((prev) => ({ ...prev }));
              }}
            />
          );
        }

        if (needsUnlock) {
          return (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="py-5 px-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Plano de Tratamento Personalizado</p>
                    <p className="text-xs text-muted-foreground">Programa completo em 3 fases com exercícios progressivos, metas semanais e critérios de alta.</p>
                  </div>
                </div>
                <TreatmentUnlockCTA
                  assessmentId={a.id}
                  lifetimeTreatment={lifetimeTreatment}
                  onUnlocked={(treatmentPlan) => {
                    a.treatment_plan = treatmentPlan;
                    a.payment_status = "treatment_paid";
                    setNotes((prev) => ({ ...prev }));
                  }}
                />
              </CardContent>
            </Card>
          );
        }

        return null;
      })()}

      {/* ── 5. ANAMNESE (Última Avaliação) ── */}
      {latestAnamnesisFields.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Anamnese — Última Avaliação
            </CardTitle>
            <CardDescription className="text-xs">
              {new Date(latestAssessment.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {latestAnamnesisFields.map((f, i) => (
                <div key={i} className="space-y-0.5">
                  <span className="text-muted-foreground font-medium">{f.label}</span>
                  <p className="text-foreground">{f.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 6. EVOLUÇÃO DA DOR (Gráfico) ── */}
      {painData.length > 1 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("pro.pain_evolution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={painData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} name="Dor" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : painData.length === 1 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("pro.pain_evolution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={painData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Dor" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── 7. MAPA DE DOR COMPARATIVO ── */}
      {patient.assessments.some((a: any) => a.pain_regions?.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Mapa de Dor — Comparativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {patient.assessments.filter((a: any) => a.pain_regions?.length > 0).map((a: any) => (
                <div key={a.id} className="text-center space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    {a.pain_score != null && <span className="ml-1.5 text-foreground font-semibold">• Dor: {a.pain_score}/10</span>}
                  </p>
                  <PainMapView painRegions={a.pain_regions} compact />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 8. QUESTIONÁRIOS (Evolução) ── */}
      {questionnaireEvolution.length > 0 ? (
        questionnaireEvolution.map((chart) => (
          <Card key={chart.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                {t("pro.questionnaire_evolution")} — {chart.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Pontuação total + 3 maiores limitações funcionais (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chart.data.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: any, name: string) => [`${value}%`, name]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={chart.totalKey}
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                      {chart.subscaleKeys.map((sub, i) => (
                        <Line
                          key={sub.key}
                          type="monotone"
                          dataKey={sub.key}
                          stroke={SUBSCALE_COLORS[i % SUBSCALE_COLORS.length]}
                          strokeWidth={1.5}
                          strokeDasharray="5 3"
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: any, name: string) => [`${value}%`, name]} />
                      <Legend />
                      <Bar dataKey={chart.totalKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      {chart.subscaleKeys.map((sub, i) => (
                        <Bar
                          key={sub.key}
                          dataKey={sub.key}
                          fill={SUBSCALE_COLORS[i % SUBSCALE_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <ClipboardList className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum questionário funcional foi aplicado nessas avaliações.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Questionários são aplicados automaticamente quando o paciente preenche o mapa de dor.</p>
          </CardContent>
        </Card>
      )}

      {/* ── 8.5. PRONTUÁRIO DE EVOLUÇÃO ── */}
      {selectedEmail && (
        <SessionNotesSection
          professionalId={professionalId}
          patientEmail={selectedEmail}
        />
      )}

      {/* ── 8.6. DOCUMENTOS DO PACIENTE ── */}
      {selectedEmail && !isDemo && (
        <PatientFilesSection
          patientEmail={selectedEmail}
          patientName={patient?.name}
          clinicId={clinicId}
          professionalId={professionalId}
          readOnly={readOnly}
        />
      )}

      {/* ── 8.7. FOTOS DO PACIENTE ── */}
      {selectedEmail && !isDemo && (
        <PatientPhotosSection
          patientEmail={selectedEmail}
          patientName={patient?.name}
          clinicId={clinicId}
          professionalId={professionalId}
          readOnly={readOnly}
        />
      )}

      {/* ── 9. HISTÓRICO DETALHADO (Simplificado) ── */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">{t("dashboard.history")}</h4>
        <div className="space-y-3">
          {patient.assessments.map((a: any) => {
            const qResults = getQuestionnaireResults(a);
            return (
              <Card key={a.id} className="overflow-hidden">
                <CardContent className="py-3 px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {a.pain_score != null && <span>Dor: {a.pain_score}/10</span>}
                        {a.diagnosis?.hypothesis && (
                          <span className="line-clamp-1">• {a.diagnosis.hypothesis}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.diagnosis && onShareWhatsApp && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp" onClick={() => onShareWhatsApp(a)}>
                          <Share2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {a.diagnosis && onDownloadPdf && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="PDF" onClick={() => onDownloadPdf(a)}>
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {a.diagnosis && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t("pro.view_full_assessment")}
                          onClick={() => navigate(`/assessment/view/${a.id}?from=professional&patient=${encodeURIComponent(selectedEmail || "")}`)}
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {qResults.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3" /> Questionários
                      </p>
                      {qResults.map((r: any, idx: number) => (
                        <QuestionnaireResultCard key={idx} result={r} language={language} compact />
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <NotebookPen className="h-3 w-3" />
                      {t("pro.private_notes")}
                      {noteSaving[a.id] && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      {notes[a.id] && !noteSaving[a.id] && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{t("pro.notes_saved")}</Badge>}
                    </p>
                    <Textarea
                      placeholder={t("pro.private_notes_placeholder")}
                      value={notes[a.id] || ""}
                      onChange={(e) => saveNote(a.id, e.target.value)}
                      className="text-xs min-h-[60px] resize-y"
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                      <Checkbox
                        checked={!!noteIncludeInPdf[a.id]}
                        onCheckedChange={(checked) => toggleNoteInPdf(a.id, !!checked)}
                      />
                      <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                        {t("pro.include_notes_in_pdf")}
                      </span>
                      {noteIncludeInPdf[a.id] && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-300 text-amber-600 bg-amber-50">
                          {t("pro.notes_will_appear_in_pdf")}
                        </Badge>
                      )}
                    </label>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation dialog (detail view) */}
      <AlertDialog open={!!deleteConfirmPatient} onOpenChange={(open) => { if (!open) setDeleteConfirmPatient(null); }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão permanente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-semibold">{deleteConfirmPatient?.name}</span> e todas as suas {deleteConfirmPatient?.assessmentIds.length} avaliação(ões)?
              <br /><br />
              <span className="text-destructive font-medium">Esta ação é irreversível. Todos os dados de avaliações, planos de tratamento, exercícios e notas serão permanentemente apagados.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingPatient} onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              disabled={!!deletingPatient}
              onClick={(e) => {
                e.stopPropagation();
                if (deleteConfirmPatient) {
                  handleDeletePatient(deleteConfirmPatient.groupKey, deleteConfirmPatient.assessmentIds);
                }
              }}
            >
              {deletingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientEvolutionDashboard;

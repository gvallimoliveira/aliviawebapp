import { careScope } from "@/lib/careScope";
import type { RegistrationSaved } from "@/lib/patientRegistration";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import SessionNotesSection from "./SessionNotesSection";
import PatientListView from "./patient-evolution/PatientListView";
import PatientDetailView from "./patient-evolution/PatientDetailView";
import { ClinicalImpressionCard, TreatmentPaidRetry, TreatmentUnlockCTA, normalizeTestResults } from "./patient-evolution/shared";
import { questionnaires } from "@/data/questionnaireData";
import { regionsByView } from "@/components/assessment/painMapData";

// Build a flat lookup { regionId: { pt, en } } for naming questionnaire charts
const REGION_LABELS: Record<string, { pt: string; en: string }> = (() => {
  const map: Record<string, { pt: string; en: string }> = {};
  Object.values(regionsByView).forEach((list) => {
    list.forEach((r) => {
      if (!map[r.id]) map[r.id] = { pt: r.label_pt, en: r.label_en };
    });
  });
  return map;
})();
import QuestionnaireResultCard from "@/components/assessment/QuestionnaireResultCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClinic } from "@/contexts/ClinicContext";
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
  Copy, ExternalLink, Trash2, Pencil, MessageCircle, FilePlus, Link2, Users, UserCog,
} from "lucide-react";
import { PRO_TREATMENT_PRICE_FORMATTED } from "@/constants/pricing";
import { useToast } from "@/hooks/use-toast";
import { anchorScrollById } from "@/hooks/useScrollAnchor";
import PainMapView from "@/components/assessment/PainMapView";
import RegionPainComparison from "@/components/dashboard/RegionPainComparison";
import AssessmentTimeline from "@/components/dashboard/AssessmentTimeline";
import JSZip from "jszip";
import CreateExerciseProgramModal from "@/components/dashboard/CreateExerciseProgramModal";
import { generateEvolutionPdfBlob, type EvolutionSummary } from "@/utils/generatePdf";
import { mockClinicalImpressions, mockEvolutionSummary } from "@/data/mockPatientData";
import PatientFilesSection from "./PatientFilesSection";
import PatientPhotosSection from "./PatientPhotosSection";
import {
  buildPersonalizedAssessmentLink,
  buildReassessmentLink,
  buildResumeAssessmentLink,
  ensurePatientAssessmentToken,
} from "@/lib/assessmentLinks";
import AddPatientModal, { type PatientToEdit } from "./AddPatientModal";
import ManualAssessmentModal from "./ManualAssessmentModal";
import FinalHypothesisEditor from "./FinalHypothesisEditor";
import { getDisplayHypothesis, useCanEditFinalHypothesis, hasFinalOverride } from "@/lib/finalHypothesis";
import { normalizeAssessment } from "@/lib/anamnesisCompat";

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
    "anamnesis.complaint.arm_pain": "Dor no braço",
    "anamnesis.complaint.hand_pain": "Dor na mão",
    "anamnesis.complaint.foot_pain": "Dor no pé",
    "anamnesis.complaint.headache": "Cefaleia",
    "anamnesis.onset.sudden": "Início súbito",
    "anamnesis.onset.gradual": "Início gradual",
    "anamnesis.onset.trauma": "Trauma / Lesão",
    "anamnesis.onset.post_surgery": "Pós-operatório",
    "anamnesis.pain_type.local": "Dor local",
    "anamnesis.pain_type.radiating": "Dor irradiada",
    "anamnesis.pain_type.burning": "Queimação",
    "anamnesis.pain_type.tingling": "Formigamento",
    "anamnesis.pain_type.throbbing": "Latejante",
    "anamnesis.pain_type.stabbing": "Pontada",
    "anamnesis.evolution.improving": "Melhorando",
    "anamnesis.evolution.stable": "Estável",
    "anamnesis.evolution.worsening": "Piorando",
    "anamnesis.evolution.fluctuating": "Oscilando",
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
  if (map[key]) return map[key];
  // Fallback: bare values like "sudden"/"gradual"/"trauma"/"post_surgery" stored by manual assessment
  const suffix = "." + key;
  for (const k of Object.keys(map)) {
    if (k.endsWith(suffix)) return map[k];
  }
  return key;
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
  /** When true together with readOnly, exposes the "Add patient" button (e.g. clinic secretary). */
  canAddPatient?: boolean;
  /** When true together with readOnly, allows archiving/restoring patient cards (e.g. clinic secretary). */
  canArchivePatient?: boolean;
  /** When true together with readOnly, exposes the "Manual assessment" (voice-enabled) action — both in the patient card and the detail header. */
  allowManualAssessment?: boolean;
  /** When true together with readOnly, exposes the "Copy personalized assessment link" action on the patient card. */
  allowAssessmentLink?: boolean;
  /** When true together with readOnly, exposes the "Quick evolution note" action on the patient card. */
  allowQuickNote?: boolean;
  /** Fired whenever the selected patient (detail view) changes. Null = back to list. */
  onSelectionChange?: (selected: string | null) => void;
  /** Fired after assessments are deleted (patient delete or single delete) so parent can refresh local state. */
  onAssessmentsDeleted?: (assessmentIds: string[]) => void;
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

const PatientEvolutionDashboard = ({ assessments: rawAssessments, professionalId, lifetimeTreatment, professionalLogoUrl, clinicLogoUrl, clinicName, clinicId, onDownloadPdf, onShareWhatsApp, isDemo, readOnly, canAddPatient, canArchivePatient, allowManualAssessment, allowAssessmentLink, allowQuickNote, onSelectionChange, onAssessmentsDeleted }: PatientEvolutionDashboardProps) => {
  // Normalize legacy snake_case anamnesis keys + test_results object→array shape
  // so older manual assessments are fully readable in the UI.
  // Avaliações excluídas nesta sessão: somem da lista na hora, sem esperar o
  // refetch do componente pai (a lista vinha de um array memoizado, então
  // mutar/splicar não re-renderizava nada).
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<string[]>([]);
  const [registrationUpdates, setRegistrationUpdates] = useState<Record<string, { patient_name: string; patient_email: string | null }>>({});
  const assessments = useMemo(
    () =>
      (rawAssessments || [])
        .filter((a) => !locallyDeletedIds.includes(a.id) && (isDemo || (clinicId ? a.clinic_id === clinicId : !a.clinic_id && a.professional_id === professionalId)))
        .map((a) => normalizeAssessment(registrationUpdates[a.id] ? { ...a, ...registrationUpdates[a.id] } : a) as any),
    [rawAssessments, locallyDeletedIds, registrationUpdates, clinicId, professionalId, isDemo]
  );

  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isClinicMode } = useClinic();
  const backTab = isClinicMode ? "patients" : "professional";
  const buildAssessmentViewUrl = (assessmentId: string, email?: string | null) =>
    `/assessment/view/${assessmentId}?from=professional&tab=${backTab}${email ? `&patient=${encodeURIComponent(email)}` : ""}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPatient = searchParams.get("patient");
  const [selectedEmail, setSelectedEmailState] = useState<string | null>(initialPatient);
  // Keep the open patient chart in the URL (?patient=...) so that when the OS
  // kills / backgrounds the PWA tab (app switch on mobile), the session
  // restore in sessionPersistence brings the user right back to the same
  // patient chart — same behavior as the clinical agent thread routes.
  const setSelectedEmail = useCallback((value: string | null) => {
    setSelectedEmailState(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("patient", value);
      else next.delete("patient");
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  useEffect(() => {
    setRegistrationUpdates({});
  }, [clinicId, professionalId]);
  useEffect(() => {
    const handleSaved = (event: Event) => {
      const saved = (event as CustomEvent<RegistrationSaved>).detail;
      if (!saved || saved.clinicId !== (clinicId || null) || (!clinicId && saved.professionalId !== professionalId)) return;
      setRegistrationUpdates((prev) => {
        const next = { ...prev };
        saved.assessmentIds.forEach((id) => { next[id] = { patient_name: saved.name, patient_email: saved.email }; });
        return next;
      });
      setPatientsTableData((prev) => prev.map((row) => row.id === saved.patientId ? { ...row, full_name: saved.name, email: saved.email } : row));
      if (selectedEmail === saved.oldKey) setSelectedEmail(saved.newKey);
    };
    window.addEventListener("patient-registration-saved", handleSaved);
    return () => window.removeEventListener("patient-registration-saved", handleSaved);
  }, [clinicId, professionalId, selectedEmail, setSelectedEmail]);
  // Avisar o pai só quando o paciente aberto muda de fato. O pai passa uma
  // função nova a cada render (ex.: ao exibir "Link copiado"), e repetir o
  // aviso fazia a página rolar de volta ao topo do prontuário.
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  useEffect(() => { onSelectionChangeRef.current?.(selectedEmail); }, [selectedEmail]);
  // Sync with URL: if the `patient` query param is removed (e.g. user taps
  // the Patients tab in the bottom bar), collapse back to the list view.
  const patientParam = searchParams.get("patient");
  useEffect(() => {
    setSelectedEmailState((prev) => (patientParam ?? null) === prev ? prev : (patientParam ?? null));
  }, [patientParam]);

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

  // Treatment unlock UX (clickable badge → picker / scroll-to-card)
  const [treatmentPicker, setTreatmentPicker] = useState<{ patientName: string; assessments: any[] } | null>(null);
  const [pendingScrollToTreatment, setPendingScrollToTreatment] = useState(false);
  const [treatmentHighlight, setTreatmentHighlight] = useState(false);
  const treatmentSectionRef = useRef<HTMLDivElement | null>(null);

  // Returns assessments that have a diagnosis but no treatment plan and aren't paid yet.
  const getPendingTreatmentAssessments = useCallback((assessments: any[]) => {
    return (assessments || []).filter(
      (a: any) =>
        a?.diagnosis &&
        !a?.treatment_plan &&
        a?.payment_status !== "treatment_paid" &&
        a?.payment_status !== "treatment_generating",
    );
  }, []);

  const scrollToTreatmentCard = useCallback(() => {
    const el = treatmentSectionRef.current;
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTreatmentHighlight(true);
    window.setTimeout(() => setTreatmentHighlight(false), 2200);
    return true;
  }, []);

  // Handler for the badge click. If multiple pending → opens picker. If one → navigates and scrolls.
  const handleAcquireBadgeClick = useCallback((p: { name: string; email?: string | null; groupKey?: string; assessments: any[] }) => {
    const pending = getPendingTreatmentAssessments(p.assessments);
    if (pending.length === 0) return;
    if (pending.length > 1) {
      setTreatmentPicker({ patientName: p.name, assessments: pending });
      return;
    }
    // Single pending → ensure detail view is open then scroll
    const targetKey = p.email || p.groupKey;
    if (!targetKey) {
      setTreatmentPicker({ patientName: p.name, assessments: pending });
      return;
    }
    if (selectedEmail !== targetKey) {
      setPendingScrollToTreatment(true);
      setSelectedEmail(targetKey);
    } else {
      // Already in detail view
      if (!scrollToTreatmentCard()) setPendingScrollToTreatment(true);
    }
  }, [getPendingTreatmentAssessments, scrollToTreatmentCard, selectedEmail]);
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
   const [clinicTherapists, setClinicTherapists] = useState<Array<{ id: string; full_name: string; user_id: string }>>([]);
   const [reassignOpen, setReassignOpen] = useState(false);
   const [reassignTargetId, setReassignTargetId] = useState<string>("");
    const [reassigning, setReassigning] = useState(false);
   const [showArchivedAssessments, setShowArchivedAssessments] = useState(false);
   const [archivingAssessmentId, setArchivingAssessmentId] = useState<string | null>(null);
   const [deleteAssessmentTarget, setDeleteAssessmentTarget] = useState<{ id: string; date: string } | null>(null);
   const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);
   const [assessmentRefreshTick, setAssessmentRefreshTick] = useState(0);

  // Load clinic therapists (professionals belonging to this clinic) so owner/secretary can reassign
  useEffect(() => {
    if (!clinicId || isDemo) return;
    const loadTherapists = async () => {
      const { data: members } = await (supabase.from("clinic_members") as any)
        .select("user_id, role")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .in("role", ["owner", "therapist"]);
      const userIds = (members || []).map((m: any) => m.user_id);
      if (userIds.length === 0) { setClinicTherapists([]); return; }
      const { data: pros } = await (supabase.from("professionals") as any)
        .select("id, full_name, user_id")
        .in("user_id", userIds);
      setClinicTherapists(pros || []);
    };
    loadTherapists();
  }, [clinicId, isDemo]);

  // Load hidden patients (stored as patient_email in DB, but used as groupKey)
  // For clinic context: read from clinic_hidden_patients (shared by all clinic members).
  // For solo pro context: read from professional_hidden_patients.
  useEffect(() => {
    if (isDemo) return;
    if (clinicId) {
      (supabase.from("clinic_hidden_patients" as any) as any)
        .select("patient_email")
        .eq("clinic_id", clinicId)
        .then(({ data }: any) => {
          if (data) setHiddenKeys(new Set(data.map((d: any) => d.patient_email)));
        });
      return;
    }
    if (!professionalId) return;
    (supabase.from("professional_hidden_patients" as any) as any)
      .select("patient_email")
      .eq("professional_id", professionalId)
      .then(({ data }: any) => {
        if (data) setHiddenKeys(new Set(data.map((d: any) => d.patient_email)));
      });
  }, [professionalId, isDemo, clinicId]);

  // Load patients from dedicated patients table
  useEffect(() => {
    if ((!clinicId && !professionalId) || isDemo) return;
    const loadPatients = async () => {
      let query = (supabase.from("patients" as any) as any)
        .select("id, full_name, email, cpf, phone, created_at, clinic_id, professional_id, assessment_token, birth_date, address, sex, occupation, prescribed_weekly_frequency, referral_source")
        .eq("is_study_case", false);
      if (clinicId) {
        query = query.eq("clinic_id", clinicId);
      } else {
        query = query.eq("professional_id", professionalId).is("clinic_id", null);
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
    if ((!clinicId && !professionalId) || isDemo) return;
    const fetchAdherence = async () => {
      let programsQuery = (supabase.from("exercise_programs") as any)
        .select("id, assessment_id");
      programsQuery = clinicId
        ? programsQuery.eq("clinic_id", clinicId)
        : programsQuery.eq("professional_id", professionalId).is("clinic_id", null);
      const { data: programs } = await programsQuery;
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
  }, [professionalId, clinicId, isDemo]);

  // Reassign all patient assessments to a new professional within the clinic
  const handleReassignPatient = async (assessmentIds: string[], targetProId: string, patientRecordId?: string | null) => {
    if (!targetProId || !clinicId || (assessmentIds.length === 0 && !patientRecordId)) return;
    setReassigning(true);
    try {
      // Manually registered patients may have no assessments yet: the
      // responsible therapist lives on the patient registry row.
      if (patientRecordId) {
        const { data: updated, error: pErr } = await (supabase.from("patients" as any) as any)
          .update({ professional_id: targetProId })
          .eq("id", patientRecordId)
          .eq("clinic_id", clinicId)
          .select("id");
        if (pErr) throw pErr;
        if (!updated?.length && assessmentIds.length === 0) {
          throw new Error("Seu perfil não tem permissão para alterar o fisioterapeuta deste paciente.");
        }
      }
      if (assessmentIds.length > 0) {
        const { error } = await (supabase.from("assessments") as any)
          .update({ professional_id: targetProId })
          .in("id", assessmentIds)
          .eq("clinic_id", clinicId);
        if (error) throw error;
      }
      toast({ title: "Fisioterapeuta atualizado!", description: assessmentIds.length > 0 ? "Paciente e avaliações reatribuídos." : "Fisioterapeuta responsável definido no cadastro." });
      setReassignOpen(false);
      setReassignTargetId("");
      // Trigger reload upstream
      window.dispatchEvent(new Event("reload-pro-patients"));
    } catch (e: any) {
      toast({ title: "Erro ao reatribuir", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setReassigning(false);
    }
  };

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

  // When detail view becomes available after a badge click, scroll to the treatment card.
  useEffect(() => {
    if (!pendingScrollToTreatment || !selectedEmail) return;
    // Wait one tick so the detail view (and the treatment card) has mounted.
    const timer = window.setTimeout(() => {
      const ok = scrollToTreatmentCard();
      if (ok) setPendingScrollToTreatment(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pendingScrollToTreatment, selectedEmail, scrollToTreatmentCard]);

  useEffect(() => {
    if (!professionalId || !selectedEmail || isDemo) { setHepHistory([]); return; }
    setHepHistoryLoading(true);
    careScope((supabase.from("exercise_programs") as any)
      .select("id, token, patient_name, created_at, expires_at, notes, assessment_id"), clinicId, professionalId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setHepHistory(data || []);
        setHepHistoryLoading(false);
      });
  }, [professionalId, clinicId, selectedEmail, hepModalOpen, isDemo]);

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
      const { data: convs } = await careScope((supabase.from("conversations") as any)
        .select("id, patient_user_id"), clinicId, professionalId);

      // Find patient user_id by email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .limit(1000);

      // Match patient email to user_id through assessments
      const { data: patientAssessments } = await careScope(supabase
        .from("assessments")
        .select("user_id"), clinicId, professionalId)
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
        await supabase.from("professional_notes").delete().eq("professional_id", professionalId).eq("assessment_id", aid);
        await (supabase as any).from("follow_up_emails").delete().eq("assessment_id", aid);
      }

      // Delete all assessments for this patient (RPC segura — o delete direto
      // por RLS falha em silêncio quando a política exige assinatura ativa)
      for (const aid of assessmentIds) {
        const { data: ok, error } = await (supabase as any).rpc("delete_assessment_secure", { _assessment_id: aid });
        if (error || ok === false) {
          await supabase.from("assessments").delete().eq("id", aid);
        }
      }


      // Delete patient record(s) from patients table (handles patients with no assessments)
      const group: any = patients.find((p: any) => p.groupKey === groupKey);
      const patientRec = group?.patientRecord;
      if (patientRec?.id) {
        await (supabase as any).from("patients").delete().eq("id", patientRec.id);
      } else if (clinicId || professionalId) {
        let q: any = (supabase as any).from("patients").delete();
        if (clinicId) q = q.eq("clinic_id", clinicId);
        else q = q.eq("professional_id", professionalId).is("clinic_id", null);
        if (group?.email) {
          q = q.ilike("email", group.email);
        } else if (group?.name) {
          q = q.ilike("full_name", group.name);
        }
        await q;
      }

      // Also remove from hidden if applicable
      await (supabase.from("professional_hidden_patients" as any) as any)
        .delete()
        .eq("professional_id", professionalId)
        .eq("patient_email", groupKey);
      if (clinicId) {
        await (supabase.from("clinic_hidden_patients" as any) as any)
          .delete()
          .eq("clinic_id", clinicId)
          .eq("patient_email", groupKey);
      }

      setSelectedEmail(null);
      setLocallyDeletedIds((prev) => [...prev, ...assessmentIds.filter((id) => !prev.includes(id))]);
      onAssessmentsDeleted?.(assessmentIds);
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));
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
    if (archiving || !groupKey) return;
    if (!clinicId && !professionalId) return;
    setArchiving(groupKey);
    try {
      if (clinicId) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase.from("clinic_hidden_patients" as any) as any)
          .insert({ clinic_id: clinicId, patient_email: groupKey, hidden_by: user?.id });
      } else {
        await (supabase.from("professional_hidden_patients" as any) as any)
          .insert({ professional_id: professionalId, patient_email: groupKey });
      }
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
    if (archiving || !groupKey) return;
    if (!clinicId && !professionalId) return;
    setArchiving(groupKey);
    try {
      if (clinicId) {
        await (supabase.from("clinic_hidden_patients" as any) as any)
          .delete()
          .eq("clinic_id", clinicId)
          .eq("patient_email", groupKey);
      } else {
        await (supabase.from("professional_hidden_patients" as any) as any)
          .delete()
          .eq("professional_id", professionalId)
          .eq("patient_email", groupKey);
      }
      setHiddenKeys((prev) => { const s = new Set(prev); s.delete(groupKey); return s; });
      toast({ title: "Paciente restaurado" });
    } catch (err: any) {
      toast({ title: "Erro ao restaurar", variant: "destructive" });
    } finally {
      setArchiving(null);
    }
  };

  const handleArchiveAssessment = async (assessmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (archivingAssessmentId) return;
    setArchivingAssessmentId(assessmentId);
    try {
      const { error } = await (supabase.from("assessments") as any)
        .update({ archived_at: new Date().toISOString() })
        .eq("id", assessmentId);
      if (error) throw error;
      // Mutate in-memory to reflect immediately
      const target = assessments.find((a) => a.id === assessmentId);
      if (target) target.archived_at = new Date().toISOString();
      setAssessmentRefreshTick((x) => x + 1);
      toast({ title: language === "pt" ? "Avaliação arquivada" : "Assessment archived" });
    } catch (err: any) {
      toast({ title: language === "pt" ? "Erro ao arquivar avaliação" : "Error archiving", description: err?.message, variant: "destructive" });
    } finally {
      setArchivingAssessmentId(null);
    }
  };

  const handleRestoreAssessment = async (assessmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (archivingAssessmentId) return;
    setArchivingAssessmentId(assessmentId);
    try {
      const { error } = await (supabase.from("assessments") as any)
        .update({ archived_at: null })
        .eq("id", assessmentId);
      if (error) throw error;
      const target = assessments.find((a) => a.id === assessmentId);
      if (target) target.archived_at = null;
      setAssessmentRefreshTick((x) => x + 1);
      toast({ title: language === "pt" ? "Avaliação restaurada" : "Assessment restored" });
    } catch (err: any) {
      toast({ title: language === "pt" ? "Erro ao restaurar" : "Error restoring", description: err?.message, variant: "destructive" });
    } finally {
      setArchivingAssessmentId(null);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (deletingAssessmentId) return;
    setDeletingAssessmentId(assessmentId);
    // A lista encolhe quando o card some; sem âncora o navegador joga a página
    // para o topo. Guardamos a posição do bloco de histórico e a restauramos.
    const restoreScroll = anchorScrollById("sec-historico", 1200);
    try {
      // Exclusão via RPC segura: valida permissão (paciente, profissional vinculado
      // ou equipe da clínica) e limpa/desvincula registros filhos que bloqueiam o delete
      // (encaminhamentos, programas, questionários pendentes, notas de voz, etc.).
      const { data: rpcOk, error: rpcError } = await (supabase as any).rpc("delete_assessment_secure", {
        _assessment_id: assessmentId,
      });

      if (rpcError) {
        // Fallback: tentativa direta (RLS) caso a função ainda não esteja disponível
        console.warn("[deleteAssessment] RPC falhou, tentando delete direto:", rpcError);
        const { error, data: deleted } = await supabase
          .from("assessments")
          .delete()
          .eq("id", assessmentId)
          .select("id");
        if (error) throw error;
        if (!deleted || deleted.length === 0) {
          throw new Error(
            language === "pt"
              ? "Sem permissão para excluir esta avaliação."
              : "You don't have permission to delete this assessment.",
          );
        }
      } else if (rpcOk === false) {
        throw new Error(
          language === "pt" ? "Avaliação não encontrada." : "Assessment not found.",
        );
      }

      // Some da UI imediatamente e avisa o pai para sincronizar o estado dele.
      setLocallyDeletedIds((prev) => (prev.includes(assessmentId) ? prev : [...prev, assessmentId]));
      onAssessmentsDeleted?.([assessmentId]);
      setAssessmentRefreshTick((x) => x + 1);
      restoreScroll();
      toast({ title: language === "pt" ? "Avaliação excluída" : "Assessment deleted" });
    } catch (err: any) {
      toast({ title: language === "pt" ? "Erro ao excluir" : "Error deleting", description: err?.message, variant: "destructive" });
    } finally {
      setDeletingAssessmentId(null);
      setDeleteAssessmentTarget(null);
    }
  };



  const handleAddExternalPatient = async () => {
    if (!newPatientName.trim() || !professionalId) return;
    setAddingPatient(true);
    try {
      // Cadastra somente o paciente. Nada de avaliação placeholder — isso
      // fazia o paciente nascer com "1 avaliação" fantasma.
      const { error } = await (supabase as any).from("patients").insert({
        professional_id: professionalId,
        full_name: newPatientName.trim(),
        email: newPatientEmail.trim() || null,
        phone: newPatientPhone.replace(/\D/g, "") || null,
      });
      if (error) throw error;
      toast({ title: t("pro.patient_added") });
      setAddPatientOpen(false);
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
      // Trigger parent reload
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));
    } catch (err: any) {
      toast({ title: t("pro.patient_add_error"), description: err?.message, variant: "destructive" });
    } finally {
      setAddingPatient(false);
    }
  };



  useEffect(() => {
    if ((!clinicId && !professionalId) || assessments.length === 0 || isDemo) return;
    if (!professionalId) {
      setNotes({});
      setNoteIncludeInPdf({});
      return;
    }
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
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const lang = document.documentElement.lang === "en" ? "en" : "pt";
      if (withDiagnosis.length === 1) {
        // Single PDF — just download directly
        if (onDownloadPdf) { onDownloadPdf(withDiagnosis[0]); }
      } else {
        const zip = new JSZip();
        // Cache branding per (clinicId|professionalId) to avoid N queries
        const brandingCache = new Map<string, Awaited<ReturnType<typeof resolveAssessmentBranding>>>();
        for (const a of withDiagnosis) {
          const cKey = `${(a as any).clinic_id || ""}|${(a as any).professional_id || ""}`;
          let branding = brandingCache.get(cKey);
          if (!branding) {
            branding = await resolveAssessmentBranding({
              clinicId: (a as any).clinic_id || null,
              professionalId: (a as any).professional_id || null,
              userId: null,
            });
            brandingCache.set(cKey, branding);
          }
          const blob = await generateAssessmentPdfBlob({
            diagnosis: a.diagnosis,
            treatmentPlan: a.treatment_plan,
            language: lang as "pt" | "en",
            userName: a.patient_name || "Paciente",
            anamnesisData: a.anamnesis_data,
            painRegions: a.pain_regions,
            testResults: a.test_results,
            redFlags: (a.red_flags as any)?.detected,
            redFlagsDismissal: (a as any).red_flags_dismissed_at ? {
              at: (a as any).red_flags_dismissed_at,
              by: (a as any).red_flags_dismissed_by_name,
              reason: (a as any).red_flags_dismissed_reason,
            } : undefined,
            professionalNotes: noteIncludeInPdf[a.id] ? (notes[a.id] || undefined) : undefined,
            ...branding,
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
    return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt", { sensitivity: "base" }));
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

  // Build detailed questionnaire evolution data with subscales.
  // Charts are grouped by questionnaireId + body-region context, so the same
  // questionnaire applied to different anatomical regions (e.g. ODI for cervical
  // vs lumbar in different assessments) generates separate, clearly labeled charts.
  const questionnaireEvolution = useMemo(() => {
    if (!patient) return [];
    const lang = document.documentElement.lang === "en" ? "en" : "pt";

    // Returns a short context label for a questionnaire run, based on which
    // pain regions of the assessment overlap with the questionnaire's mapping.
    // Falls back to the diagnosis hypothesis (truncated) when no overlap.
    const buildContext = (
      qDef: typeof questionnaires[0] | undefined,
      assessment: any,
    ): { key: string; label: string } => {
      const painRegions: string[] = Array.isArray(assessment?.pain_regions) ? assessment.pain_regions : [];
      const mapping = qDef?.regionMapping || [];
      const overlap = painRegions.filter((r) => mapping.includes(r));
      if (overlap.length > 0) {
        const labels = overlap.map((r) => REGION_LABELS[r]?.[lang] || r);
        // Deduplicate (cervical_left + cervical_right => "Cervical")
        const unique = Array.from(new Set(labels));
        const label = unique.slice(0, 2).join(" + ") + (unique.length > 2 ? "…" : "");
        return { key: overlap.sort().join("|"), label };
      }
      const hypothesis: string | undefined = assessment?.diagnosis?.hypothesis;
      if (hypothesis) {
        const short = hypothesis.length > 32 ? hypothesis.slice(0, 32) + "…" : hypothesis;
        return { key: `dx:${hypothesis}`, label: short };
      }
      return { key: "_", label: "" };
    };

    // Group strictly by questionnaireId so the full history of a scale stays in a
    // single chart. The anatomical/diagnostic context travels with each data point
    // (shown in the tooltip) instead of splitting the chart in fragments.
    const groups = new Map<string, {
      questionnaireId: string;
      name: string;
      qDef: typeof questionnaires[0] | undefined;
      contextLabels: string[];
      entries: { date: string; sortAt: number; context: string; interpretation?: string; percentageScore: number; subscaleScores: Record<string, number> }[];
    }>();

    patient.assessments.forEach((a: any) => {
      const results = normalizeTestResults(a.test_results);
      results.forEach((r: any) => {
        if (!r.questionnaireId || r.percentageScore == null) return;
        const name = r.questionnaireName || r.questionnaireId.toUpperCase();
        const qDef = questionnaires.find((q) => q.id === r.questionnaireId);
        const ctx = buildContext(qDef, a);
        if (!groups.has(r.questionnaireId)) {
          groups.set(r.questionnaireId, {
            questionnaireId: r.questionnaireId,
            name,
            qDef,
            contextLabels: [],
            entries: [],
          });
        }
        const g = groups.get(r.questionnaireId)!;
        if (ctx.label && !g.contextLabels.includes(ctx.label)) g.contextLabels.push(ctx.label);
        g.entries.push({
          date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          sortAt: new Date(a.created_at).getTime(),
          context: ctx.label,
          interpretation: r.interpretation || r.severityLabel || undefined,
          percentageScore: r.percentageScore,
          subscaleScores: r.subscaleScores || {},
        });
      });
    });

    const charts: {
      name: string;
      displayTitle: string;
      contextLabel: string;
      totalKey: string;
      subscaleKeys: { key: string; label: string }[];
      allZero: boolean;
      data: any[];
    }[] = [];

    groups.forEach((info) => {
      const { name, contextLabels, qDef, entries } = info;
      if (entries.length === 0) return;
      entries.sort((a, b) => a.sortAt - b.sortAt);

      const subscaleLabels = qDef?.subscaleLabels || {};
      const isHigherWorse = qDef?.scoringDirection === "higher_worse";

      // Pick the 3 most relevant subscales using the WORST value across the whole
      // history (not just the latest run) — otherwise a normalized last assessment
      // (all zeros) would produce an apparently empty chart.
      const worst = new Map<string, number>();
      entries.forEach((e) => {
        Object.entries(e.subscaleScores).forEach(([key, value]) => {
          if (!subscaleLabels[key] || value == null) return;
          const v = value as number;
          const prev = worst.get(key);
          if (prev == null) worst.set(key, v);
          else worst.set(key, isHigherWorse ? Math.max(prev, v) : Math.min(prev, v));
        });
      });

      const subscaleEntries = Array.from(worst.entries())
        .map(([key, score]) => ({ key, label: subscaleLabels[key]?.[lang] || key, score }))
        .sort((a, b) => (isHigherWorse ? b.score - a.score : a.score - b.score))
        .slice(0, 3);

      const contextLabel = contextLabels.slice(0, 2).join(" + ") + (contextLabels.length > 2 ? "…" : "");
      const displayTitle = contextLabel ? `${name} — ${contextLabel}` : name;
      const totalKey = `${name} (Total)`;
      let allZero = true;
      const data = entries.map((entry, i) => {
        const total = Math.round(entry.percentageScore);
        if (total > 0) allZero = false;
        const point: any = {
          index: i + 1,
          date: entry.date,
          context: entry.context,
          interpretation: entry.interpretation,
          [totalKey]: total,
        };
        subscaleEntries.forEach((sub) => {
          const subscaleValue = entry.subscaleScores[sub.key];
          const v = subscaleValue != null ? Math.round(subscaleValue as number) : 0;
          if (v > 0) allZero = false;
          point[sub.label] = v;
        });
        return point;
      });

      charts.push({
        name,
        displayTitle,
        contextLabel,
        totalKey,
        subscaleKeys: subscaleEntries.map((s) => ({ key: s.label, label: s.label })),
        allZero,
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

  // Empty state is now rendered INSIDE PatientListView so header + add button stay visible.



  // Patient list view
  if (!patient) {
    return (
      <PatientListView
        t={t}
        language={language}
        patients={patients}
        hiddenKeys={hiddenKeys}
        showHidden={showHidden}
        setShowHidden={setShowHidden}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        readOnly={readOnly}
        isDemo={isDemo}
        canAddPatient={canAddPatient}
        allowManualAssessment={allowManualAssessment}
        allowAssessmentLink={allowAssessmentLink}
        allowQuickNote={allowQuickNote}
        setEditPatientData={setEditPatientData}
        setAddPatientOpen={setAddPatientOpen}
        batchExporting={batchExporting}
        handleBatchExport={handleBatchExport}
        assessments={assessments}
        exerciseAdherence={exerciseAdherence}
        handleAcquireBadgeClick={handleAcquireBadgeClick}
        longPressFiredRef={longPressFiredRef}
        longPressTimerRef={longPressTimerRef}
        setLongPressPatient={setLongPressPatient}
        setSelectedEmail={setSelectedEmail}
        handleRestorePatient={handleRestorePatient}
        handleArchivePatient={handleArchivePatient}
        archiving={archiving}
        ensurePatientAssessmentToken={ensurePatientAssessmentToken}
        buildPersonalizedAssessmentLink={buildPersonalizedAssessmentLink}
        professionalId={professionalId}
        clinicId={clinicId}
        toast={toast}
        setQuickNotePatient={setQuickNotePatient}
        setQuickNoteContent={setQuickNoteContent}
        addPatientOpen={addPatientOpen}
        setAddPatientOpenState={setAddPatientOpen}
        editPatientData={editPatientData}
        manualAssessmentTarget={manualAssessmentTarget}
        setManualAssessmentTarget={setManualAssessmentTarget}
        quickNotePatient={quickNotePatient}
        setQuickNotePatientState={setQuickNotePatient}
        quickNoteContent={quickNoteContent}
        setQuickNoteContentState={setQuickNoteContent}
        handleQuickNoteSave={handleQuickNoteSave}
        quickNoteSaving={quickNoteSaving}
        longPressPatient={longPressPatient}
        setLongPressPatientState={setLongPressPatient}
        deleteConfirmPatient={deleteConfirmPatient}
        setDeleteConfirmPatient={setDeleteConfirmPatient}
        deletingPatient={deletingPatient}
        handleDeletePatient={handleDeletePatient}
      />
    );
  }

  // ── Evolution detail view ──

  return (
    <PatientDetailView
      t={t}
      language={language}
      patient={patient}
      deletingPatient={deletingPatient}
      setDeleteConfirmPatient={setDeleteConfirmPatient}
      latestWithDiagnosis={latestWithDiagnosis}
      professionalId={professionalId}
      clinicId={clinicId}
      buildAssessmentViewUrl={buildAssessmentViewUrl}
      toast={toast}
      setEditingHepId={setEditingHepId}
      setHepModalOpen={setHepModalOpen}
      evolutionLoading={evolutionLoading}
      setEvolutionLoading={setEvolutionLoading}
      isDemo={isDemo}
      professionalLogoUrl={professionalLogoUrl}
      clinicLogoUrl={clinicLogoUrl}
      clinicName={clinicName}
      clinicTherapists={clinicTherapists}
      readOnly={readOnly}
      allowManualAssessment={allowManualAssessment}
      reassignOpen={reassignOpen}
      setReassignOpen={setReassignOpen}
      reassignTargetId={reassignTargetId}
      setReassignTargetId={setReassignTargetId}
      reassigning={reassigning}
      handleReassignPatient={handleReassignPatient}
      hepModalOpen={hepModalOpen}
      editingHepId={editingHepId}
      hepHistory={hepHistory}
      handleEditHep={handleEditHep}
      handleSendHepViaChat={handleSendHepViaChat}
      deletingHepId={deletingHepId}
      handleDeleteHep={handleDeleteHep}
      treatmentSectionRef={treatmentSectionRef}
      treatmentHighlight={treatmentHighlight}
      lifetimeTreatment={lifetimeTreatment}
      setNotes={setNotes}
      getPendingTreatmentAssessments={getPendingTreatmentAssessments}
      latestAnamnesisFields={latestAnamnesisFields}
      latestAssessment={latestAssessment}
      painData={painData}
      selectedEmail={selectedEmail}
      questionnaireEvolution={questionnaireEvolution}
      assessmentRefreshTick={assessmentRefreshTick}
      showArchivedAssessments={showArchivedAssessments}
      setShowArchivedAssessments={setShowArchivedAssessments}
      getQuestionnaireResults={getQuestionnaireResults}
      onShareWhatsApp={onShareWhatsApp}
      onDownloadPdf={onDownloadPdf}
      archivingAssessmentId={archivingAssessmentId}
      handleRestoreAssessment={handleRestoreAssessment}
      handleArchiveAssessment={handleArchiveAssessment}
      deleteAssessmentTarget={deleteAssessmentTarget}
      setDeleteAssessmentTarget={setDeleteAssessmentTarget}
      deletingAssessmentId={deletingAssessmentId}
      handleDeleteAssessment={handleDeleteAssessment}
      noteSaving={noteSaving}
      notes={notes}
      saveNote={saveNote}
      noteIncludeInPdf={noteIncludeInPdf}
      toggleNoteInPdf={toggleNoteInPdf}
      treatmentPicker={treatmentPicker}
      setTreatmentPicker={setTreatmentPicker}
      deleteConfirmPatient={deleteConfirmPatient}
      handleDeletePatient={handleDeletePatient}
      handleAcquireBadgeClick={handleAcquireBadgeClick}
      setSelectedEmail={setSelectedEmail}
    />
  );
};


export default PatientEvolutionDashboard;

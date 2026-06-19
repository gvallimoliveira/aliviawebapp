import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Sparkles, ChevronLeft, ChevronRight, Save, AlertTriangle, Cloud, Lightbulb, Plus, Mic, Lock, Crown } from "lucide-react";
import { questionnaires, type QuestionnaireResult } from "@/data/questionnaireData";
import { regionsByView } from "@/components/assessment/painMapData";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import { useVoiceRecorderSession } from "@/contexts/VoiceRecorderContext";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import DraftResumeBanner from "@/components/common/DraftResumeBanner";
import { MOCK_MANUAL_CASE } from "@/data/mockManualAssessmentCase";
import SpecialtyQuestionnairesPanel, { type SpecialtyAppliedResult, type SpecialtyPanelHandle } from "./SpecialtyQuestionnairesPanel";
import RomTable, { createInitialRomRows, sanitizeRomRows, type RomRow } from "@/components/assessment/RomTable";
import StrengthTable, { createInitialStrengthRows, sanitizeStrengthRows, type StrengthRow } from "@/components/assessment/StrengthTable";

/**
 * In demo mode, wraps a form control with a transparent click overlay that
 * autofills the field with mock data instead of letting the user type.
 */
const DemoShield = ({
  on,
  onAutofill,
  children,
  label,
}: {
  on: boolean;
  onAutofill: () => void;
  children: React.ReactNode;
  label?: string;
}) => {
  if (!on) return <>{children}</>;
  return (
    <div className="relative group">
      {children}
      <button
        type="button"
        onClick={onAutofill}
        aria-label={label || "Preencher com caso simulado"}
        title={label || "Clique para preencher com o caso simulado"}
        className="absolute inset-0 z-10 rounded-md cursor-pointer bg-transparent hover:bg-primary/5 transition-colors"
      />
    </div>
  );
};

// ─── Body region grouping: proximal → distal, alphabetical within each group ───
type RegionGroup = { key: string; label_pt: string; label_en: string; ids: string[] };

const REGION_GROUPS_DEF: { key: string; label_pt: string; label_en: string; match: (id: string) => boolean }[] = [
  { key: "head_neck", label_pt: "Cabeça e Pescoço", label_en: "Head & Neck",
    match: (id) => id.startsWith("head") || id.startsWith("cervical") },
  { key: "trunk", label_pt: "Tronco (Tórax / Abdômen / Coluna)", label_en: "Trunk (Chest / Abdomen / Spine)",
    match: (id) => ["chest", "abdomen", "thoracic", "lower_back"].includes(id) || id.startsWith("thoracic_") || id.startsWith("lumbar_") },
  { key: "upper_proximal", label_pt: "Membro Superior — Proximal (Ombro / Braço)", label_en: "Upper Limb — Proximal (Shoulder / Arm)",
    match: (id) => id.includes("shoulder") || (id.includes("arm") && !id.includes("forearm")) },
  { key: "upper_distal", label_pt: "Membro Superior — Distal (Cotovelo / Antebraço / Mão)", label_en: "Upper Limb — Distal (Elbow / Forearm / Hand)",
    match: (id) => id.includes("elbow") || id.includes("forearm") || id.includes("hand") },
  { key: "pelvis_hip", label_pt: "Pelve e Quadril (incl. Glúteo)", label_en: "Pelvis & Hip (incl. Gluteal)",
    match: (id) => id.includes("hip") || id.includes("gluteal") },
  { key: "lower_proximal", label_pt: "Membro Inferior — Proximal (Coxa / Joelho)", label_en: "Lower Limb — Proximal (Thigh / Knee)",
    match: (id) => id.includes("thigh") || id.includes("knee") },
  { key: "lower_distal", label_pt: "Membro Inferior — Distal (Perna / Panturrilha / Tornozelo / Pé)", label_en: "Lower Limb — Distal (Leg / Calf / Ankle / Foot)",
    match: (id) => id.includes("shin") || id.includes("calf") || id.includes("ankle") || id.includes("foot") },
];

interface ManualAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string;
  /** When provided, the modal edits this existing assessment instead of creating a new one. */
  editAssessment?: any | null;
  /** Called after a successful save (insert or update). */
  onSaved?: (assessmentId: string) => void;
  /**
   * When true, the modal becomes a non-functional preview used in demo dashboards:
   * - Inputs cannot be typed; clicking a field auto-fills it with mock data.
   * - No supabase writes, no AI calls, no draft persistence, no voice recorder FAB.
   * - Save/AI buttons show an upsell toast instead of triggering real flows.
   */
  demoMode?: boolean;
}

const RED_FLAGS_PT = [
  "Perda de força progressiva",
  "Perda de sensibilidade em sela (períneo)",
  "Incontinência urinária/fecal recente",
  "Febre persistente associada à dor",
  "Perda de peso inexplicada",
  "Dor noturna intensa que não alivia",
  "Trauma significativo recente",
  "História de câncer",
];

const STEPS = [
  { id: "anamnese", label: "Anamnese" },
  { id: "dor", label: "Dor & Mapa" },
  { id: "redflags", label: "Red Flags" },
  { id: "questionarios", label: "Questionários" },
  { id: "testes", label: "Testes & ADM" },
  { id: "dinamometria", label: "Dinamometria" },
  { id: "diagnostico", label: "Diagnóstico" },
];

const ManualAssessmentModal = ({ open, onOpenChange, professionalId, clinicId, patientName, patientEmail, editAssessment, onSaved, demoMode = false }: ManualAssessmentModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";

  const [step, setStep] = useState(0);

  // Attach a voice-recorder session at the App-level FAB while the modal is
  // open. Lives outside the modal subtree so step navigation never resets it.
  // Skipped in demo mode — the FAB is replaced by an inline mock.
  useVoiceRecorderSession(open && !demoMode, { professionalId, clinicId, patientName });

  // Demo-mode voice recorder simulation state
  const [demoVoiceRecording, setDemoVoiceRecording] = useState(false);
  const [demoVoiceNoteShown, setDemoVoiceNoteShown] = useState(false);

  const [saving, setSaving] = useState(false);
  const [generatingDx, setGeneratingDx] = useState(false);
  const [generatingTx, setGeneratingTx] = useState(false);
  const [generatingCi, setGeneratingCi] = useState(false);
  const [aiClinicalImpression, setAiClinicalImpression] =
    useState<{ overview: string; therapeuticObjectives: string[] } | null>(null);

  // Anamnese
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [additionalComplaint, setAdditionalComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [duration, setDuration] = useState("");
  const [onset, setOnset] = useState("");
  const [aggravating, setAggravating] = useState("");
  const [relieving, setRelieving] = useState("");
  const [medications, setMedications] = useState("");
  const [previousSurgeries, setPreviousSurgeries] = useState("");
  const [comorbidities, setComorbidities] = useState("");
  const [occupation, setOccupation] = useState("");
  const [complementaryExams, setComplementaryExams] = useState("");

  // Dor
  const [painScore, setPainScore] = useState<number>(5);
  const [painType, setPainType] = useState("");
  const [painRegions, setPainRegions] = useState<string[]>([]);
  // Per-region pain score (0-10). Filled automatically when the user marks a
  // region (defaults to the general slider value) and editable via per-region
  // sliders. Used both for the comparison view (RegionPainComparison reads
  // `anamnesis_data.painScoresPerRegion`) and to derive the aggregate
  // `pain_score` saved on the row (max of per-region scores).
  const [painScoresPerRegion, setPainScoresPerRegion] = useState<Record<string, number>>({});

  // Red Flags
  const [redFlagsChecked, setRedFlagsChecked] = useState<string[]>([]);

  // Questionários (mesmo fluxo da avaliação premium/link)
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [specialtyApplied, setSpecialtyApplied] = useState<SpecialtyAppliedResult[]>([]);
  const specialtyPanelRef = useRef<SpecialtyPanelHandle | null>(null);

  // Testes
  const [functionalTests, setFunctionalTests] = useState("");
  const [romTable, setRomTable] = useState<RomRow[]>(createInitialRomRows(2));
  const [strengthTable, setStrengthTable] = useState<StrengthRow[]>(createInitialStrengthRows(2));
  const [testSuggestions, setTestSuggestions] = useState<Array<{ name: string; category: string; rationale: string }>>([]);
  const [suggestingTests, setSuggestingTests] = useState(false);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

  // Diagnóstico
  const [clinicalImpression, setClinicalImpression] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  // Full AI diagnosis payload (hypothesis, summary, reasoning, confidence) — used on save
  // so the hypothesis is the AI's actual hypothesis, not the first line of a JSON dump
  // or a fallback to the clinical impression text.
  const [aiDiagnosis, setAiDiagnosis] = useState<any | null>(null);

  // Tratamento
  const [treatmentText, setTreatmentText] = useState("");
  const [aiTreatment, setAiTreatment] = useState<any | null>(null);

  // Build region groups: dedupe by id, sort alphabetically by current language label
  const regionGroups: RegionGroup[] = (() => {
    const seen = new Map<string, { label_pt: string; label_en: string }>();
    for (const view of Object.values(regionsByView)) {
      for (const r of view) {
        if (!seen.has(r.id)) seen.set(r.id, { label_pt: r.label_pt, label_en: r.label_en });
      }
    }
    return REGION_GROUPS_DEF.map((g) => {
      const ids = Array.from(seen.keys())
        .filter((id) => g.match(id))
        .sort((a, b) => {
          const la = isPt ? seen.get(a)!.label_pt : seen.get(a)!.label_en;
          const lb = isPt ? seen.get(b)!.label_pt : seen.get(b)!.label_en;
          return la.localeCompare(lb, isPt ? "pt-BR" : "en");
        });
      return { key: g.key, label_pt: g.label_pt, label_en: g.label_en, ids };
    }).filter((g) => g.ids.length > 0);
  })();
  const regionLabelMap: Record<string, { label_pt: string; label_en: string }> = (() => {
    const m: Record<string, { label_pt: string; label_en: string }> = {};
    for (const view of Object.values(regionsByView)) {
      for (const r of view) if (!m[r.id]) m[r.id] = { label_pt: r.label_pt, label_en: r.label_en };
    }
    return m;
  })();

  const toggleRegion = (id: string) => {
    if (demoMode) {
      // In demo mode, clicking any region toggles the mock pain regions as a group.
      setPainRegions((prev) =>
        prev.length === 0 ? MOCK_MANUAL_CASE.painRegions : [],
      );
      return;
    }
    setPainRegions((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      setPainScoresPerRegion((m) => {
        const out = { ...m };
        if (next.includes(id) && out[id] === undefined) out[id] = painScore;
        if (!next.includes(id)) delete out[id];
        return out;
      });
      return next;
    });
  };

  const setRegionPainScore = (id: string, v: number) => {
    setPainScoresPerRegion((m) => ({ ...m, [id]: v }));
  };

  // ── Demo-mode helpers ──────────────────────────────────────────────────────
  const demoUpsellToast = () => {
    toast({
      title: isPt ? "Disponível no plano PRO" : "Available on PRO plan",
      description: isPt
        ? "Esta é uma demonstração. Assine o PRO para usar com pacientes reais."
        : "This is a preview. Subscribe to PRO to use with real patients.",
    });
  };

  // Auto-fills a single field with mock data. If already filled with the mock,
  // clears it so multiple clicks produce a satisfying toggle.
  const autofill = <T,>(current: T, mockValue: T, setter: (v: T) => void, empty: T) => {
    const isFilled = JSON.stringify(current) === JSON.stringify(mockValue);
    setter(isFilled ? empty : mockValue);
  };

  const startDemoVoiceRecording = () => {
    if (demoVoiceRecording) return;
    setDemoVoiceRecording(true);
    toast({
      title: isPt ? "Gravando (simulação)" : "Recording (simulation)",
      description: isPt
        ? "Na versão PRO real, a IA transcreve e resume sua fala direto no prontuário."
        : "In real PRO, AI transcribes and summarizes your speech into the chart.",
    });
    setTimeout(() => {
      setDemoVoiceRecording(false);
      setDemoVoiceNoteShown(true);
    }, 2800);
  };

  // ── Autosave (local + nuvem) ───────────────────────────────────────────────
  const isEditing = !!editAssessment?.id;
  const draftScopeKey = open && !isEditing
    ? `${professionalId}:${(patientEmail || patientName || "").toLowerCase().trim()}`
    : null;
  const draftState = {
    step, chiefComplaint, additionalComplaint, history, duration, onset, aggravating, relieving,
    medications, previousSurgeries, comorbidities, occupation, complementaryExams,
    painScore, painType, painRegions, painScoresPerRegion, redFlagsChecked, questionnaireResults,
    functionalTests, romTable, strengthTable, clinicalImpression, diagnosisText, treatmentText,
    aiClinicalImpression,
  };
  const draft = useAutosaveDraft<typeof draftState>({
    formKey: "manual_assessment",
    scopeKey: draftScopeKey,
    state: draftState,
    enabled: open && !isEditing && !demoMode,
  });
  const handleRestoreDraft = () => {
    const p = draft.restore();
    if (!p) return;
    setStep(p.step ?? 0);
    setChiefComplaint(p.chiefComplaint ?? "");
    setAdditionalComplaint(p.additionalComplaint ?? "");
    setHistory(p.history ?? "");
    setDuration(p.duration ?? "");
    setOnset(p.onset ?? "");
    setAggravating(p.aggravating ?? "");
    setRelieving(p.relieving ?? "");
    setMedications(p.medications ?? "");
    setPreviousSurgeries(p.previousSurgeries ?? "");
    setComorbidities(p.comorbidities ?? "");
    setOccupation(p.occupation ?? "");
    setComplementaryExams(p.complementaryExams ?? "");
    setPainScore(p.painScore ?? 5);
    setPainType(p.painType ?? "");
    setPainRegions(p.painRegions ?? []);
    setPainScoresPerRegion(p.painScoresPerRegion ?? {});
    setRedFlagsChecked(p.redFlagsChecked ?? []);
    setQuestionnaireResults(p.questionnaireResults ?? []);
    setFunctionalTests(p.functionalTests ?? "");
    setRomTable(Array.isArray(p.romTable) && p.romTable.length > 0 ? p.romTable : createInitialRomRows(2));
    setStrengthTable(Array.isArray(p.strengthTable) && p.strengthTable.length > 0 ? p.strengthTable : createInitialStrengthRows(2));
    setClinicalImpression(p.clinicalImpression ?? "");
    setDiagnosisText(p.diagnosisText ?? "");
    setTreatmentText(p.treatmentText ?? "");
    setAiClinicalImpression(p.aiClinicalImpression ?? null);
  };

  // Prefill from existing assessment when editing
  const prefilledIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !editAssessment?.id) return;
    if (prefilledIdRef.current === editAssessment.id) return;
    prefilledIdRef.current = editAssessment.id;
    const a = editAssessment;
    const an = a.anamnesis_data || {};
    setStep(0);
    // Only use customComplaint as fallback for chiefComplaint if chiefComplaint is missing
    // (legacy rows duplicated both fields). Otherwise customComplaint is its own field.
    setChiefComplaint(an.chiefComplaint || (Array.isArray(an.chiefComplaints) ? an.chiefComplaints[0] : "") || an.customComplaint || "");
    setAdditionalComplaint(
      an.customComplaint && an.customComplaint !== an.chiefComplaint ? an.customComplaint : ""
    );
    setHistory(an.history || "");
    setDuration(an.duration || an.painDuration || "");
    setOnset(an.onset || "");
    setAggravating(an.aggravatingFactors || "");
    setRelieving(an.relievingFactors || "");
    setMedications(an.medications || "");
    setPreviousSurgeries(an.previousSurgeries || an.previousTreatments || "");
    setComorbidities(an.comorbidities || "");
    setOccupation(an.occupation || "");
    setComplementaryExams(an.complementaryExams || "");
    setPainScore(typeof a.pain_score === "number" ? a.pain_score : 5);
    setPainType(an.painType || (Array.isArray(an.painTypes) ? an.painTypes[0] : "") || "");
    setPainRegions(Array.isArray(a.pain_regions) ? a.pain_regions : []);
    setPainScoresPerRegion(
      an.painScoresPerRegion && typeof an.painScoresPerRegion === "object"
        ? (an.painScoresPerRegion as Record<string, number>)
        : (an.pain_scores_per_region && typeof an.pain_scores_per_region === "object"
            ? (an.pain_scores_per_region as Record<string, number>)
            : {}),
    );
    setRedFlagsChecked(Array.isArray(a.red_flags?.detected) ? a.red_flags.detected : []);
    setQuestionnaireResults(Array.isArray(a.test_results) ? a.test_results : []);
    setSpecialtyApplied(Array.isArray(an?.specialtyResults) ? an.specialtyResults : []);
    setFunctionalTests(an.functionalTests || "");
    setRomTable(Array.isArray(an.romTable) && an.romTable.length > 0 ? an.romTable : createInitialRomRows(2));
    setStrengthTable(Array.isArray(an.strengthTable) && an.strengthTable.length > 0 ? an.strengthTable : createInitialStrengthRows(2));
    const dx = a.diagnosis || {};
    setAiDiagnosis(dx && (dx.hypothesis || dx.summary) ? dx : null);
    const ci = dx.clinicalImpression;
    setAiClinicalImpression(ci?.overview ? ci : null);
    setClinicalImpression(ci?.overview || "");
    const dxParts: string[] = [];
    if (dx.hypothesis) dxParts.push(String(dx.hypothesis));
    if (dx.summary && dx.summary !== dx.hypothesis) dxParts.push("", String(dx.summary));
    if (dx.reasoning) dxParts.push("", String(dx.reasoning));
    setDiagnosisText(dx.text || dxParts.join("\n"));
    const tx = a.treatment_plan || null;
    setAiTreatment(tx && typeof tx === "object" ? tx : null);
    setTreatmentText(tx?.text || tx?.summary || "");
  }, [open, editAssessment]);
  useEffect(() => { if (!open) prefilledIdRef.current = null; }, [open]);





  const toggleRedFlag = (rf: string) => {
    if (demoMode) {
      // Caso simulado não tem red flags — apenas avisa.
      toast({
        title: isPt ? "Caso simulado sem red flags" : "Mock case has no red flags",
        description: isPt
          ? "Em casos reais, marcar qualquer sinal interrompe a avaliação e sugere encaminhamento médico."
          : "In real cases, checking any sign aborts assessment and suggests medical referral.",
      });
      return;
    }
    setRedFlagsChecked((prev) => prev.includes(rf) ? prev.filter((r) => r !== rf) : [...prev, rf]);
  };

  const generateAIClinicalImpression = async () => {
    if (demoMode) { demoUpsellToast(); return; }
    setGeneratingCi(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-clinical-impression", {
        body: {
          anamnesisData: buildAnamnesisData(),
          painRegions,
          painScore,
          questionnaireResults,
          diagnosis: diagnosisText
            ? { hypothesis: diagnosisText.split("\n")[0]?.slice(0, 280), summary: diagnosisText }
            : (clinicalImpression ? { summary: clinicalImpression } : null),
          language,
        },
      });
      if (error) throw error;
      const ci = data?.clinicalImpression;
      if (!ci?.overview) throw new Error("Empty AI response");
      setAiClinicalImpression(ci);
      // Reflect overview into the editable text field for convenience
      setClinicalImpression(ci.overview);
      toast({ title: isPt ? "Impressão clínica gerada!" : "Clinical impression generated!" });
    } catch (err: any) {
      console.error("Clinical impression error:", err);
      toast({
        title: isPt ? "Erro na IA" : "AI error",
        description: err?.message || (isPt ? "Não foi possível gerar a impressão clínica." : "Could not generate clinical impression."),
        variant: "destructive",
      });
    } finally {
      setGeneratingCi(false);
    }
  };


  // IMPORTANT: keep keys in camelCase to match the rest of the app
  // (AssessmentView, generatePdf, generate-clinical-impression, ResumeSummary, etc.)
  const buildAnamnesisData = () => ({
    manualEntry: true,
    // Chief complaint — store both the array form (used by AssessmentView/Resume/Pro dashboards)
    // and the legacy single string for backward compatibility.
    chiefComplaints: chiefComplaint ? [chiefComplaint] : [],
    chiefComplaint,
    customComplaint: additionalComplaint,
    additionalComplaint,
    history,
    duration,
    painDuration: duration,
    onset,
    aggravatingFactors: aggravating,
    relievingFactors: relieving,
    medications,
    previousSurgeries,
    previousTreatments: previousSurgeries,
    comorbidities,
    occupation,
    complementaryExams,
    painType,
    painTypes: painType ? [painType] : [],
    // Per-region pain scores (used by Comparação de Dor por Região).
    painScoresPerRegion,
    functionalTests, // free-text observations from Step 4 (kept inside anamnesis_data so it persists and shows up in views)
    romTable: sanitizeRomRows(romTable), // Joint mobility / ROM table
    strengthTable: sanitizeStrengthRows(strengthTable), // Dynamometry / muscle strength
    patientName,
    patientEmail: patientEmail || null,
    // Specialty (cardio/geri) results applied inline during this session.
    specialtyResults: specialtyApplied.length > 0 ? specialtyApplied : undefined,
  });

  const generateAIDiagnosis = async () => {
    if (demoMode) { demoUpsellToast(); return; }
    setGeneratingDx(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: {
          // Edge function expects `anamnesisData` (not `anamnesis`) and reads
          // painRegions / painScore / painTypes from inside it.
          anamnesisData: {
            ...buildAnamnesisData(),
            painRegions,
            painScore,
            painTypes: painType ? [painType] : [],
            redFlags: redFlagsChecked,
          },
          questionnaireResults,
          redFlags: redFlagsChecked,
          mode: "professional",
          language,
        },
      });
      if (error) throw error;
      const dx = data?.diagnosis || data;
      if (dx && typeof dx === "object" && (dx.hypothesis || dx.summary)) {
        setAiDiagnosis(dx);
        const parts: string[] = [];
        if (dx.hypothesis) parts.push(String(dx.hypothesis));
        if (dx.summary) parts.push("", String(dx.summary));
        if (dx.reasoning) parts.push("", String(dx.reasoning));
        setDiagnosisText(parts.join("\n"));
      } else {
        setAiDiagnosis(null);
        setDiagnosisText(typeof dx === "string" ? dx : JSON.stringify(dx, null, 2));
      }
      toast({ title: isPt ? "Diagnóstico gerado!" : "Diagnosis generated!" });
    } catch (err: any) {
      toast({ title: isPt ? "Erro na IA" : "AI error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingDx(false);
    }
  };

  const generateAITreatment = async () => {
    if (demoMode) { demoUpsellToast(); return; }
    setGeneratingTx(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-treatment", {
        body: {
          anamnesisData: {
            ...buildAnamnesisData(),
            painRegions,
            painScore,
          },
          questionnaireResults,
          diagnosis: aiDiagnosis || (diagnosisText ? { summary: diagnosisText } : null),
          mode: "professional",
          language,
        },
      });
      if (error) throw error;
      const tx = data?.treatment_plan || data?.treatment || data;
      if (tx && typeof tx === "object") {
        setAiTreatment(tx);
        // Build a readable summary; keep the full object on save.
        if (typeof tx.summary === "string") setTreatmentText(tx.summary);
        else setTreatmentText(JSON.stringify(tx, null, 2));
      } else {
        setAiTreatment(null);
        setTreatmentText(typeof tx === "string" ? tx : JSON.stringify(tx, null, 2));
      }
      toast({ title: isPt ? "Plano gerado!" : "Plan generated!" });
    } catch (err: any) {
      toast({ title: isPt ? "Erro na IA" : "AI error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingTx(false);
    }
  };

  const generateTestSuggestions = async () => {
    if (demoMode) { demoUpsellToast(); return; }
    setSuggestingTests(true);
    try {
      const anamnesisSummary = [
        chiefComplaint && `Queixa principal: ${chiefComplaint}`,
        history && `História: ${history}`,
        duration && `Duração: ${duration}`,
        onset && `Início: ${onset}`,
        aggravating && `Piora com: ${aggravating}`,
        relieving && `Alivia com: ${relieving}`,
        occupation && `Ocupação: ${occupation}`,
        comorbidities && `Comorbidades: ${comorbidities}`,
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("suggest-functional-tests", {
        body: {
          anamnesis: anamnesisSummary,
          painScore,
          painType,
          painRegions: painRegions.map((id) => regionLabelMap[id]?.[isPt ? "label_pt" : "label_en"] || id),
          redFlags: redFlagsChecked,
          questionnaireResults: questionnaireResults.map((r) => ({
            name: r.questionnaireName,
            score: r.totalScore,
            severity: r.severity,
            interpretation: isPt ? r.interpretation_pt : r.interpretation_en,
          })),
          currentTestsText: functionalTests,
          language,
        },
      });
      if (error) throw error;
      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      if (list.length === 0) throw new Error(isPt ? "Sem sugestões." : "No suggestions.");
      setTestSuggestions(list);
      setAddedSuggestions(new Set());
    } catch (err: any) {
      toast({
        title: isPt ? "Erro ao gerar sugestões" : "Error generating suggestions",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSuggestingTests(false);
    }
  };

  const addSuggestionToTests = (s: { name: string; rationale: string }) => {
    const line = `- ${s.name}: `;
    setFunctionalTests((prev) => (prev ? `${prev.trimEnd()}\n${line}` : line));
    setAddedSuggestions((prev) => new Set(prev).add(s.name));
  };

  const handleSave = async (navigateAfter: boolean = false) => {
    if (demoMode) { demoUpsellToast(); return; }
    if (!patientName.trim()) {
      toast({ title: isPt ? "Nome do paciente é obrigatório" : "Patient name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const row: any = {
        type: "professional",
        status: "completed",
        patient_name: patientName,
        patient_email: patientEmail || null,
        anamnesis_data: buildAnamnesisData(),
        pain_regions: painRegions,
        // Aggregate pain_score = highest per-region score (clinically the most
        // representative) when per-region values exist; otherwise the slider value.
        pain_score: (() => {
          const vals = painRegions
            .map((r) => painScoresPerRegion[r])
            .filter((v): v is number => typeof v === "number");
          return vals.length > 0 ? Math.max(...vals) : painScore;
        })(),
        red_flags: redFlagsChecked.length > 0 ? { detected: redFlagsChecked } : null,
        // test_results MUST be an array of questionnaire results — that's what AssessmentView,
        // generatePdf and clinical-impression all expect. Free-text functional observations
        // already live inside anamnesis_data.functionalTests.
        test_results: questionnaireResults.map((r) => {
          const q = questionnaires.find((qq) => qq.id === r.questionnaireId);
          return {
            questionnaireId: r.questionnaireId,
            questionnaireName: r.questionnaireName,
            fullName_pt: q?.fullName_pt,
            fullName_en: q?.fullName_en,
            answers: r.answers,
            subscaleScores: r.subscaleScores,
            totalScore: r.totalScore,
            maxScore: r.maxScore,
            percentageScore: r.percentageScore,
            interpretation_pt: r.interpretation_pt,
            interpretation_en: r.interpretation_en,
            severity: r.severity,
          };
        }),
        // Diagnosis: prefer the AI-generated hypothesis when available. We must NEVER
        // fall back to the clinical impression for the hypothesis — the hypothesis is
        // a distinct clinical concept and using the impression as a stand-in produced
        // misleading diagnoses in the chart/PDF.
        diagnosis: (aiDiagnosis || diagnosisText || clinicalImpression)
          ? (() => {
              const aiHyp = aiDiagnosis?.hypothesis?.toString().trim();
              const firstLine = diagnosisText.split("\n").map((l) => l.trim()).find(Boolean) || "";
              // Avoid leaking raw JSON braces as hypothesis text.
              const cleanFirst = firstLine.startsWith("{") || firstLine.startsWith("[")
                ? "" : firstLine;
              const hypothesis = aiHyp || cleanFirst || null;
              return {
                manual: true,
                ...(aiDiagnosis || {}),
                hypothesis: hypothesis ? hypothesis.slice(0, 280) : null,
                summary: aiDiagnosis?.summary || diagnosisText || clinicalImpression || null,
                text: diagnosisText || null,
                clinicalImpression: aiClinicalImpression
                  ? aiClinicalImpression
                  : (clinicalImpression
                      ? { overview: clinicalImpression, therapeuticObjectives: [] }
                      : undefined),
              };
            })()
          : null,
        // Treatment plan: keep the manual flag, the AI structured payload when present,
        // and the free text under both `text` and `summary` so PDF/AssessmentView can render it.
        treatment_plan: (aiTreatment || treatmentText)
          ? {
              manual: true,
              ...(aiTreatment || {}),
              text: treatmentText || null,
              summary: aiTreatment?.summary || treatmentText || null,
            }
          : null,
      };
      if (clinicId) row.clinic_id = clinicId;
      else row.professional_id = professionalId;

      let savedId: string | undefined;
      if (isEditing && editAssessment?.id) {
        const { data, error } = await supabase
          .from("assessments")
          .update(row)
          .eq("id", editAssessment.id)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data?.id;
      } else {
        const { data, error } = await supabase.from("assessments").insert(row).select("id").single();
        if (error) throw error;
        savedId = data?.id;

        // Attach any unlinked voice notes from this professional for this patient
        // (matched by name) to the freshly-created assessment. We don't gate by
        // a tight time window because the professional may finalize days after
        // recording (draft resumed from cloud backup).
        if (savedId && user?.id) {
          const trimmedName = (patientName || "").trim();
          let q = supabase
            .from("assessment_voice_notes")
            .update({ assessment_id: savedId })
            .eq("created_by", user.id)
            .eq("professional_id", professionalId)
            .is("assessment_id", null);
          if (trimmedName) q = q.ilike("patient_name", trimmedName);
          await q;
        }

      }

      // Persist scheduled specialty questionnaires as pending rows tied to this assessment.
      if (savedId) {
        const pendingItems = specialtyPanelRef.current?.getScheduled() || [];
        const toInsert = pendingItems.filter((p) => !p.share_token);
        if (toInsert.length > 0) {
          try {
            await supabase.from("pending_questionnaires" as any).insert(
              toInsert.map((p) => ({
                assessment_id: savedId,
                professional_id: clinicId ? null : professionalId,
                clinic_id: clinicId || null,
                questionnaire_id: p.questionnaireId,
                domain: p.domain,
                suggested_reason: p.suggestedReason,
                status: "pending",
              })),
            );
          } catch (err) {
            console.warn("pending questionnaires insert failed:", err);
          }
        }
      }

      toast({ title: isEditing ? (isPt ? "Avaliação atualizada!" : "Assessment updated!") : (isPt ? "Avaliação criada!" : "Assessment created!") });
      if (!isEditing) void draft.discard();
      if (savedId) onSaved?.(savedId);
      onOpenChange(false);
      resetForm();
      if (navigateAfter && savedId && !isEditing) navigate(`/assessment/view/${savedId}?from=professional`);
    } catch (err: any) {
      console.error("Save assessment error:", err);
      toast({ title: isPt ? "Erro ao salvar" : "Save error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setChiefComplaint(""); setHistory(""); setDuration(""); setOnset("");
    setAggravating(""); setRelieving(""); setMedications(""); setPreviousSurgeries("");
    setComorbidities(""); setOccupation(""); setPainScore(5); setPainType("");
    setPainRegions([]); setPainScoresPerRegion({}); setRedFlagsChecked([]); setQuestionnaireResults([]);
    setFunctionalTests(""); setClinicalImpression(""); setAiClinicalImpression(null);
    setDiagnosisText(""); setTreatmentText(""); setAiDiagnosis(null); setAiTreatment(null);
    setSpecialtyApplied([]);
  };

  const stepLabels = isPt
    ? ["Anamnese", "Dor & Mapa", "Red Flags", "Questionários", "Testes & ADM", "Dinamometria", "Diagnóstico"]
    : ["Anamnesis", "Pain & Map", "Red Flags", "Questionnaires", "Tests & ROM", "Dynamometry", "Diagnosis"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent data-manual-assessment-modal=""
        className="max-w-3xl h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => {
          // Keep the modal open when the user interacts with the floating
          // voice-recorder FAB (rendered as a sibling portal on document.body).
          const target = e.target as HTMLElement | null;
          if (target?.closest?.("[data-voice-recorder-fab]")) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest?.("[data-voice-recorder-fab]")) e.preventDefault();
        }}
      >
        <div className="px-6 pt-6 pb-2 shrink-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isEditing ? (isPt ? "Editar Avaliação" : "Edit Assessment") : (isPt ? "Avaliação Manual" : "Manual Assessment")} — {patientName}
          </DialogTitle>
          <DialogDescription>
            {isPt
              ? `Etapa ${step + 1} de ${STEPS.length}: ${stepLabels[step]}`
              : `Step ${step + 1} of ${STEPS.length}: ${stepLabels[step]}`}
          </DialogDescription>
        </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1 px-1 mt-3">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="space-y-4 py-4">
            {demoMode && (
              <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/15 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">{isPt ? "Modo demonstração" : "Demo mode"}</p>
                    <p className="leading-snug">
                      {isPt
                        ? "Para evitar uso indevido, os campos não aceitam digitação. Clique em qualquer campo para preenchê-lo com um caso simulado e avance pelas etapas para conhecer o fluxo. Assine PRO para usar com pacientes reais."
                        : "To prevent misuse, fields can't be typed in. Click any field to auto-fill it with a simulated case and walk through the steps. Subscribe to PRO to use with real patients."}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!demoMode && draft.hasDraft && draft.draftMeta && (
              <DraftResumeBanner
                updatedAt={draft.draftMeta.updatedAt}
                source={draft.draftMeta.source}
                onRestore={handleRestoreDraft}
                onDiscard={() => void draft.discard()}
              />
            )}

            {/* Demo voice recorder: floating FAB mock lives at the end of DialogContent */}


            {/* STEP 0: ANAMNESE */}
            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{isPt ? "Queixa principal" : "Chief complaint"} *</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(chiefComplaint, MOCK_MANUAL_CASE.chiefComplaint, setChiefComplaint, "")}>
                    <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={2}
                      placeholder={isPt ? "Ex: Dor lombar à esquerda há 3 semanas" : "E.g. Left lumbar pain for 3 weeks"} className="mt-1 text-sm" />
                  </DemoShield>
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Queixa adicional" : "Additional complaint"}</Label>
                  <Textarea
                    value={additionalComplaint}
                    onChange={(e) => setAdditionalComplaint(e.target.value.slice(0, 300))}
                    rows={2}
                    placeholder={isPt ? "Ex.: também refere formigamento ocasional na panturrilha" : "E.g. also reports occasional calf tingling"}
                    className="mt-1 text-sm"
                    disabled={demoMode}
                    maxLength={300}
                  />
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Histórico" : "History"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(history, MOCK_MANUAL_CASE.history, setHistory, "")}>
                    <Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} className="mt-1 text-sm" />
                  </DemoShield>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Tempo de evolução" : "Duration"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(duration, MOCK_MANUAL_CASE.duration, setDuration, "")}>
                      <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 text-sm h-9" />
                    </DemoShield>
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Início" : "Onset"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(onset, MOCK_MANUAL_CASE.onset, setOnset, "")}>
                      <Select value={onset} onValueChange={setOnset}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sudden">{isPt ? "Súbito" : "Sudden"}</SelectItem>
                          <SelectItem value="gradual">{isPt ? "Gradual" : "Gradual"}</SelectItem>
                          <SelectItem value="trauma">{isPt ? "Trauma" : "Trauma"}</SelectItem>
                          <SelectItem value="post_surgery">{isPt ? "Pós-operatório" : "Post-operative"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </DemoShield>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Fatores agravantes" : "Aggravating factors"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(aggravating, MOCK_MANUAL_CASE.aggravating, setAggravating, "")}>
                      <Textarea value={aggravating} onChange={(e) => setAggravating(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </DemoShield>
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Fatores aliviantes" : "Relieving factors"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(relieving, MOCK_MANUAL_CASE.relieving, setRelieving, "")}>
                      <Textarea value={relieving} onChange={(e) => setRelieving(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </DemoShield>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Medicações em uso" : "Current medications"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(medications, MOCK_MANUAL_CASE.medications, setMedications, "")}>
                      <Textarea value={medications} onChange={(e) => setMedications(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </DemoShield>
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Cirurgias prévias" : "Previous surgeries"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(previousSurgeries, MOCK_MANUAL_CASE.previousSurgeries, setPreviousSurgeries, "")}>
                      <Textarea value={previousSurgeries} onChange={(e) => setPreviousSurgeries(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </DemoShield>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Comorbidades" : "Comorbidities"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(comorbidities, MOCK_MANUAL_CASE.comorbidities, setComorbidities, "")}>
                      <Input value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} className="mt-1 text-sm h-9" />
                    </DemoShield>
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Ocupação" : "Occupation"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(occupation, MOCK_MANUAL_CASE.occupation, setOccupation, "")}>
                      <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="mt-1 text-sm h-9" />
                    </DemoShield>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Exames complementares" : "Complementary exams"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(complementaryExams, MOCK_MANUAL_CASE.complementaryExams, setComplementaryExams, "")}>
                    <Textarea
                      value={complementaryExams}
                      onChange={(e) => setComplementaryExams(e.target.value.slice(0, 2000))}
                      rows={3}
                      placeholder={isPt
                        ? "Ex.: RM lombar (2025) — protrusão discal L4-L5 sem compressão radicular; Rx de joelho normal"
                        : "E.g. Lumbar MRI (2025) — L4-L5 disc protrusion without root compression; Knee X-ray normal"}
                      className="mt-1 text-sm"
                      maxLength={2000}
                    />
                  </DemoShield>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isPt
                      ? "Liste exames de imagem, laboratoriais ou outros relevantes."
                      : "List imaging, lab or other relevant exams."}
                  </p>
                </div>
              </div>
            )}


            {/* STEP 1: DOR */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">{isPt ? "Intensidade geral da dor (0-10)" : "Overall pain intensity (0-10)"}: <span className="font-bold text-primary">{painScore}</span></Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(painScore, MOCK_MANUAL_CASE.painScore, setPainScore, 5)}>
                    <Slider value={[painScore]} onValueChange={(v) => setPainScore(v[0])} min={0} max={10} step={1} className="mt-2" />
                  </DemoShield>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isPt
                      ? "Valor padrão atribuído a cada nova região marcada. Ajuste a nota individual de cada região logo abaixo."
                      : "Default score for each newly marked region. Adjust per-region scores below."}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Tipo de dor" : "Pain type"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(painType, MOCK_MANUAL_CASE.painType, setPainType, "")}>
                    <Select value={painType} onValueChange={setPainType}>
                      <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">{isPt ? "Local" : "Local"}</SelectItem>
                        <SelectItem value="radiating">{isPt ? "Irradiada" : "Radiating"}</SelectItem>
                        <SelectItem value="burning">{isPt ? "Queimação" : "Burning"}</SelectItem>
                        <SelectItem value="tingling">{isPt ? "Formigamento" : "Tingling"}</SelectItem>
                        <SelectItem value="throbbing">{isPt ? "Latejante" : "Throbbing"}</SelectItem>
                        <SelectItem value="stabbing">{isPt ? "Pontada" : "Stabbing"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </DemoShield>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">{isPt ? "Regiões com dor (proximais → distais, em ordem alfabética)" : "Pain regions (proximal → distal, alphabetical)"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => toggleRegion("")}>
                    <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-3">
                      {regionGroups.map((g) => (
                        <div key={g.key}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                            {isPt ? g.label_pt : g.label_en}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {g.ids.map((id) => {
                              const lbl = regionLabelMap[id];
                              return (
                                <label key={id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                                  <Checkbox checked={painRegions.includes(id)} onCheckedChange={() => toggleRegion(id)} />
                                  <span>{isPt ? lbl.label_pt : lbl.label_en}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DemoShield>
                  {painRegions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{painRegions.length} {isPt ? "selecionadas" : "selected"}</p>
                  )}
                </div>

                {/* Per-region pain sliders — appear only after the user marks regions */}
                {painRegions.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      {isPt ? "Nota de dor por região (0-10)" : "Pain score per region (0-10)"}
                    </Label>
                    <p className="text-[11px] text-muted-foreground -mt-1">
                      {isPt
                        ? "Cada região marcada recebe sua própria nota. Isso permite comparar a evolução de cada zona ao longo do tempo."
                        : "Each marked region gets its own score. This is what powers per-region progression tracking."}
                    </p>
                    <div className="space-y-2 pt-1">
                      {painRegions.map((id) => {
                        const lbl = regionLabelMap[id];
                        const v = painScoresPerRegion[id] ?? painScore;
                        return (
                          <div key={id} className="flex items-center gap-3">
                            <span className="text-xs text-foreground w-32 shrink-0 truncate">
                              {lbl ? (isPt ? lbl.label_pt : lbl.label_en) : id}
                            </span>
                            <Slider
                              value={[v]}
                              onValueChange={(arr) => setRegionPainScore(id, arr[0])}
                              min={0}
                              max={10}
                              step={1}
                              className="flex-1"
                              disabled={demoMode}
                            />
                            <span className="text-xs font-bold text-primary tabular-nums w-8 text-right">{v}/10</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: RED FLAGS */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isPt ? "Marque qualquer sinal de alerta presente no paciente:" : "Check any warning signs present in the patient:"}
                </p>
                {RED_FLAGS_PT.map((rf) => (
                  <label key={rf} className="flex items-start gap-2 p-2 rounded-md border hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={redFlagsChecked.includes(rf)} onCheckedChange={() => toggleRedFlag(rf)} className="mt-0.5" />
                    <span className="text-sm">{rf}</span>
                  </label>
                ))}
                {redFlagsChecked.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      {isPt
                        ? `${redFlagsChecked.length} sinal(is) de alerta detectado(s). Considere encaminhamento médico.`
                        : `${redFlagsChecked.length} warning sign(s) detected. Consider medical referral.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: QUESTIONÁRIOS — mesmo fluxo da avaliação premium/link */}
            {step === 3 && (
              <div className="space-y-3">
                {painRegions.length === 0 ? (
                  <div className="p-4 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    {isPt
                      ? "Selecione ao menos uma região com dor na etapa anterior para que os questionários aplicáveis sejam carregados automaticamente."
                      : "Select at least one pain region in the previous step to load the applicable questionnaires."}
                  </div>
                ) : (
                  <QuestionnaireStep
                    painRegions={painRegions}
                    previousAnswers={undefined}
                    demoMode={demoMode}
                    autofillAnswers={demoMode ? MOCK_MANUAL_CASE.questionnaireAnswers : undefined}
                    onComplete={(results) => {
                      setQuestionnaireResults(results);
                      setStep((s) => Math.min(STEPS.length - 1, s + 1));
                    }}
                    onBack={() => setStep((s) => Math.max(0, s - 1))}
                    onSkip={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  />

                )}
                {questionnaireResults.length > 0 && (
                  <div className="text-xs text-muted-foreground p-2 rounded bg-primary/5 border border-primary/20">
                    {isPt ? "Já aplicados: " : "Already applied: "}
                    {questionnaireResults.map((r) => r.questionnaireName).join(", ")}
                  </div>
                )}

                {/* Specialty (cardio / geri) AI-suggested questionnaires */}
                {!demoMode && (
                  <SpecialtyQuestionnairesPanel
                    ref={specialtyPanelRef}
                    anamnesisData={buildAnamnesisData()}
                    professionalId={professionalId}
                    clinicId={clinicId}
                    patientName={patientName}
                    patientEmail={patientEmail}
                    assessmentId={editAssessment?.id || null}
                    initialApplied={specialtyApplied}
                    onApplied={setSpecialtyApplied}
                  />
                )}
              </div>
            )}

            {/* STEP 4: TESTES */}
            {step === 4 && (
              <div className="space-y-4">
                {/* ROM / Joint Mobility table — positioned BEFORE free-text functional tests */}
                <DemoShield
                  on={demoMode}
                  onAutofill={() =>
                    autofill(romTable, MOCK_MANUAL_CASE.romTable, setRomTable, createInitialRomRows(2))
                  }
                >
                  <RomTable
                    value={romTable}
                    onChange={setRomTable}
                    lang={isPt ? "pt" : "en"}
                  />
                </DemoShield>





                <div>
                  <Label className="text-xs">{isPt ? "Testes funcionais e observações" : "Functional tests and observations"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(functionalTests, MOCK_MANUAL_CASE.functionalTests, setFunctionalTests, "")}>
                    <Textarea
                      value={functionalTests}
                      onChange={(e) => setFunctionalTests(e.target.value)}
                      rows={12}
                      placeholder={isPt
                        ? "Ex:\n- Slump test: positivo à esquerda\n- Lasègue 45° positivo\n- Força MMII grau 4\n- ADM lombar limitada em flexão\n..."
                        : "E.g. Slump test: positive on the left, etc."}
                      className="mt-1 text-sm font-mono"
                    />
                  </DemoShield>
                </div>

                {/* AI-powered test suggestions box */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      {isPt ? "Sugestões de testes pela IA" : "AI test suggestions"}
                    </div>
                    <Button
                      onClick={generateTestSuggestions}
                      disabled={suggestingTests || (painRegions.length === 0 && !chiefComplaint)}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                    >
                      {suggestingTests
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Sparkles className="h-3 w-3" />}
                      {testSuggestions.length > 0
                        ? (isPt ? "Atualizar" : "Refresh")
                        : (isPt ? "Gerar sugestões" : "Generate suggestions")}
                    </Button>
                  </div>

                  {testSuggestions.length === 0 && !suggestingTests && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {isPt
                        ? "A IA analisa anamnese, regiões de dor, red flags e questionários para sugerir 2-6 testes ortopédicos, de mobilidade, flexibilidade ou controle motor adicionais. Clique em uma sugestão para adicioná-la ao bloco acima."
                        : "AI analyzes anamnesis, pain regions, red flags and questionnaires to suggest 2-6 additional orthopedic, mobility, flexibility or motor control tests. Click a suggestion to add it above."}
                    </p>
                  )}

                  {testSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      {testSuggestions.map((s, i) => {
                        const added = addedSuggestions.has(s.name);
                        const catLabel: Record<string, { pt: string; en: string }> = {
                          orthopedic: { pt: "Ortopédico", en: "Orthopedic" },
                          mobility: { pt: "Mobilidade", en: "Mobility" },
                          flexibility: { pt: "Flexibilidade", en: "Flexibility" },
                          functional: { pt: "Funcional", en: "Functional" },
                          motor_control: { pt: "Controle motor", en: "Motor control" },
                          neurodynamic: { pt: "Neurodinâmico", en: "Neurodynamic" },
                        };
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => addSuggestionToTests(s)}
                            disabled={added}
                            className={`w-full text-left rounded-md border p-2 text-xs transition-colors ${
                              added
                                ? "border-emerald-500/40 bg-emerald-500/5 cursor-default"
                                : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground">{s.name}</span>
                                  <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                    {catLabel[s.category]?.[isPt ? "pt" : "en"] || s.category}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{s.rationale}</p>
                              </div>
                              {added
                                ? <span className="text-[10px] text-emerald-600 shrink-0">{isPt ? "Adicionado" : "Added"}</span>
                                : <Plus className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: DINAMOMETRIA (opcional) */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                  {isPt
                    ? "Etapa opcional. Registre dinamometria (força muscular em kgf) manualmente ou importe de imagem/PDF. Pode ser preenchida agora ou posteriormente, editando esta avaliação."
                    : "Optional step. Record dynamometry (muscle strength in kgf) manually or import from image/PDF. Can be filled now or later by editing this assessment."}
                </div>
                <StrengthTable
                  value={strengthTable}
                  onChange={setStrengthTable}
                  lang={isPt ? "pt" : language === "es" ? "es" : "en"}
                  disableImport={demoMode}
                />
              </div>
            )}

            {/* STEP 6: DIAGNÓSTICO */}
            {step === 6 && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">{isPt ? "Impressão clínica" : "Clinical impression"}</Label>
                    <Button
                      onClick={generateAIClinicalImpression}
                      disabled={generatingCi}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                    >
                      {generatingCi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {isPt ? "Gerar com IA" : "Generate with AI"}
                    </Button>
                  </div>
                  <DemoShield on={demoMode} onAutofill={() => autofill(clinicalImpression, MOCK_MANUAL_CASE.clinicalImpression, setClinicalImpression, "")}>
                    <Textarea value={clinicalImpression} onChange={(e) => setClinicalImpression(e.target.value)} rows={3} className="mt-1 text-sm" />
                  </DemoShield>
                  {aiClinicalImpression?.therapeuticObjectives?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {aiClinicalImpression.therapeuticObjectives.map((obj, i) => (
                        <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button onClick={generateAIDiagnosis} disabled={generatingDx} variant="outline" size="sm" className="gap-2">
                  {generatingDx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isPt ? "Gerar diagnóstico com IA" : "Generate diagnosis with AI"}
                </Button>
                <div>
                  <Label className="text-xs">{isPt ? "Diagnóstico / Hipótese" : "Diagnosis / Hypothesis"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(diagnosisText, MOCK_MANUAL_CASE.diagnosisText, setDiagnosisText, "")}>
                    <Textarea value={diagnosisText} onChange={(e) => setDiagnosisText(e.target.value)} rows={8} className="mt-1 text-sm" />
                  </DemoShield>
                </div>
              </div>
            )}

            {/* Treatment plan generation removed — it is sold separately to autonomous
                pros on the patient page and is included for clinic mode in the same
                location. Generating it from the manual flow caused raw-JSON output and
                duplicated a paid/included feature. */}
          </div>
        </div>

        <DialogFooter className="relative flex-row justify-between sm:justify-between border-t p-4 shrink-0 bg-background">
          <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back"}
          </Button>
          {draft.lastSavedAt && (
            <span className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              <Cloud className="h-3 w-3" />
              {isPt ? "Rascunho salvo" : "Draft saved"}
            </span>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await draft.flush();
                toast({
                  title: isPt ? "Progresso salvo" : "Progress saved",
                  description: isPt
                    ? "Rascunho gravado na nuvem — pode fechar e voltar quando quiser."
                    : "Draft saved to the cloud — you can close and resume later.",
                });
              }}
              disabled={draft.saving}
            >
              {draft.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPt ? "Salvar agora" : "Save now"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                {isPt ? "Avançar" : "Next"} <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleSave(false)} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEditing ? (isPt ? "Salvar alterações" : "Save changes") : (isPt ? "Finalizar" : "Finish")}
              </Button>
            )}
          </div>
        </DialogFooter>

        {/* Demo-mode floating voice-recorder mock — mirrors the real FAB UX */}
        {demoMode && (
          <div
            data-voice-recorder-fab
            className="absolute bottom-24 left-4 sm:bottom-6 sm:left-6 z-[100] flex flex-col items-start gap-2 pointer-events-auto"
          >
            {demoVoiceNoteShown && !demoVoiceRecording && (
              <div className="bg-background border border-primary/30 shadow-xl rounded-xl p-3 max-w-[260px] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  {isPt ? "Transcrição gerada (simulação)" : "Generated transcript (simulation)"}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                  {MOCK_MANUAL_CASE.voiceTranscript}
                </p>
                <p className="text-[10px] text-muted-foreground/80 italic">
                  {isPt
                    ? "Em PRO real, isto vai direto para o prontuário."
                    : "In real PRO, this goes straight into the chart."}
                </p>
              </div>
            )}

            {!demoVoiceRecording && (
              <Button
                onClick={startDemoVoiceRecording}
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
                aria-label={isPt ? "Gravador de voz (simulação)" : "Voice recorder (simulation)"}
              >
                <Mic className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {isPt ? "DEMO" : "DEMO"}
                </span>
              </Button>
            )}

            {demoVoiceRecording && (
              <div className="bg-background border-2 border-primary shadow-xl rounded-2xl p-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-mono tabular-nums">
                    {isPt ? "Gravando..." : "Recording..."}
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-6 px-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-primary/70 animate-pulse"
                      style={{
                        height: `${30 + ((i * 17) % 60)}%`,
                        animationDelay: `${(i % 6) * 80}ms`,
                        animationDuration: "700ms",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>

    </Dialog>
  );
};

export default ManualAssessmentModal;

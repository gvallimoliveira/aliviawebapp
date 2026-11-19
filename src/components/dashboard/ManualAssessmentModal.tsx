import { useRegistrationPending } from "@/hooks/useRegistrationPending";
import { WORK_DEMAND_IDS, workDemandLabel, formatParticipationContext, parseWorkDemands, toggleWorkDemand } from "@/lib/participationContext";
import RegistrationRequiredDialog from "@/components/dashboard/RegistrationRequiredDialog";
import AssessmentPurposeFields, { purposeCopy } from "@/components/assessment/AssessmentPurposeFields";
import PainMap from "@/components/assessment/PainMap";
import { isPreventiveAssessment, normalizeAssessmentPurpose, manualPurposeSteps, preventiveReasoningContext, type PurposeData } from "@/lib/assessmentPurpose";
import { useEffect, useMemo, useRef, useState } from "react";
import { mergeAnamnesisOnUpdate } from "@/lib/preAssessmentContinuation";
import { savedClinicalImpression } from "@/lib/clinicalImpression";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HEALTH_CONDITION_IDS, healthConditionLabel, formatHealthConditions, formatContinuousMedication, OTHER_ONSET_OPTIONS, OTHER_CONTROL_OPTIONS, otherOnsetLabel, otherControlLabel } from "@/lib/healthHistory";
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
import { Loader2, FileText, Sparkles, ChevronLeft, ChevronRight, Save, AlertTriangle, Cloud, Lightbulb, Plus, Mic, Lock, Crown, Link as LinkIcon, Copy, MessageCircle, X, ClipboardList, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { questionnaires, getApplicableQuestionnaires, type QuestionnaireResult } from "@/data/questionnaireData";
import { createShortAppLink } from "@/lib/shortLink";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { regionsByView } from "@/components/assessment/painMapData";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import QuestionnaireAnswersView from "@/components/assessment/QuestionnaireAnswersView";
import { useVoiceRecorderSession } from "@/contexts/VoiceRecorderContext";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import DraftResumeBanner from "@/components/common/DraftResumeBanner";
import DifferentialDiagnosisPanel from "./patient-evolution/DifferentialDiagnosisPanel";
import { shouldOfferDifferential } from "@/lib/differentialDiagnosis";
import {
  detectSacroiliacPain,
  mergeSacroiliacCluster,
  getSacroiliacClusterSuggestions,
  sacroiliacClusterHint,
  type TestSuggestion,
} from "@/lib/sacroiliacCluster";
import { MOCK_MANUAL_CASE } from "@/data/mockManualAssessmentCase";
import SpecialtyQuestionnairesPanel, { type SpecialtyAppliedResult, type SpecialtyPanelHandle } from "./SpecialtyQuestionnairesPanel";
import RomTable, { createInitialRomRows, sanitizeRomRows, type RomRow } from "@/components/assessment/RomTable";
import StrengthTable, { createInitialStrengthRows, sanitizeStrengthRows, type StrengthRow } from "@/components/assessment/StrengthTable";
import {
  saveManualAssessmentSession,
  closeManualAssessmentSession,
  newManualAssessmentSessionId,
} from "@/lib/manualAssessmentSession";
import { ENABLE_PAIN_MECHANISM } from "@/lib/featureFlags";
import PainMechanismWizard from "@/components/assessment/PainMechanismWizard";
import {
  createEmptyMechanismAnswers,
  sanitizeMechanismAnswers,
  hasMechanismAnswers,
  PAIN_TYPE_TO_DESCRIPTOR,
  DESCRIPTOR_TO_PAIN_TYPE,
  type MechanismAnswers,
} from "@/components/assessment/PainMechanismScreening";
import { classifyMechanism, toStoredMechanism, parseStoredMechanism, getSubtypeLabel } from "@/lib/painMechanism";
import { computePainExtent, suggestDistribution } from "@/lib/painExtent";
import SpineBiomechanicsSection from "@/components/assessment/SpineBiomechanicsSection";
import { emptySpineData, spinePayload, spineRegionsFrom, type SpineBiomechanicsData } from "@/lib/spineBiomechanics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    match: (id) => id.includes("hip") || id.includes("gluteal") || id.includes("sij") || id.includes("sacr") },
  { key: "lower_proximal", label_pt: "Membro Inferior — Proximal (Coxa / Joelho)", label_en: "Lower Limb — Proximal (Thigh / Knee)",
    match: (id) => id.includes("thigh") || id.includes("knee") },
  { key: "lower_distal", label_pt: "Membro Inferior — Distal (Perna / Panturrilha / Tornozelo / Pé)", label_en: "Lower Limb — Distal (Leg / Calf / Ankle / Foot)",
    match: (id) => id.includes("shin") || id.includes("calf") || id.includes("ankle") || id.includes("foot") },
];

/**
 * IDs excluídos da tabela de seleção simplificada (1ª etapa do mapa).
 * Remove vistas laterais (left/right) e duplicatas da vista posterior
 * que já são cobertas pela vista frontal + refinamento anatômico.
 */
const SIMPLIFIED_EXCLUDED_IDS = new Set<string>([
  // Vista lateral esquerda
  "head_left", "cervical_left", "shoulder_left", "arm_left", "elbow_left",
  "forearm_left", "hand_left", "thoracic_left", "lumbar_left", "hip_left",
  "thigh_left", "knee_left", "shin_left", "ankle_left", "foot_left",
  // Vista lateral direita
  "head_right", "cervical_right", "shoulder_right", "arm_right", "elbow_right",
  "forearm_right", "hand_right", "thoracic_right", "lumbar_right", "hip_right",
  "thigh_right", "knee_right", "shin_right", "ankle_right", "foot_right",
  // Vista posterior — duplicatas de cabeça e membros
  // (mantemos `cervical` da vista posterior, pois "dor cervical" é anatomicamente
  // posterior/postero-lateral; `cervical_front` permanece na lista como
  // "Pescoço (anterior)" para queixas antero-laterais.)
  "head_back",
  "left_shoulder_back", "right_shoulder_back",
  "left_arm_back", "right_arm_back",
  "left_elbow_back", "right_elbow_back",
  "left_forearm_back", "right_forearm_back",
  "left_hand_back", "right_hand_back",
  "left_knee_back", "right_knee_back",
  "left_ankle_back", "right_ankle_back",
  "left_foot_back", "right_foot_back",
]);

interface ManualAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string;
  /** Quando disponível, usado como escopo estável do rascunho (evita colisão entre homônimos). */
  patientId?: string;

  /** When provided, the modal edits this existing assessment instead of creating a new one. */
  editAssessment?: any | null;
  /**
   * When provided (and no editAssessment), pre-fills the modal with a NEW
   * assessment built from an external source (e.g. AI-interpreted PDF/image).
   * Save flow inserts a fresh row tagged with `source: "external_upload"`.
   */
  prefillData?: {
    /** Stable marker — when it changes, the prefill effect re-runs. */
    markerId: string;
    /** Same shape as an assessment row (anamnesis_data, pain_regions, diagnosis, ...). */
    row: any;
    /** Optional: id of the patient_files row pointing to the original file. */
    externalSourceFileId?: string | null;
  } | null;
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
  { id: "redflags", label: "Red Flags" },
  { id: "mapa", label: "Mapa de dor" },
  { id: "intensidade", label: "Intensidade & Tipo" },
  { id: "observacoes", label: "Observações clínicas" },
  { id: "questionarios", label: "Questionários" },
  { id: "adm", label: "Mobilidade articular (ADM)" },
  { id: "testes", label: "Testes funcionais" },
  { id: "dinamometria", label: "Dinamometria" },
  { id: "diagnostico", label: "Diagnóstico" },
];

const ManualAssessmentModalInner = ({ open, onOpenChange, professionalId, clinicId, patientName, patientEmail, patientId, editAssessment, prefillData, onSaved, demoMode = false, continuationOfLink = false }: ManualAssessmentModalProps & { continuationOfLink?: boolean }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  // Respostas do link podem vir como chaves de tradução (ex.: "anamnesis.complaint.shoulder_pain").
  // Nunca exibir chave crua no formulário: traduz cada item e junta listas.
  const readable = (v: any): string => {
    const one = (x: any) => {
      const str = String(x ?? "").trim();
      if (!/^[a-z_]+(\.[a-z0-9_]+)+$/i.test(str)) return str;
      const tr = t(str);
      return tr && tr !== str ? tr : str.split(".").pop()!.replace(/_/g, " ");
    };
    if (Array.isArray(v)) return v.map(one).filter(Boolean).join(", ");
    return one(v);
  };
  const { toast } = useToast();
  const isPt = language === "pt";

  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<PurposeData>({});
  const preventive = isPreventiveAssessment(purpose);
  const visibleSteps = manualPurposeSteps(purpose);
  const stepPosition = Math.max(0, visibleSteps.indexOf(step));
  const nextManualStep = (s: number) => visibleSteps.find(i => i > s) ?? 9;
  const previousManualStep = (s: number) => [...visibleSteps].reverse().find(i => i < s) ?? 0;
  useEffect(() => { if (preventive && step === 3) setStep(4); }, [preventive, step]);

  // Ref to the scrollable content area — used to force scroll-to-top
  // whenever the user advances/returns between steps so fields near the top
  // never get missed because of a prior scroll position.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

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
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [healthConditionsOther, setHealthConditionsOther] = useState("");
  const [healthConditionsOtherOnset, setHealthConditionsOtherOnset] = useState("");
  const [healthConditionsOtherControl, setHealthConditionsOtherControl] = useState("");
  const [usesContinuousMedication, setUsesContinuousMedication] = useState("");
  const [occupation, setOccupation] = useState("");
  const [workDemand, setWorkDemand] = useState("");
  const [participationGoal, setParticipationGoal] = useState("");
  const [complementaryExams, setComplementaryExams] = useState("");

  // Dor
  const [painScore, setPainScore] = useState<number>(5);
  // Tipo de dor global — multi-seleção. `painType` (string) é mantido como
  // "tipo principal" para compatibilidade com prefill/draft/legado.
  const [painTypes, setPainTypes] = useState<string[]>([]);
  const painType = painTypes[0] || "";
  const setPainType = (v: string) => setPainTypes(v ? [v] : []);
  const [painRegions, setPainRegions] = useState<string[]>([]);
  // Per-region pain score (0-10). Filled automatically when the user marks a
  // region (defaults to the general slider value) and editable via per-region
  // sliders. Used both for the comparison view (RegionPainComparison reads
  // `anamnesis_data.painScoresPerRegion`) and to derive the aggregate
  // `pain_score` saved on the row (max of per-region scores).
  const [painScoresPerRegion, setPainScoresPerRegion] = useState<Record<string, number>>({});
  // Per-region pain type (local, radiating, burning…). Shown only when 2+
  // regions are marked, defaults to the global `painType` for each new region.
  const [painTypesPerRegion, setPainTypesPerRegion] = useState<Record<string, string>>({});
  // Refinamentos anatômicos por região (medial/lateral, anterior/posterior,
  // proximal/distal nos membros; lado D/E/central nas regiões axiais).
  // Multi-seleção: ex. ["medial","posterior"] para "cotovelo direito medial posterior".
  const [painRegionRefinements, setPainRegionRefinements] = useState<Record<string, string[]>>({});

  // Busca rápida por região na etapa de seleção do mapa de dor.
  const [regionSearch, setRegionSearch] = useState("");

  // Red Flags
  const [redFlagsChecked, setRedFlagsChecked] = useState<string[]>([]);
  // Observações clínicas adicionais (campo livre exibido após as red flags).
  // Persistido em anamnesis_data.additionalClinicalNotes e usado pela IA.
  const [additionalClinicalNotes, setAdditionalClinicalNotes] = useState("");

  // Passo B1 — triagem de mecanismo de dor (flag ENABLE_PAIN_MECHANISM).
  const [mechanismAnswers, setMechanismAnswers] = useState<MechanismAnswers>(
    createEmptyMechanismAnswers,
  );
  // Duração em semanas inferida do texto livre ("6 semanas", "3 meses", "1 ano").
  const durationWeeks = (() => {
    const t = (duration || "").toLowerCase();
    const n = parseFloat(t.replace(",", ".").replace(/[^\d.,]/g, " ").trim().split(/\s+/)[0]);
    if (!Number.isFinite(n)) return null;
    if (/ano|year/.test(t)) return Math.round(n * 52);
    if (/m[êe]s|month/.test(t)) return Math.round(n * 4.3);
    if (/semana|week/.test(t)) return Math.round(n);
    if (/dia|day/.test(t)) return Math.round(n / 7);
    return null;
  })();
  const suggestedDistribution = ENABLE_PAIN_MECHANISM
    ? suggestDistribution(painRegions)
    : "unknown";

  /**
   * Tipos de dor "efetivos": união do que foi marcado no seletor com o que
   * veio dos descritores da triagem de mecanismo (correlação bidirecional).
   */
  const effectivePainTypes = (() => {
    const set = new Set(painTypes);
    if (ENABLE_PAIN_MECHANISM) {
      mechanismAnswers.descriptors.forEach((d) => {
        const t = DESCRIPTOR_TO_PAIN_TYPE[d];
        if (t) set.add(t);
      });
    }
    return Array.from(set);
  })();

  /** Marca/desmarca um tipo de dor e espelha o descritor equivalente. */
  const togglePainType = (t: string) => {
    const on = effectivePainTypes.includes(t);
    setPainTypes(on ? painTypes.filter((x) => x !== t) : [...new Set([...painTypes, t])]);
    const desc = PAIN_TYPE_TO_DESCRIPTOR[t];
    if (ENABLE_PAIN_MECHANISM && desc) {
      setMechanismAnswers((prev) => ({
        ...prev,
        descriptors: on
          ? prev.descriptors.filter((d) => d !== desc)
          : [...new Set([...prev.descriptors, desc])],
      }));
    }
  };



  // Questionários (mesmo fluxo da avaliação premium/link)
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [showQDetails, setShowQDetails] = useState(false);
  const [confirmReapplyOpen, setConfirmReapplyOpen] = useState(false);
  // Quando ligado, os questionários ficam pendentes e são enviados ao paciente
  // via link único após salvar a avaliação. Auto-sugerido com 3+ regiões.
  const [deferQuestionnaires, setDeferQuestionnaires] = useState(false);
  // Resultado do envio: link consolidado para o paciente preencher depois.
  const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(null);
  const [pendingShareOpen, setPendingShareOpen] = useState(false);
  // Quantidade atual de pendências (em modo edição) — preenchido em useEffect.
  const [pendingCount, setPendingCount] = useState<{ total: number; pending: number } | null>(null);
  // ID da avaliação salva — usado pelo botão "Baixar PDF resumo" no diálogo de envio.
  const [pendingSavedAssessmentId, setPendingSavedAssessmentId] = useState<string | null>(null);
  const [generatingSummaryPdf, setGeneratingSummaryPdf] = useState(false);
  const [specialtyApplied, setSpecialtyApplied] = useState<SpecialtyAppliedResult[]>([]);
  const specialtyPanelRef = useRef<SpecialtyPanelHandle | null>(null);

  // Testes
  const [functionalTests, setFunctionalTests] = useState("");
  const [romTable, setRomTable] = useState<RomRow[]>(createInitialRomRows(2));
  const [spineBiomechanics, setSpineBiomechanics] = useState<SpineBiomechanicsData>(emptySpineData());
  const [strengthTable, setStrengthTable] = useState<StrengthRow[]>(createInitialStrengthRows(1));
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
  // Texto de diagnóstico exatamente como a IA (ou a avaliação salva) deixou no campo.
  // Se o profissional alterar esse texto, a hipótese dele prevalece no prontuário.
  const aiDiagnosisBaselineRef = useRef("");

  // Tratamento
  const [treatmentText, setTreatmentText] = useState("");
  const [aiTreatment, setAiTreatment] = useState<any | null>(null);

  // ─── Avaliação externa (upload PDF/imagem interpretado pela IA) ──────────
  // Persistidos em anamnesis_data quando presentes. Mantidos como estado
  // separado para que o usuário possa editar `additionalExternalInfo` e para
  // que o banner "Avaliação externa" apareça no modal durante a revisão.
  const [externalSource, setExternalSource] = useState<{
    source: "external_upload";
    externalSourceFileId?: string | null;
    aiInterpretedFields?: string[];
  } | null>(null);
  const [additionalExternalInfo, setAdditionalExternalInfo] = useState("");

  // Build region groups: dedupe by id, sort alphabetically by current language label.
  // Uses SIMPLIFIED_EXCLUDED_IDS to remove lateral-view duplicates and back-view
  // duplicates already covered by front-view + anatomical refinement chips.
  const regionGroups: RegionGroup[] = (() => {
    const seen = new Map<string, { label_pt: string; label_en: string }>();
    for (const view of Object.values(regionsByView)) {
      for (const r of view) {
        if (SIMPLIFIED_EXCLUDED_IDS.has(r.id)) continue;
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
      for (const r of view) {
        if (SIMPLIFIED_EXCLUDED_IDS.has(r.id)) continue;
        if (!m[r.id]) m[r.id] = { label_pt: r.label_pt, label_en: r.label_en };
      }
    }
    return m;
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // Refinamento anatômico por região — opções específicas e clinicamente
  // significativas para cada articulação/segmento. Multi-seleção permitida.
  // Persistido em anamnesis_data.painRegionRefinements e anexado ao label
  // das regiões no payload da IA.
  // ─────────────────────────────────────────────────────────────────────────
  type Axis = { value: string; label_pt: string; label_en: string };

  const AXES_BY_GROUP: Record<string, { label_pt: string; label_en: string; axes: Axis[] }> = {
    cervical_posterior: {
      label_pt: "Coluna cervical", label_en: "Cervical spine",
      axes: [
        { value: "central", label_pt: "Central", label_en: "Central" },
        { value: "posterolateral_right", label_pt: "Postero-lateral D", label_en: "Postero-lateral R" },
        { value: "posterolateral_left", label_pt: "Postero-lateral E", label_en: "Postero-lateral L" },
      ],
    },
    cervical_anterior: {
      label_pt: "Pescoço (anterior)", label_en: "Neck (anterior)",
      axes: [
        { value: "central", label_pt: "Central", label_en: "Central" },
        { value: "anterolateral_right", label_pt: "Antero-lateral D", label_en: "Antero-lateral R" },
        { value: "anterolateral_left", label_pt: "Antero-lateral E", label_en: "Antero-lateral L" },
      ],
    },
    lumbar: {
      label_pt: "Coluna lombar", label_en: "Lumbar spine",
      axes: [
        { value: "central", label_pt: "Central (processos espinhosos)", label_en: "Central (spinous processes)" },
        { value: "unilateral_right", label_pt: "Unilateral D", label_en: "Unilateral R" },
        { value: "unilateral_left", label_pt: "Unilateral E", label_en: "Unilateral L" },
        { value: "bilateral_band", label_pt: "Bilateral (em faixa)", label_en: "Bilateral (band-like)" },
      ],
    },
    thoracic: {
      label_pt: "Coluna torácica", label_en: "Thoracic spine",
      axes: [
        { value: "central", label_pt: "Central", label_en: "Central" },
        { value: "paravertebral_right", label_pt: "Paravertebral D", label_en: "Paravertebral R" },
        { value: "paravertebral_left", label_pt: "Paravertebral E", label_en: "Paravertebral L" },
        { value: "bilateral", label_pt: "Bilateral", label_en: "Bilateral" },
      ],
    },
    head: {
      label_pt: "Cabeça", label_en: "Head",
      axes: [
        { value: "frontal", label_pt: "Frontal", label_en: "Frontal" },
        { value: "temporal_right", label_pt: "Temporal D", label_en: "Temporal R" },
        { value: "temporal_left", label_pt: "Temporal E", label_en: "Temporal L" },
        { value: "occipital", label_pt: "Occipital", label_en: "Occipital" },
        { value: "diffuse", label_pt: "Difusa", label_en: "Diffuse" },
      ],
    },
    trunk_axial: {
      label_pt: "Tórax / Abdômen", label_en: "Chest / Abdomen",
      axes: [
        { value: "central", label_pt: "Central", label_en: "Central" },
        { value: "right_side", label_pt: "Lado D", label_en: "Right side" },
        { value: "left_side", label_pt: "Lado E", label_en: "Left side" },
      ],
    },
    shoulder: {
      label_pt: "Ombro", label_en: "Shoulder",
      axes: [
        { value: "anterior", label_pt: "Anterior", label_en: "Anterior" },
        { value: "lateral", label_pt: "Lateral", label_en: "Lateral" },
        { value: "posterior", label_pt: "Posterior", label_en: "Posterior" },
        { value: "superior", label_pt: "Superior (acrômio)", label_en: "Superior (acromion)" },
      ],
    },
    elbow: {
      label_pt: "Cotovelo", label_en: "Elbow",
      axes: [
        { value: "medial", label_pt: "Medial (epitróclea)", label_en: "Medial (epitrochlea)" },
        { value: "lateral", label_pt: "Lateral (epicôndilo)", label_en: "Lateral (epicondyle)" },
        { value: "anterior", label_pt: "Anterior", label_en: "Anterior" },
        { value: "posterior", label_pt: "Posterior (olécrano)", label_en: "Posterior (olecranon)" },
      ],
    },
    hip: {
      label_pt: "Quadril", label_en: "Hip",
      axes: [
        { value: "anterior", label_pt: "Anterior (virilha)", label_en: "Anterior (groin)" },
        { value: "lateral", label_pt: "Lateral (trocânter)", label_en: "Lateral (trochanter)" },
        { value: "posterior", label_pt: "Posterior (glúteo)", label_en: "Posterior (gluteal)" },
        { value: "medial", label_pt: "Medial", label_en: "Medial" },
      ],
    },
    knee: {
      label_pt: "Joelho", label_en: "Knee",
      axes: [
        { value: "anterior", label_pt: "Anterior (patelar)", label_en: "Anterior (patellar)" },
        { value: "posterior", label_pt: "Posterior (poplítea)", label_en: "Posterior (popliteal)" },
        { value: "medial", label_pt: "Medial", label_en: "Medial" },
        { value: "lateral", label_pt: "Lateral", label_en: "Lateral" },
      ],
    },
    ankle: {
      label_pt: "Tornozelo", label_en: "Ankle",
      axes: [
        { value: "anterior", label_pt: "Anterior", label_en: "Anterior" },
        { value: "posterior", label_pt: "Posterior (Aquiles)", label_en: "Posterior (Achilles)" },
        { value: "medial", label_pt: "Medial", label_en: "Medial" },
        { value: "lateral", label_pt: "Lateral", label_en: "Lateral" },
      ],
    },
    foot: {
      label_pt: "Pé", label_en: "Foot",
      axes: [
        { value: "plantar", label_pt: "Plantar", label_en: "Plantar" },
        { value: "dorsal", label_pt: "Dorsal", label_en: "Dorsal" },
        { value: "medial", label_pt: "Medial", label_en: "Medial" },
        { value: "lateral", label_pt: "Lateral", label_en: "Lateral" },
        { value: "heel", label_pt: "Calcâneo", label_en: "Heel" },
        { value: "forefoot", label_pt: "Antepé", label_en: "Forefoot" },
      ],
    },
    hand: {
      label_pt: "Mão", label_en: "Hand",
      axes: [
        { value: "palmar", label_pt: "Palmar", label_en: "Palmar" },
        { value: "dorsal", label_pt: "Dorsal", label_en: "Dorsal" },
        { value: "radial", label_pt: "Radial", label_en: "Radial" },
        { value: "ulnar", label_pt: "Ulnar", label_en: "Ulnar" },
      ],
    },
    limb_segment: {
      label_pt: "Segmento", label_en: "Segment",
      axes: [
        { value: "anterior", label_pt: "Anterior", label_en: "Anterior" },
        { value: "posterior", label_pt: "Posterior", label_en: "Posterior" },
        { value: "medial", label_pt: "Medial", label_en: "Medial" },
        { value: "lateral", label_pt: "Lateral", label_en: "Lateral" },
        { value: "proximal", label_pt: "Proximal", label_en: "Proximal" },
        { value: "distal", label_pt: "Distal", label_en: "Distal" },
      ],
    },
  };

  const getRegionGroupKey = (id: string): keyof typeof AXES_BY_GROUP => {
    // Ordem importa: testar prefixos/ids mais específicos primeiro.
    if (id === "cervical_front") return "cervical_anterior";
    if (id.startsWith("cervical")) return "cervical_posterior";
    if (id === "lower_back" || id.includes("lumbar")) return "lumbar";
    if (id.includes("thoracic")) return "thoracic";
    if (id.startsWith("head")) return "head";
    if (id === "chest" || id === "abdomen") return "trunk_axial";
    if (id.includes("shoulder")) return "shoulder";
    if (id.includes("elbow")) return "elbow";
    if (id.includes("hip") || id.includes("gluteal")) return "hip";
    if (id.includes("knee")) return "knee";
    if (id.includes("ankle")) return "ankle";
    if (id.includes("foot")) return "foot";
    if (id.includes("hand")) return "hand";
    return "limb_segment"; // braço, antebraço, coxa, perna/canela/panturrilha
  };

  const getRegionGroup = (id: string) => AXES_BY_GROUP[getRegionGroupKey(id)];
  const getRefinementAxes = (id: string): Axis[] => getRegionGroup(id).axes;
  // Mantido por compatibilidade com texto explicativo; classifica como axial
  // qualquer região da linha média (coluna, cabeça, tronco).
  const AXIAL_KEYWORDS = ["head", "cervical", "thoracic", "lower_back", "lumbar", "chest", "abdomen"];
  const isAxialRegion = (id: string) => AXIAL_KEYWORDS.some((k) => id.includes(k));
  const toggleRegionRefinement = (regionId: string, axisValue: string) => {
    setPainRegionRefinements((prev) => {
      const current = prev[regionId] || [];
      const next = current.includes(axisValue)
        ? current.filter((v) => v !== axisValue)
        : [...current, axisValue];
      const out = { ...prev };
      if (next.length === 0) delete out[regionId];
      else out[regionId] = next;
      return out;
    });
  };
  const refinementLabel = (regionId: string, value: string) => {
    const axes = getRefinementAxes(regionId);
    const ax = axes.find((a) => a.value === value);
    return ax ? (isPt ? ax.label_pt : ax.label_en) : value;
  };

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
      setPainTypesPerRegion((m) => {
        const out = { ...m };
        if (next.includes(id) && out[id] === undefined && painType) out[id] = painType;
        if (!next.includes(id)) delete out[id];
        return out;
      });
      // Limpa refinamentos quando a região é desmarcada
      setPainRegionRefinements((m) => {
        if (next.includes(id)) return m;
        const out = { ...m };
        delete out[id];
        return out;
      });
      // Sugere automaticamente "enviar depois" quando há 3+ regiões.
      if (next.length >= 3 && !deferQuestionnaires && questionnaireResults.length === 0) {
        setDeferQuestionnaires(true);
      }
      return next;
    });
  };

  const setRegionPainScore = (id: string, v: number) => {
    setPainScoresPerRegion((m) => ({ ...m, [id]: v }));
  };

  const setRegionPainType = (id: string, v: string) => {
    setPainTypesPerRegion((m) => ({ ...m, [id]: v }));
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
    ? `${professionalId}:${(patientId || patientEmail || patientName || "").toLowerCase().trim()}`
    : null;

  const draftState = {
    purpose, step, chiefComplaint, additionalComplaint, history, duration, onset, aggravating, relieving,
    medications, previousSurgeries, comorbidities, occupation, workDemand, participationGoal, complementaryExams,
    healthConditions, healthConditionsOther, healthConditionsOtherOnset,
    healthConditionsOtherControl, usesContinuousMedication,
    painScore, painType, painTypes, painRegions, painScoresPerRegion, painTypesPerRegion, painRegionRefinements,
    redFlagsChecked, additionalClinicalNotes, mechanismAnswers, questionnaireResults, deferQuestionnaires,
    functionalTests, romTable, strengthTable, clinicalImpression, diagnosisText, treatmentText,
    aiClinicalImpression, spineBiomechanics,
  };
  // Rascunho só existe quando há conteúdo real digitado/selecionado.
  // Campos no estado inicial (step, painScore 5, tabelas vazias) NÃO contam —
  // evita o banner "rascunho na nuvem" para avaliações nunca preenchidas.
  const isDraftEmpty = (s: typeof draftState): boolean => {
    if (isPreventiveAssessment(s.purpose)) return false;
    const texts = [
      s.chiefComplaint, s.additionalComplaint, s.history, s.duration, s.onset,
      s.aggravating, s.relieving, s.medications, s.previousSurgeries, s.comorbidities,
      s.occupation, s.workDemand, s.participationGoal, s.complementaryExams, s.healthConditionsOther,
      s.healthConditionsOtherOnset, s.healthConditionsOtherControl,
      s.usesContinuousMedication, s.functionalTests, s.additionalClinicalNotes,
      s.clinicalImpression, s.diagnosisText, s.treatmentText,
    ];
    if (texts.some((t) => typeof t === "string" && t.trim())) return false;
    if (s.painScore !== 5) return false;
    if ((s.painRegions?.length ?? 0) > 0) return false;
    if ((s.painTypes?.length ?? 0) > 0) return false;
    if (s.painType) return false;
    if ((s.redFlagsChecked?.length ?? 0) > 0) return false;
    if ((s.healthConditions?.length ?? 0) > 0) return false;
    if ((s.questionnaireResults?.length ?? 0) > 0) return false;
    if (Object.keys(s.painScoresPerRegion ?? {}).length > 0) return false;
    if (Object.keys(s.painTypesPerRegion ?? {}).length > 0) return false;
    if (Object.keys(s.painRegionRefinements ?? {}).length > 0) return false;
    if (
      s.mechanismAnswers &&
      Object.values(s.mechanismAnswers).some(
        (v) =>
          v != null &&
          v !== "" &&
          v !== "unknown" &&
          !(Array.isArray(v) && v.length === 0),
      )
    )
      return false;
    // "unit" (kgf etc.) é rótulo padrão da tabela, não conteúdo digitado.
    const tableHasContent = (rows: any[] | undefined) =>
      Array.isArray(rows) &&
      rows.some((r) =>
        Object.entries(r ?? {}).some(
          ([k, v]) => k !== "unit" && typeof v === "string" && v.trim(),
        ),
      );
    if (tableHasContent(s.romTable) || tableHasContent(s.strengthTable)) return false;
    if (s.aiClinicalImpression) return false;
    return true;
  };

  const draft = useAutosaveDraft<typeof draftState>({
    formKey: "manual_assessment",
    scopeKey: draftScopeKey,
    state: draftState,
    enabled: open && !isEditing && !demoMode,
    isEmpty: isDraftEmpty,
    // Autosave agressivo: ~300ms de debounce + flush em visibilitychange/pagehide
    // (já implementado no hook). Garante que cada alteração curta sobreviva à
    // troca de aplicativo no celular, sem martelar a nuvem.
    debounceMs: 300,
  });
  const handleRestoreDraft = () => {
    const p = draft.restore();
    if (!p) return;
    setPurpose(p.purpose || {});
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
    setHealthConditions(Array.isArray((p as any).healthConditions) ? (p as any).healthConditions : []);
    setHealthConditionsOther((p as any).healthConditionsOther ?? "");
    setHealthConditionsOtherOnset((p as any).healthConditionsOtherOnset ?? "");
    setHealthConditionsOtherControl((p as any).healthConditionsOtherControl ?? "");
    setUsesContinuousMedication((p as any).usesContinuousMedication ?? "");
    setOccupation(p.occupation ?? "");
    setWorkDemand((p as any).workDemand ?? "");
    setParticipationGoal((p as any).participationGoal ?? "");
    setComplementaryExams(p.complementaryExams ?? "");
    setPainScore(p.painScore ?? 5);
    setPainTypes(
      Array.isArray((p as any).painTypes) && (p as any).painTypes.length > 0
        ? ((p as any).painTypes as string[])
        : p.painType
          ? [p.painType]
          : [],
    );
    setPainRegions(p.painRegions ?? []);
    setPainScoresPerRegion(p.painScoresPerRegion ?? {});
    setPainTypesPerRegion((p as any).painTypesPerRegion ?? {});
    setPainRegionRefinements((p as any).painRegionRefinements ?? {});
    setRedFlagsChecked(p.redFlagsChecked ?? []);
    setAdditionalClinicalNotes((p as any).additionalClinicalNotes ?? "");
    setMechanismAnswers(sanitizeMechanismAnswers((p as any).mechanismAnswers));
    // Rascunho sem questionários nunca apaga resultados já salvos na avaliação.
    setQuestionnaireResults((prev) =>
      Array.isArray(p.questionnaireResults) && p.questionnaireResults.length > 0
        ? p.questionnaireResults
        : prev,
    );
    setDeferQuestionnaires(Boolean((p as any).deferQuestionnaires));
    setFunctionalTests(p.functionalTests ?? "");
    setRomTable(Array.isArray(p.romTable) && p.romTable.length > 0 ? p.romTable : createInitialRomRows(2));
    setSpineBiomechanics((p as any).spineBiomechanics?.star ? (p as any).spineBiomechanics : emptySpineData());
    setStrengthTable(Array.isArray(p.strengthTable) && p.strengthTable.length > 0 ? p.strengthTable : createInitialStrengthRows(1));
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
    setPurpose({ assessmentPurpose: an.assessmentPurpose, preventionGoals: an.preventionGoals, preventionGoalDetails: an.preventionGoalDetails, historyRegions: an.historyRegions });
    setStep(0);
    // Only use customComplaint as fallback for chiefComplaint if chiefComplaint is missing
    // (legacy rows duplicated both fields). Otherwise customComplaint is its own field.
    setChiefComplaint(readable(an.chiefComplaint || (Array.isArray(an.chiefComplaints) && an.chiefComplaints.length ? an.chiefComplaints : "") || an.customComplaint || ""));
    setAdditionalComplaint(
      an.customComplaint && an.customComplaint !== an.chiefComplaint ? an.customComplaint : ""
    );
    setHistory(an.history || "");
    setDuration(readable(an.duration || an.painDuration || ""));
    setOnset(an.onset || "");
    setAggravating(an.aggravatingFactors || "");
    setRelieving(an.relievingFactors || "");
    setMedications(an.medications || "");
    setPreviousSurgeries(an.previousSurgeries || an.previousTreatments || "");
    setComorbidities(an.comorbidities || "");
    setHealthConditions(Array.isArray(an.healthConditions) ? an.healthConditions : []);
    setHealthConditionsOther(an.healthConditionsOther || "");
    setHealthConditionsOtherOnset(an.healthConditionsOtherOnset || "");
    setHealthConditionsOtherControl(an.healthConditionsOtherControl || "");
    setUsesContinuousMedication(an.usesContinuousMedication || (an.medications ? "yes" : ""));
    setOccupation(an.occupation || "");
    setWorkDemand(an.workDemand || "");
    setParticipationGoal(an.participationGoal || "");
    setComplementaryExams(an.complementaryExams || "");
    setPainScore(typeof a.pain_score === "number" ? a.pain_score : 5);
    setPainTypes(
      Array.isArray(an.painTypes) && an.painTypes.length > 0
        ? (an.painTypes as string[])
        : an.painType
          ? [an.painType]
          : [],
    );
    setPainRegions(
      Array.isArray(a.pain_regions)
        ? a.pain_regions.filter((id: string) => !SIMPLIFIED_EXCLUDED_IDS.has(id))
        : [],
    );
    setPainScoresPerRegion(
      an.painScoresPerRegion && typeof an.painScoresPerRegion === "object"
        ? Object.fromEntries(
            Object.entries(an.painScoresPerRegion as Record<string, number>).filter(
              ([id]) => !SIMPLIFIED_EXCLUDED_IDS.has(id),
            ),
          )
        : (an.pain_scores_per_region && typeof an.pain_scores_per_region === "object"
            ? Object.fromEntries(
                Object.entries(an.pain_scores_per_region as Record<string, number>).filter(
                  ([id]) => !SIMPLIFIED_EXCLUDED_IDS.has(id),
                ),
              )
            : {}),
    );
    setPainTypesPerRegion(
      an.painTypesPerRegion && typeof an.painTypesPerRegion === "object"
        ? Object.fromEntries(
            Object.entries(an.painTypesPerRegion as Record<string, string>).filter(
              ([id]) => !SIMPLIFIED_EXCLUDED_IDS.has(id),
            ),
          )
        : {},
    );
    setPainRegionRefinements(
      an.painRegionRefinements && typeof an.painRegionRefinements === "object"
        ? Object.fromEntries(
            Object.entries(an.painRegionRefinements as Record<string, string[]>).filter(
              ([id]) => !SIMPLIFIED_EXCLUDED_IDS.has(id),
            ),
          )
        : {},
    );
    setRedFlagsChecked(Array.isArray(a.red_flags?.detected) ? a.red_flags.detected : []);
    setAdditionalClinicalNotes(an.additionalClinicalNotes || "");
    setQuestionnaireResults(Array.isArray(a.test_results) ? a.test_results : []);
    setSpecialtyApplied(Array.isArray(an?.specialtyResults) ? an.specialtyResults : []);
    setFunctionalTests(an.functionalTests || "");
    setRomTable(Array.isArray(an.romTable) && an.romTable.length > 0 ? an.romTable : createInitialRomRows(2));
    setSpineBiomechanics(an.spineBiomechanics?.star ? an.spineBiomechanics : emptySpineData());
    setStrengthTable(Array.isArray(an.strengthTable) && an.strengthTable.length > 0 ? an.strengthTable : createInitialStrengthRows(1));
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
    aiDiagnosisBaselineRef.current = dx.text || dxParts.join("\n");
    const tx = a.treatment_plan || null;
    setAiTreatment(tx && typeof tx === "object" ? tx : null);
    setTreatmentText(tx?.text || tx?.summary || "");
    // Carrega metadados de upload externo se a avaliação editada já veio do
    // fluxo de "Upload de avaliação externa".
    if (an?.source === "external_upload") {
      setExternalSource({
        source: "external_upload",
        externalSourceFileId: an.externalSourceFileId || null,
        aiInterpretedFields: Array.isArray(an.aiInterpretedFields) ? an.aiInterpretedFields : [],
      });
      setAdditionalExternalInfo(an.additionalExternalInfo || "");
    } else {
      setExternalSource(null);
      setAdditionalExternalInfo("");
    }
  }, [open, editAssessment]);
  useEffect(() => { if (!open) prefilledIdRef.current = null; }, [open]);

  // ─── Prefill a partir de uma avaliação externa interpretada pela IA ──────
  // Mesmo shape do editAssessment, porém sem id — o save flow insere uma
  // linha nova marcada como `source: "external_upload"`.
  const prefilledMarkerRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !prefillData?.markerId || editAssessment?.id) return;
    if (prefilledMarkerRef.current === prefillData.markerId) return;
    prefilledMarkerRef.current = prefillData.markerId;
    const a = prefillData.row || {};
    const an = a.anamnesis_data || {};
    setPurpose({ assessmentPurpose: an.assessmentPurpose, preventionGoals: an.preventionGoals, preventionGoalDetails: an.preventionGoalDetails, historyRegions: an.historyRegions });
    setStep(0);
    setChiefComplaint(readable(an.chiefComplaint || ""));
    setAdditionalComplaint(an.additionalComplaint || "");
    setHistory(an.history || "");
    setDuration(readable(an.duration || ""));
    setOnset(an.onset || "");
    setAggravating(an.aggravatingFactors || "");
    setRelieving(an.relievingFactors || "");
    setMedications(an.medications || "");
    setPreviousSurgeries(an.previousSurgeries || "");
    setComorbidities(an.comorbidities || "");
    setHealthConditions(Array.isArray(an.healthConditions) ? an.healthConditions : []);
    setHealthConditionsOther(an.healthConditionsOther || "");
    setHealthConditionsOtherOnset(an.healthConditionsOtherOnset || "");
    setHealthConditionsOtherControl(an.healthConditionsOtherControl || "");
    setUsesContinuousMedication(an.usesContinuousMedication || (an.medications ? "yes" : ""));
    setOccupation(an.occupation || "");
    setWorkDemand(an.workDemand || "");
    setParticipationGoal(an.participationGoal || "");
    setComplementaryExams(an.complementaryExams || "");
    setPainScore(typeof a.pain_score === "number" ? a.pain_score : 5);
    setPainTypes(
      Array.isArray((an as any).painTypes) && (an as any).painTypes.length > 0
        ? ((an as any).painTypes as string[])
        : an.painType
          ? [an.painType]
          : [],
    );
    setPainRegions(
      Array.isArray(a.pain_regions)
        ? a.pain_regions.filter((id: string) => !SIMPLIFIED_EXCLUDED_IDS.has(id))
        : [],
    );
    setPainScoresPerRegion(an.painScoresPerRegion && typeof an.painScoresPerRegion === "object" ? an.painScoresPerRegion : {});
    setPainTypesPerRegion(an.painTypesPerRegion && typeof an.painTypesPerRegion === "object" ? an.painTypesPerRegion : {});
    setPainRegionRefinements(an.painRegionRefinements && typeof an.painRegionRefinements === "object" ? an.painRegionRefinements : {});
    setRedFlagsChecked(Array.isArray(a.red_flags?.detected) ? a.red_flags.detected : []);
    setAdditionalClinicalNotes(an.additionalClinicalNotes || "");
    // Passo D2 — triagem de mecanismo pré-preenchida pela leitura do arquivo externo.
    setMechanismAnswers(
      (an as any).mechanismAnswers
        ? sanitizeMechanismAnswers((an as any).mechanismAnswers)
        : createEmptyMechanismAnswers(),
    );
    setQuestionnaireResults(Array.isArray(a.test_results) ? a.test_results : []);
    setFunctionalTests(an.functionalTests || "");
    setRomTable(Array.isArray(an.romTable) && an.romTable.length > 0 ? an.romTable : createInitialRomRows(2));
    setSpineBiomechanics(an.spineBiomechanics?.star ? an.spineBiomechanics : emptySpineData());
    setStrengthTable(Array.isArray(an.strengthTable) && an.strengthTable.length > 0 ? an.strengthTable : createInitialStrengthRows(1));
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
    aiDiagnosisBaselineRef.current = dx.text || dxParts.join("\n");
    setAiTreatment(null);
    setTreatmentText("");
    setExternalSource({
      source: "external_upload",
      externalSourceFileId: prefillData.externalSourceFileId || an.externalSourceFileId || null,
      aiInterpretedFields: Array.isArray(an.aiInterpretedFields) ? an.aiInterpretedFields : [],
    });
    setAdditionalExternalInfo(an.additionalExternalInfo || "");
  }, [open, prefillData, editAssessment?.id]);
  useEffect(() => { if (!open) prefilledMarkerRef.current = null; }, [open]);

  /**
   * Bloco F2 — quando a avaliação nasce de uma reavaliação/prefill, mostramos a
   * triagem de mecanismo anterior como referência (somente leitura).
   */
  const previousMechanismRef = useMemo(() => {
    const src = prefillData?.row?.anamnesis_data?.painMechanism || (prefillData?.row as any)?.pain_mechanism;
    const parsed = parseStoredMechanism(src);
    if (!parsed?.mechanism) return null;
    return {
      mechanism: parsed.mechanism as string,
      subtypeLabel: parsed.subtype ? getSubtypeLabel(parsed.subtype, isPt ? "pt" : "en") : null,
      date: prefillData?.row?.created_at || null,
    };
  }, [prefillData, isPt]);


  // Conta pendentes vinculados a esta avaliação (modo edição) para exibir o
  // banner com o link consolidado e botão de cancelar pendência.
  useEffect(() => {
    if (!open || !editAssessment?.id || demoMode) { setPendingCount(null); setPendingSavedAssessmentId(null); return; }
    setPendingSavedAssessmentId(editAssessment.id);
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("pending_questionnaires" as any)
        .select("status")
        .eq("assessment_id", editAssessment.id);
      if (cancelled || error) return;
      const total = (data || []).length;
      const pending = (data || []).filter((r: any) => r.status === "pending").length;
      setPendingCount({ total, pending });
      if (total > 0) {
        try {
          const longUrl = `${getPublicOrigin()}/avaliacao/pendentes/${editAssessment.id}`;
          const shortUrl = await createShortAppLink(longUrl);
          if (!cancelled) setPendingShareUrl(shortUrl || longUrl);
        } catch { /* silencioso */ }
      }
    })();
    return () => { cancelled = true; };
  }, [open, editAssessment?.id, demoMode]);


  // ── Persistência da sessão do modal ───────────────────────────────────────
  // Grava em localStorage que existe uma avaliação manual em andamento, para
  // que o ManualAssessmentResumer reabra automaticamente caso o app seja
  // descarregado pelo SO (tela bloqueada, troca de app, reload da PWA).
  // `hasContent` só fica true quando o rascunho de fato gravou conteúdo real —
  // abrir e fechar sem digitar nunca gera retomada automática.
  const sessionTrackingEnabled = open && !demoMode;
  const sessionIdRef = useRef<string>("");
  const hasDraftContent = !!draft.lastSavedAt;
  useEffect(() => {
    if (!sessionTrackingEnabled) {
      sessionIdRef.current = "";
      return;
    }
    if (!sessionIdRef.current) sessionIdRef.current = newManualAssessmentSessionId();
    const refresh = () => saveManualAssessmentSession({
      professionalId,
      clinicId: clinicId ?? null,
      patientName,
      patientEmail: patientEmail ?? null,
      patientId: patientId ?? null,
      editAssessmentId: editAssessment?.id ?? null,
      userId: user?.id ?? null,
      openedAt: Date.now(),
      sessionId: sessionIdRef.current,
      hasContent: hasDraftContent || !!editAssessment?.id,
    });
    refresh();
    window.addEventListener("pagehide", refresh);
    window.addEventListener("beforeunload", refresh);
    // freeze é disparado pelo iOS antes de descarregar a aba — última
    // chance de gravar o marcador para que o Resumer reabra ao voltar.
    document.addEventListener("freeze", refresh);
    return () => {
      window.removeEventListener("pagehide", refresh);
      window.removeEventListener("beforeunload", refresh);
      document.removeEventListener("freeze", refresh);
    };
  }, [sessionTrackingEnabled, hasDraftContent, professionalId, clinicId, patientName, patientEmail, patientId, editAssessment?.id, user?.id]);


  // ── Screen Wake Lock (best-effort) ────────────────────────────────────────
  // Evita que a tela bloqueie enquanto o fisio está medindo ADM/força.
  // Silencioso quando o navegador não suporta ou o usuário nega.
  useEffect(() => {
    if (!open || demoMode) return;
    let wakeLock: any = null;
    let cancelled = false;
    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (!wl?.request) return;
        wakeLock = await wl.request("screen");
        if (cancelled && wakeLock) {
          try { await wakeLock.release(); } catch { /* noop */ }
          wakeLock = null;
        }
      } catch {
        /* noop */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !wakeLock) void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (wakeLock) {
        try { wakeLock.release(); } catch { /* noop */ }
      }
    };
  }, [open, demoMode]);

  // ── Confirmação ao sair sem finalizar ─────────────────────────────────────
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const requestClose = () => {
    if (demoMode) {
      onOpenChange(false);
      return;
    }
    setConfirmExitOpen(true);
  };
  const confirmExit = () => {
    setConfirmExitOpen(false);
    closeManualAssessmentSession();
    resetForm();
    onOpenChange(false);
  };






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
          painRegions: preventive ? [] : painRegions,
          painScore: preventive ? null : painScore,
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
  const buildAnamnesisData = () => normalizeAssessmentPurpose({
    ...purpose,
    painRegions, painScore,
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
    healthConditions,
    healthConditionsOther,
    healthConditionsOtherOnset,
    healthConditionsOtherControl,
    usesContinuousMedication,
    continuousMedications: usesContinuousMedication === "no" ? "" : medications,
    occupation,
    workDemand,
    participationGoal,
    complementaryExams,
    painType: effectivePainTypes[0] || "",
    painTypes: effectivePainTypes,
    // Per-region pain scores e tipos (usados pela Comparação de Dor por Região
    // e pelo prompt da IA quando há múltiplas regiões marcadas).
    painScoresPerRegion,
    painTypesPerRegion,
    // Refinamento anatômico por região (medial/lateral, ant/post, prox/distal
    // em membros; lado D/E/central nas regiões axiais). Anexado ao label das
    // regiões no payload da IA para reflexão clínica mais precisa.
    painRegionRefinements: Object.keys(painRegionRefinements).length > 0 ? painRegionRefinements : undefined,
    // Observações clínicas livres anotadas após as red flags. A IA usa este
    // texto para refinar a impressão clínica, o diagnóstico e a sugestão de
    // testes funcionais.
    additionalClinicalNotes: additionalClinicalNotes || undefined,
    functionalTests, // free-text observations from Step 4 (kept inside anamnesis_data so it persists and shows up in views)
    romTable: sanitizeRomRows(romTable), // Joint mobility / ROM table
    spineBiomechanics: spinePayload(spineBiomechanics), // Maigne + Fryette (optional)
    strengthTable: sanitizeStrengthRows(strengthTable), // Dynamometry / muscle strength
    patientName,
    patientEmail: patientEmail || null,
    // Specialty (cardio/geri) results applied inline during this session.
    specialtyResults: specialtyApplied.length > 0 ? specialtyApplied : undefined,
    // External-source metadata (set when this assessment was created from an
    // AI-interpreted PDF/image upload). Kept inside anamnesis_data so PDF,
    // AssessmentView and downstream AI calls can detect/render it.
    ...(externalSource
      ? {
          source: externalSource.source,
          externalSourceFileId: externalSource.externalSourceFileId || null,
          aiInterpretedFields: externalSource.aiInterpretedFields || [],
        }
      : {}),
    ...(additionalExternalInfo ? { additionalExternalInfo } : {}),
  });

  /**
   * Passo D1 — mecanismo de dor determinístico do fluxo manual/expresso.
   * Retorna null quando a triagem (opcional) não foi preenchida.
   */
  const buildProMechanism = () =>
    !preventive && ENABLE_PAIN_MECHANISM && hasMechanismAnswers(mechanismAnswers)
      ? toStoredMechanism(
          classifyMechanism({
            descriptors: mechanismAnswers.descriptors,
            distribution: mechanismAnswers.distribution,
            criteria: mechanismAnswers.criteria,
            subtype: mechanismAnswers.subtype,
            proportionateToStimulus: mechanismAnswers.proportionateToStimulus,
            spontaneousPain: mechanismAnswers.spontaneousPain,
            multisensoryHypersensitivity: mechanismAnswers.multisensoryHypersensitivity,
            nonRestorativeSleep: mechanismAnswers.nonRestorativeSleep,
            persistentFatigue: mechanismAnswers.persistentFatigue,
            objectiveNeuroSigns: mechanismAnswers.objectiveNeuroSigns,
            durationWeeks,
            csiScore: mechanismAnswers.csiScore,
            regionCount: painRegions.length,
          }),
          "rules",
          mechanismAnswers.csiScore,
          mechanismAnswers.criteria,
        )
      : null;

  const generateAIDiagnosis = async () => {
    if (demoMode) { demoUpsellToast(); return; }
    setGeneratingDx(true);
    try {
      const invokeDx = () => supabase.functions.invoke("generate-diagnosis", {
        body: {
          // Edge function expects `anamnesisData` (not `anamnesis`) and reads
          // painRegions / painScore / painTypes from inside it.
          anamnesisData: {
            ...buildAnamnesisData(),
            redFlags: redFlagsChecked,
          },
          questionnaireResults,
          redFlags: redFlagsChecked,
          mode: "professional",
          language,
          // Passo D1 — mecanismo/extensão como contexto clínico para a IA.
          painMechanism: buildProMechanism(),
          painExtent: preventive ? null : computePainExtent(painRegions).surfacePercent || null,
        },
      });
      // One automatic retry: a dropped connection on a slow reply is served from
      // the server cache on the second call (same payload, no extra credit).
      let { data, error } = await invokeDx();
      if (error) {
        await new Promise((r) => setTimeout(r, 1500));
        ({ data, error } = await invokeDx());
      }
      if (error) throw error;
      const dx = data?.diagnosis || data;
      if (dx && typeof dx === "object" && (dx.hypothesis || dx.summary)) {
        setAiDiagnosis(dx);
        const parts: string[] = [];
        if (dx.hypothesis) parts.push(String(dx.hypothesis));
        if (dx.summary) parts.push("", String(dx.summary));
        if (dx.reasoning) parts.push("", String(dx.reasoning));
        setDiagnosisText(parts.join("\n"));
        aiDiagnosisBaselineRef.current = parts.join("\n");
      } else {
        setAiDiagnosis(null);
        const raw = typeof dx === "string" ? dx : JSON.stringify(dx, null, 2);
        setDiagnosisText(raw);
        aiDiagnosisBaselineRef.current = raw;
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
          },
          questionnaireResults,
          diagnosis: aiDiagnosis || (diagnosisText ? { summary: diagnosisText } : null),
          // Passo D3 — mecanismo de dor guia a dosagem/progressão do plano.
          painMechanism: (aiDiagnosis as any)?.pain_mechanism || buildProMechanism(),
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

  // ===== Cluster de Laslett (sacroilíaca) =====
  // Sugerido automaticamente quando a avaliação descreve dor/incômodo na
  // região sacroilíaca (sacro, pelve posterior, glúteo, lombar baixa).
  const sijLang: "pt" | "en" | "es" = language === "en" ? "en" : language === "es" ? "es" : "pt";
  const sacroiliacDetected = useMemo(
    () =>
      !preventive && detectSacroiliacPain({
        painRegionIds: painRegions,
        texts: [
          chiefComplaint,
          history,
          aggravating,
          relieving,
          painType,
          ...painRegions.flatMap((id) => painRegionRefinements[id] || []),
        ],
      }),
    [preventive, painRegions, painRegionRefinements, chiefComplaint, history, aggravating, relieving, painType],
  );

  const displayedSuggestions: TestSuggestion[] = useMemo(
    () => mergeSacroiliacCluster(testSuggestions, sacroiliacDetected, sijLang),
    [testSuggestions, sacroiliacDetected, sijLang],
  );

  const generateTestSuggestions = async () => {
    if (demoMode) { demoUpsellToast(); return; }
    setSuggestingTests(true);
    try {
      const anamnesisSummary = [
        preventiveReasoningContext(purpose),
        chiefComplaint && `Queixa principal: ${chiefComplaint}`,
        history && `História: ${history}`,
        duration && `Duração: ${duration}`,
        onset && `Início: ${onset}`,
        aggravating && `Piora com: ${aggravating}`,
        relieving && `Alivia com: ${relieving}`,
        occupation && `Ocupação: ${occupation}`,
        formatParticipationContext({ workDemand, participationGoal }),
        formatHealthConditions({ healthConditions, healthConditionsOther, healthConditionsOtherOnset, healthConditionsOtherControl }, "pt") &&
          `Condições de saúde: ${formatHealthConditions({ healthConditions, healthConditionsOther, healthConditionsOtherOnset, healthConditionsOtherControl }, "pt")}`,
        formatContinuousMedication({ usesContinuousMedication, continuousMedications: medications }, "pt") &&
          `Medicação de uso contínuo: ${formatContinuousMedication({ usesContinuousMedication, continuousMedications: medications }, "pt")}`,
        comorbidities && `Comorbidades: ${comorbidities}`,
        additionalClinicalNotes && `Observações clínicas adicionais: ${additionalClinicalNotes}`,
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("suggest-functional-tests", {
        body: {
          anamnesis: anamnesisSummary,
          painScore: preventive ? null : painScore,
          painType: preventive ? "" : painType,
          painRegions: (preventive ? [] : painRegions).map((id) => {
            const base = regionLabelMap[id]?.[isPt ? "label_pt" : "label_en"] || id;
            const refs = painRegionRefinements[id];
            if (!refs || refs.length === 0) return base;
            return `${base} (${refs.map((v) => refinementLabel(id, v)).join(", ")})`;
          }),
          redFlags: redFlagsChecked,
          questionnaireResults: questionnaireResults.map((r) => ({
            name: r.questionnaireName,
            score: r.totalScore,
            severity: r.severity,
            interpretation: isPt ? r.interpretation_pt : r.interpretation_en,
          })),
          currentTestsText: functionalTests,
          sacroiliacSuspected: sacroiliacDetected,
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

  /**
   * Gera e baixa um PDF-resumo da avaliação salva (anamnese, red flags,
   * observações adicionais, hipótese e plano) para o fisio compartilhar com o
   * paciente. Reusa o mesmo gerador do dashboard, garantindo branding
   * (logo do profissional ou da clínica) quando disponível.
   */
  const handleDownloadSummaryPdf = async (assessmentId: string) => {
    if (!assessmentId || generatingSummaryPdf) return;
    setGeneratingSummaryPdf(true);
    try {
      const { data: a, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();
      if (error || !a) throw error || new Error("not found");
      const rawDiagnosis = (a.diagnosis && typeof a.diagnosis === "object") ? (a.diagnosis as any) : {};
      const diagnosisForPdf = {
        ...rawDiagnosis,
        hypothesis: String(rawDiagnosis.hypothesis || rawDiagnosis.summary || rawDiagnosis.text || (isPt ? "Hipótese em construção" : "Hypothesis in progress")),
        summary: String(rawDiagnosis.summary || rawDiagnosis.text || rawDiagnosis.clinicalImpression?.overview || (isPt ? "Resumo clínico não registrado." : "Clinical summary not recorded.")),
        confidence: rawDiagnosis.confidence || "moderate",
        disclaimer: rawDiagnosis.disclaimer || (isPt
          ? "Resumo gerado a partir da avaliação manual registrada pelo profissional."
          : "Summary generated from the professional manual assessment."),
      };
      // Single source of truth for logos + technical responsible: clinic logo
      // wins, and the solo professional logo is used whenever there is none.
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const branding = await resolveAssessmentBranding({
        clinicId: clinicId || null,
        professionalId: professionalId || null,
        userId: (await supabase.auth.getUser()).data.user?.id || null,
      });
      const proLogoUrl = branding.professionalLogoUrl;
      const clinicLogoUrl = branding.clinicLogoUrl;
      const clinicName = branding.clinicName;
      const responsibleProfessional = branding.responsibleProfessional;

      const { generateAssessmentPdfBlob } = await import("@/utils/generatePdf");
      const blob = await generateAssessmentPdfBlob({
        diagnosis: diagnosisForPdf,
        treatmentPlan: a.treatment_plan,
        language: isPt ? "pt" : "en",
        userName: a.patient_name || (isPt ? "Paciente" : "Patient"),
        anamnesisData: a.anamnesis_data,
        painRegions: a.pain_regions,
        testResults: a.test_results,
        redFlags: (a.red_flags as any)?.detected,
        professionalLogoUrl: proLogoUrl,
        clinicLogoUrl,
        clinicName,
        brandColor: branding.brandColor,
        responsibleProfessional,
      } as any);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AliviA_Resumo_${(a.patient_name || "Paciente").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: isPt ? "PDF gerado" : "PDF generated" });
    } catch (err: any) {
      console.error("summary pdf error:", err);
      toast({
        title: isPt ? "Erro ao gerar PDF" : "PDF error",
        description: err?.message || (isPt ? "Tente novamente em instantes." : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setGeneratingSummaryPdf(false);
    }
  };


  const handleSave = async (navigateAfter: boolean = false) => {
    if (demoMode) { demoUpsellToast(); return; }
    if (!patientName.trim()) {
      toast({ title: isPt ? "Nome do paciente é obrigatório" : "Patient name required", variant: "destructive" });
      return;
    }
    // Bloqueia o salvamento quando o fisio mudou as regiões de dor mas há
    // questionários pendentes gerados a partir das regiões anteriores. Isso
    // mantém o conjunto de questionários sempre sincronizado com o mapa.
    if (isEditing && pendingCount && pendingCount.pending > 0) {
      const original = (editAssessment?.pain_regions || []) as string[];
      const changed =
        original.length !== painRegions.length ||
        original.some((r) => !painRegions.includes(r)) ||
        painRegions.some((r) => !original.includes(r));
      if (changed) {
        toast({
          title: isPt ? "Sincronize os questionários pendentes" : "Sync pending questionnaires first",
          description: isPt
            ? `Há ${pendingCount.pending} questionário(s) pendente(s) ligado(s) às regiões anteriores. Use "Encerrar" no banner de pendentes (no topo) para cancelar — ao salvar, novos serão gerados conforme as regiões atuais — ou restaure as regiões originais.`
            : `There are ${pendingCount.pending} pending questionnaires tied to the previous regions. Use "Cancel" on the pending banner (top) to clear them — new ones will be generated for the current regions on save — or restore the original regions.`,
          variant: "destructive",
        });
        return;
      }
    }
    setSaving(true);
    try {
      // O profissional mexeu no texto do diagnóstico depois de gerar a hipótese?
      const professionalEditedDiagnosis =
        diagnosisText.trim() !== aiDiagnosisBaselineRef.current.trim() && !!diagnosisText.trim();
      const editedFirstLine = diagnosisText.split("\n").map((l) => l.trim()).find(Boolean) || "";
      const editedHypothesis = editedFirstLine.startsWith("{") || editedFirstLine.startsWith("[")
        ? "" : editedFirstLine;

      const row: any = {
        type: "professional",
        status: "completed",
        patient_name: patientName,
        patient_email: patientEmail || null,
        anamnesis_data: isEditing && editAssessment?.id
          ? mergeAnamnesisOnUpdate(editAssessment.anamnesis_data, buildAnamnesisData(), {
              continuation: !!continuationOfLink || !!editAssessment.anamnesis_data?.patientSnapshot,
              userId: user?.id || null,
            })
          : buildAnamnesisData(),
        pain_regions: preventive ? [] : painRegions,
        // Aggregate pain_score = highest per-region score (clinically the most
        // representative) when per-region values exist; otherwise the slider value.
        pain_score: preventive ? null : (() => {
          const vals = painRegions
            .map((r) => painScoresPerRegion[r])
            .filter((v): v is number => typeof v === "number");
          return vals.length > 0 ? Math.max(...vals) : painScore;
        })(),
        red_flags: redFlagsChecked.length > 0 ? { detected: redFlagsChecked } : null,
        // Passo B1/D1 — mecanismo de dor: prioriza o refinamento da IA (que já
        // vem validado com fallback determinístico na edge function) e cai no
        // cálculo local quando não houve chamada de IA.
        // Só grava quando houve triagem; avaliações sem triagem seguem nulas.
        ...(() => {
          if (preventive) return { pain_mechanism: null };
          const aiMech = (aiDiagnosis as any)?.pain_mechanism;
          const mech = (aiMech && typeof aiMech === "object" ? aiMech : null) ?? buildProMechanism();
          return mech ? { pain_mechanism: mech } : {};
        })(),
        // Passo C2 — extensão de dor sempre que houver regiões marcadas.
        pain_extent: preventive ? null : computePainExtent(painRegions).surfacePercent || null,

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
        // Diagnosis: a hipótese da IA vale como padrão, MAS se o profissional
        // editou o texto do diagnóstico depois de gerar, a palavra dele prevalece
        // (prontuário, PDF e WhatsApp) via `hypothesis` + `final_hypothesis`.
        diagnosis: (aiDiagnosis || diagnosisText || clinicalImpression)
          ? (() => {
              const aiHyp = aiDiagnosis?.hypothesis?.toString().trim();
              const firstLine = diagnosisText.split("\n").map((l) => l.trim()).find(Boolean) || "";
              // Avoid leaking raw JSON braces as hypothesis text.
              const cleanFirst = firstLine.startsWith("{") || firstLine.startsWith("[")
                ? "" : firstLine;
              const hypothesis = professionalEditedDiagnosis
                ? (cleanFirst || aiHyp || null)
                : (aiHyp || cleanFirst || null);
              return {
                manual: true,
                ...(aiDiagnosis || {}),
                hypothesis: hypothesis ? hypothesis.slice(0, 280) : null,
                ...(professionalEditedDiagnosis ? { professionalEdited: true } : {}),
                summary: professionalEditedDiagnosis
                  ? (diagnosisText || aiDiagnosis?.summary || clinicalImpression || null)
                  : (aiDiagnosis?.summary || diagnosisText || clinicalImpression || null),
                text: diagnosisText || null,
                clinicalImpression: savedClinicalImpression(clinicalImpression, aiClinicalImpression),
              };
            })()
          : null,
        // Hipótese final definida pelo profissional (sobrescreve a da IA em todo lugar).
        ...(professionalEditedDiagnosis && editedHypothesis
          ? {
              final_hypothesis: editedHypothesis.slice(0, 280),
              final_hypothesis_by: user?.id || null,
              final_hypothesis_at: new Date().toISOString(),
            }
          : {}),

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

      // Passo B1 — registra a triagem de mecanismo (auditável). Falha aqui
      // nunca invalida a avaliação já salva.
      if (savedId && !preventive && ENABLE_PAIN_MECHANISM && hasMechanismAnswers(mechanismAnswers)) {
        try {
          await supabase.from("pain_mechanism_screenings" as any).insert({
            assessment_id: savedId,
            created_by: user?.id || null,
            answers: { ...mechanismAnswers, durationWeeks, regionCount: painRegions.length },
            csi_score: mechanismAnswers.csiScore,
            result: row.pain_mechanism ?? null,
            source: "manual",
          });
        } catch {
          /* silencioso por design */
        }
      }

      // Persist scheduled specialty questionnaires as pending rows tied to this assessment.
      let createdSpecialtyPending = 0;
      if (savedId) {
        const pendingItems = specialtyPanelRef.current?.getScheduled() || [];
        const toInsert = pendingItems.filter((p) => !p.share_token);
        if (toInsert.length > 0) {
          const { error: specialtyPendingError } = await supabase.from("pending_questionnaires" as any).insert(
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
          if (specialtyPendingError) throw specialtyPendingError;
          createdSpecialtyPending = toInsert.length;
        }
      }

      // Quando o fisio optou por enviar os questionários para o paciente
      // preencher depois, inserimos uma linha "general" por questionário
      // aplicável (baseado nas regiões marcadas) vinculada à mesma avaliação.
      let createdGeneralPending = 0;
      if (savedId && !preventive && deferQuestionnaires && painRegions.length > 0) {
        const applicable = getApplicableQuestionnaires(painRegions);
        const { data: existing, error: existingError } = await supabase
          .from("pending_questionnaires" as any)
          .select("questionnaire_id, domain")
          .eq("assessment_id", savedId);
        if (existingError) throw existingError;
        const seen = new Set(
          (existing || [])
            .filter((r: any) => r.domain === "general")
            .map((r: any) => r.questionnaire_id),
        );
        const rows = applicable
          .filter((q) => !seen.has(q.id))
          .map((q) => ({
            assessment_id: savedId,
            professional_id: clinicId ? null : professionalId,
            clinic_id: clinicId || null,
            questionnaire_id: q.id,
            domain: "general",
            suggested_reason: isPt
              ? `Aplicável às regiões: ${painRegions.join(", ")}`
              : `Applies to regions: ${painRegions.join(", ")}`,
            status: "pending",
          }));
        if (rows.length > 0) {
          const { error: generalPendingError } = await supabase.from("pending_questionnaires" as any).insert(rows);
          if (generalPendingError) throw generalPendingError;
          createdGeneralPending = rows.length;
        }
      }

      toast({ title: isEditing ? (isPt ? "Avaliação atualizada!" : "Assessment updated!") : (isPt ? "Avaliação criada!" : "Assessment created!") });
      if (!isEditing) void draft.discard();
      closeManualAssessmentSession();
      if (savedId) onSaved?.(savedId);

      // Se há pendências (gerais ou de especialidade), gera o link único e
      // abre o diálogo de compartilhamento ANTES de fechar o modal para que o
      // fisio copie/envie de uma vez.
      if (savedId && (createdGeneralPending > 0 || createdSpecialtyPending > 0)) {
        try {
          const longUrl = `${getPublicOrigin()}/avaliacao/pendentes/${savedId}`;
          const shortUrl = await createShortAppLink(longUrl);
          setPendingShareUrl(shortUrl || longUrl);
          setPendingSavedAssessmentId(savedId);
          setPendingShareOpen(true);
          // Não fecha o modal — usuário fecha após copiar o link.
          return;
        } catch (err) {
          console.warn("pending share link generation failed", err);
        }
      }

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
    setPurpose({});
    setStep(0);
    setChiefComplaint(""); setHistory(""); setDuration(""); setOnset("");
    setAggravating(""); setRelieving(""); setMedications(""); setPreviousSurgeries("");
    setComorbidities(""); setOccupation(""); setPainScore(5); setPainType("");
    setPainRegions([]); setPainScoresPerRegion({}); setPainTypesPerRegion({});
    setRedFlagsChecked([]); setAdditionalClinicalNotes("");
    setMechanismAnswers(createEmptyMechanismAnswers());
    setQuestionnaireResults([]); setDeferQuestionnaires(false);
    setPendingShareUrl(null); setPendingShareOpen(false); setPendingCount(null);
    setFunctionalTests(""); setClinicalImpression(""); setAiClinicalImpression(null);
    setDiagnosisText(""); setTreatmentText(""); setAiDiagnosis(null); setAiTreatment(null);
    aiDiagnosisBaselineRef.current = "";
    setSpecialtyApplied([]);
    setExternalSource(null);
    setAdditionalExternalInfo("");
  };

  const stepLabels = isPt
    ? ["Anamnese", "Red Flags", "Mapa de dor", "Intensidade & Tipo", "Observações clínicas", "Questionários", "Mobilidade articular (ADM)", "Testes funcionais", "Dinamometria", "Diagnóstico"]
    : ["Anamnesis", "Red Flags", "Pain map", "Intensity & Type", "Clinical observations", "Questionnaires", "Joint mobility (ROM)", "Functional tests", "Dynamometry", "Diagnosis"];

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) { onOpenChange(true); return; }
        // Solicitação de fechar (X do canto, ESC capturado se chegar aqui):
        // sempre confirma antes de descartar o trabalho em andamento.
        if (demoMode) { resetForm(); onOpenChange(false); return; }
        setConfirmExitOpen(true);
      }}
    >
      <DialogContent data-manual-assessment-modal=""
        className="max-w-3xl h-[100dvh] sm:h-[90dvh] max-h-[100dvh] flex flex-col p-0 gap-0"
        onEscapeKeyDown={(e) => {
          // ESC nunca fecha — usuário precisa clicar no X e confirmar.
          if (!demoMode) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Cliques fora do modal NUNCA fecham (usuário pediu persistência
          // a qualquer custo enquanto mede ADM/força com outros apps abertos).
          // Exceção mantida: FAB do gravador de voz é portal externo.
          const target = e.target as HTMLElement | null;
          if (target?.closest?.("[data-voice-recorder-fab]")) { e.preventDefault(); return; }
          if (!demoMode) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest?.("[data-voice-recorder-fab]")) { e.preventDefault(); return; }
          if (!demoMode) e.preventDefault();
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
              ? `Etapa ${stepPosition + 1} de ${visibleSteps.length}: ${preventive && step === 2 ? purposeCopy[language].map : stepLabels[step]}`
              : `Step ${stepPosition + 1} of ${visibleSteps.length}: ${preventive && step === 2 ? purposeCopy[language].map : stepLabels[step]}`}
          </DialogDescription>
        </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1 px-1 mt-3">
            {visibleSteps.map((i) => (
              <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-6">
          {continuationOfLink && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
              {isPt
                ? "Continuando a pré-avaliação respondida pelo paciente no link. Os dados e questionários já respondidos vêm preenchidos — acrescente ou refine. As respostas originais do paciente ficam guardadas."
                : "Continuing the pre-assessment answered by the patient via link. Existing answers and questionnaires are pre-filled — add or refine. The patient's original answers are kept."}
            </div>
          )}
          <div className="space-y-4 py-4">
            {externalSource && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {isPt ? "Avaliação externa interpretada pela IA" : "External assessment interpreted by AI"}
                    </p>
                    <p className="leading-snug text-muted-foreground mt-0.5">
                      {isPt
                        ? `${externalSource.aiInterpretedFields?.length || 0} campo(s) pré-preenchido(s) a partir do arquivo enviado. Revise tudo antes de salvar — o conteúdo passa a fazer parte do prontuário do paciente.`
                        : `${externalSource.aiInterpretedFields?.length || 0} field(s) pre-filled from the uploaded file. Review everything before saving — the content becomes part of the patient's chart.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
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

            {/* Banner de questionários pendentes vinculados a esta avaliação */}
            {isEditing && step === 0 && pendingCount && pendingCount.total > 0 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <ClipboardList className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {isPt
                        ? `Questionários pendentes (${pendingCount.total - pendingCount.pending} de ${pendingCount.total} respondidos)`
                        : `Pending questionnaires (${pendingCount.total - pendingCount.pending} of ${pendingCount.total} answered)`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isPt
                        ? "Link para o paciente preencher os questionários ligados a esta avaliação."
                        : "Link for the patient to complete the questionnaires linked to this assessment."}
                    </p>
                  </div>
                </div>
                {pendingShareUrl && (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-[11px] bg-background border rounded px-2 py-1 flex-1 truncate min-w-[140px]">{pendingShareUrl}</code>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(pendingShareUrl); toast({ title: isPt ? "Link copiado" : "Link copied" }); }}>
                      <Copy className="h-3 w-3" /> {isPt ? "Copiar" : "Copy"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent((isPt ? "Olá! Por favor, responda os questionários da sua avaliação: " : "Hi! Please answer your assessment questionnaires: ") + pendingShareUrl)}`, "_blank")}>
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </Button>
                    {editAssessment?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={generatingSummaryPdf}
                        onClick={() => handleDownloadSummaryPdf(editAssessment.id)}
                      >
                        {generatingSummaryPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                        {isPt ? "PDF resumo" : "Summary PDF"}
                      </Button>
                    )}
                    {pendingCount.pending > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!editAssessment?.id) return;
                          if (!confirm(isPt ? "Encerrar pendência? Os questionários não respondidos ficarão indisponíveis para o paciente." : "Cancel pending? Unanswered questionnaires will become unavailable to the patient.")) return;
                          await supabase
                            .from("pending_questionnaires" as any)
                            .update({ status: "cancelled" })
                            .eq("assessment_id", editAssessment.id)
                            .eq("status", "pending");
                          setPendingCount({ total: pendingCount.total, pending: 0 });
                          toast({ title: isPt ? "Pendência encerrada" : "Pending cancelled" });
                        }}
                      >
                        <X className="h-3 w-3" /> {isPt ? "Encerrar" : "Cancel"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}



            {/* Demo voice recorder: floating FAB mock lives at the end of DialogContent */}


            {/* STEP 0: ANAMNESE */}
            {step === 0 && (
              <div className="space-y-3">
                <AssessmentPurposeFields value={purpose} onChange={patch => setPurpose(prev => ({ ...prev, ...patch }))} />
                {!preventive && <div>
                  <Label className="text-xs">{isPt ? "Queixa principal" : "Chief complaint"} *</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(chiefComplaint, MOCK_MANUAL_CASE.chiefComplaint, setChiefComplaint, "")}>
                    <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={2}
                      placeholder={isPt ? "Ex: Dor lombar à esquerda há 3 semanas" : "E.g. Left lumbar pain for 3 weeks"} className="mt-1 text-sm" />
                  </DemoShield>
                </div>}
                {!preventive && <div>
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
                </div>}
                <div>
                  <Label className="text-xs">{isPt ? "Histórico" : "History"}</Label>
                  <DemoShield on={demoMode} onAutofill={() => autofill(history, MOCK_MANUAL_CASE.history, setHistory, "")}>
                    <Textarea
                      value={history}
                      onChange={(e) => setHistory(e.target.value)}
                      rows={6}
                      placeholder={isPt
                        ? "Descreva como o quadro começou, evolução, tratamentos anteriores, contexto ocupacional e qualquer informação relevante sobre o caso clínico."
                        : "Describe how the condition started, its evolution, prior treatments, occupational context and any relevant clinical information."}
                      className="mt-1 text-sm min-h-[150px] resize-y"
                    />
                  </DemoShield>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!preventive && <div>
                    <Label className="text-xs">{isPt ? "Tempo de evolução" : "Duration"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(duration, MOCK_MANUAL_CASE.duration, setDuration, "")}>
                      <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 text-sm h-9" />
                    </DemoShield>
                  </div>}
                  {!preventive && <div>
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
                  </div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!preventive && <div>
                    <Label className="text-xs">{isPt ? "Fatores agravantes" : "Aggravating factors"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(aggravating, MOCK_MANUAL_CASE.aggravating, setAggravating, "")}>
                      <Textarea value={aggravating} onChange={(e) => setAggravating(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </DemoShield>
                  </div>}
                  {!preventive && <div>
                    <Label className="text-xs">{isPt ? "Fatores aliviantes" : "Relieving factors"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(relieving, MOCK_MANUAL_CASE.relieving, setRelieving, "")}>
                      <Textarea value={relieving} onChange={(e) => setRelieving(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </DemoShield>
                  </div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Uso contínuo de medicamentos?" : "Continuous-use medication?"}</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {[{ v: "yes", l: isPt ? "Sim" : "Yes" }, { v: "no", l: isPt ? "Não" : "No" }].map((o) => (
                        <Button
                          key={o.v}
                          type="button"
                          size="sm"
                          variant={usesContinuousMedication === o.v ? "default" : "outline"}
                          className="h-9 rounded-lg text-sm"
                          onClick={() => {
                            setUsesContinuousMedication(o.v);
                            if (o.v === "no") setMedications("");
                          }}
                        >
                          {o.l}
                        </Button>
                      ))}
                    </div>
                    {usesContinuousMedication === "yes" && (
                      <DemoShield on={demoMode} onAutofill={() => autofill(medications, MOCK_MANUAL_CASE.medications, setMedications, "")}>
                        <Textarea
                          value={medications}
                          onChange={(e) => setMedications(e.target.value)}
                          rows={2}
                          className="mt-2 text-sm"
                          placeholder={isPt ? "Quais medicamentos?" : "Which medications?"}
                        />
                      </DemoShield>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">{isPt ? "Cirurgias prévias ou planejadas" : "Previous or planned surgeries"}</Label>
                    <DemoShield on={demoMode} onAutofill={() => autofill(previousSurgeries, MOCK_MANUAL_CASE.previousSurgeries, setPreviousSurgeries, "")}>
                      <Textarea value={previousSurgeries} onChange={(e) => setPreviousSurgeries(e.target.value)} rows={2} className="mt-1 text-sm" placeholder={isPt ? onset === "post_surgery" ? "Ex.: Reconstrução do LCA em 08/10/2026, enxerto de flexores, sutura meniscal. Cirurgião: 1 muleta por 2 semanas." : "Ex.: Pré-operatório de reconstrução do LCA. Cirurgia marcada para 20/11/2026 (se definida). Restrições do cirurgião: ..." : undefined} />
                    </DemoShield>
                    {onset === "post_surgery" && isPt && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Data, enxerto, sutura meniscal e restrições do cirurgião escritos aqui pré-preenchem a trajetória pós-operatória no prontuário.</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{isPt ? "Condições de saúde" : "Health conditions"}</Label>
                  <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HEALTH_CONDITION_IDS.map((id) => {
                      const selected = healthConditions.includes(id);
                      return (
                        <Button
                          key={id}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className="h-9 rounded-lg text-xs justify-start"
                          onClick={() => {
                            setHealthConditions((prev) => {
                              if (id === "none") return prev.includes("none") ? [] : ["none"];
                              return prev.includes(id)
                                ? prev.filter((c) => c !== id)
                                : [...prev.filter((c) => c !== "none"), id];
                            });
                            if (id === "other" && healthConditions.includes("other")) {
                              setHealthConditionsOther("");
                              setHealthConditionsOtherOnset("");
                              setHealthConditionsOtherControl("");
                            }
                          }}
                        >
                          {healthConditionLabel(id, language)}
                        </Button>
                      );
                    })}
                  </div>
                  {healthConditions.includes("other") && (
                    <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                      <Input
                        value={healthConditionsOther}
                        onChange={(e) => setHealthConditionsOther(e.target.value)}
                        className="text-sm h-9"
                        placeholder={isPt ? "Qual condição?" : "Which condition?"}
                      />
                      <div>
                        <Label className="text-xs">{isPt ? "Desde quando?" : "Since when?"}</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {OTHER_ONSET_OPTIONS.map((o) => (
                            <Button
                              key={o.id}
                              type="button"
                              size="sm"
                              variant={healthConditionsOtherOnset === o.id ? "default" : "outline"}
                              className="h-8 rounded-lg text-xs"
                              onClick={() => setHealthConditionsOtherOnset(o.id)}
                            >
                              {otherOnsetLabel(o.id, language)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{isPt ? "Controle atual" : "Current control"}</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {OTHER_CONTROL_OPTIONS.map((o) => (
                            <Button
                              key={o.id}
                              type="button"
                              size="sm"
                              variant={healthConditionsOtherControl === o.id ? "default" : "outline"}
                              className="h-8 rounded-lg text-xs"
                              onClick={() => setHealthConditionsOtherControl(o.id)}
                            >
                              {otherControlLabel(o.id, language)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isPt ? "Outras comorbidades" : "Other comorbidities"}</Label>
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
                  <Label className="text-xs">{isPt ? "Rotina de trabalho — até 2 (participação/ambiente)" : "Work routine (participation/environment)"}</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {WORK_DEMAND_IDS.map((id) => (
                      <Button key={id} type="button" size="sm" variant={parseWorkDemands(workDemand).includes(id) ? "default" : "outline"}
                        className="h-auto min-h-9 py-1.5 rounded-lg text-xs justify-start whitespace-normal text-left" disabled={demoMode}
                        onClick={() => setWorkDemand(toggleWorkDemand(workDemand, id))}>
                        {workDemandLabel(id, language)}
                      </Button>
                    ))}
                  </div>
                </div>
                {!preventive && <div>
                  <Label className="text-xs">{isPt ? "Atividade que mais faz falta hoje" : "Activity most missed today"}</Label>
                  <Input value={participationGoal} onChange={(e) => setParticipationGoal(e.target.value.slice(0, 200))} maxLength={200} disabled={demoMode}
                    placeholder={isPt ? "Ex.: trabalhar 2h sem dor, correr, brincar com o filho" : "E.g. work 2h pain-free, run, play with my child"} className="mt-1 text-sm h-9" />
                </div>}
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


            {/* STEP 1: RED FLAGS */}
            {step === 1 && (
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

            {/* STEP 2: MAPA DE DOR — apenas seleção das regiões. Intensidade e
                tipo de dor vão na etapa seguinte (já contextualizados pelas
                regiões marcadas aqui). */}
            {step === 2 && (
              <div className="space-y-4">
                {preventive ? <PainMap purpose="history" selectedRegions={purpose.historyRegions || []} onRegionsChange={historyRegions => setPurpose(prev => ({ ...prev, historyRegions }))} /> : <>
                {/* Refinamento anatômico aparece NO TOPO assim que houver
                    regiões marcadas — evita que fique escondido abaixo da
                    lista de seleção. */}
                {painRegions.length > 0 && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">
                        {isPt ? "Refinamento anatômico (opcional)" : "Anatomical refinement (optional)"}
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isPt
                          ? "Cada região oferece as opções clinicamente relevantes daquela articulação ou segmento (ex.: lombar → central, unilateral D/E ou bilateral em faixa; joelho → anterior/posterior/medial/lateral; cotovelo → medial, lateral, anterior ou posterior)."
                          : "Each region offers the clinically relevant options for that joint or segment (e.g., lumbar → central, unilateral R/L or bilateral band-like; knee → anterior/posterior/medial/lateral; elbow → medial, lateral, anterior or posterior)."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {painRegions.map((id) => {
                        const lbl = regionLabelMap[id];
                        const axes = getRefinementAxes(id);
                        const group = getRegionGroup(id);
                        const selected = painRegionRefinements[id] || [];
                        return (
                          <div key={id} className="rounded-md border bg-card p-2">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-medium text-foreground">
                                {lbl ? (isPt ? lbl.label_pt : lbl.label_en) : id}
                              </span>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {isPt ? group.label_pt : group.label_en}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {axes.map((ax) => {
                                const active = selected.includes(ax.value);
                                return (
                                  <button
                                    type="button"
                                    key={ax.value}
                                    onClick={() => toggleRegionRefinement(id, ax.value)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                      active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:bg-muted"
                                    }`}
                                  >
                                    {isPt ? ax.label_pt : ax.label_en}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs mb-2 block">
                    {isPt ? "Regiões com dor (proximais → distais, em ordem alfabética)" : "Pain regions (proximal → distal, alphabetical)"}
                  </Label>

                  {/* Busca rápida por região */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={regionSearch}
                      onChange={(e) => setRegionSearch(e.target.value)}
                      placeholder={isPt ? "Buscar região (ex: ombro, cervical, lombar...)" : "Search region (e.g. shoulder, cervical, lumbar...)"}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>

                  <DemoShield on={demoMode} onAutofill={() => toggleRegion("")}>
                    <div className="max-h-[60vh] overflow-y-auto border rounded-md p-2 space-y-3">
                      {(() => {
                        const q = regionSearch
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .toLowerCase();
                        const filtered = regionGroups
                          .map((g) => {
                            const matchedIds = q
                              ? g.ids.filter((id) => {
                                  const lbl = regionLabelMap[id];
                                  const text = isPt ? lbl.label_pt : lbl.label_en;
                                  return text
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .toLowerCase()
                                    .includes(q);
                                })
                              : g.ids;
                            const groupMatches = q
                              ? (isPt ? g.label_pt : g.label_en)
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .toLowerCase()
                                  .includes(q)
                              : true;
                            // Se o grupo casa com a busca, mostre todas as regiões dele;
                            // senão, mostre apenas as regiões que casam.
                            const idsToShow = groupMatches ? g.ids : matchedIds;
                            return { ...g, ids: idsToShow };
                          })
                          .filter((g) => g.ids.length > 0);
                        return filtered.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {isPt ? "Nenhuma região encontrada." : "No region found."}
                          </p>
                        ) : (
                          filtered.map((g) => (
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
                          ))
                        );
                      })()}
                    </div>
                  </DemoShield>
                  {painRegions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{painRegions.length} {isPt ? "selecionadas" : "selected"}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {isPt
                      ? "Na próxima etapa você define a intensidade e o tipo de dor para cada região marcada aqui."
                      : "In the next step you set intensity and pain type for each region marked here."}
                  </p>
                </div>
              </>}
              </div>
            )}

            {/* STEP 3: INTENSIDADE & TIPO DE DOR — relacionados às regiões
                marcadas no mapa. Com 0 ou 1 região, usa a versão global; com
                2+ regiões, exige nota e tipo por região (mais sensível à
                evolução clínica). */}
            {step === 3 && (
              <div className="space-y-4">
                {painRegions.length === 0 && (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    {isPt
                      ? "Nenhuma região marcada no mapa. Você ainda pode registrar uma intensidade e tipo de dor global, ou voltar para marcar regiões específicas."
                      : "No region marked on the map. You can still record a global intensity and pain type, or go back to mark specific regions."}
                  </div>
                )}

                {/* Caminho "global" — só com 0 ou 1 região marcada */}
                {painRegions.length <= 1 && (
                  <>
                    <div>
                      <Label className="text-xs">{isPt ? "Intensidade da dor (0-10)" : "Pain intensity (0-10)"}: <span className="font-bold text-primary">{painScore}</span></Label>
                      <DemoShield on={demoMode} onAutofill={() => autofill(painScore, MOCK_MANUAL_CASE.painScore, setPainScore, 5)}>
                        <div className="flex items-center gap-2 mt-2">
                          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" disabled={demoMode || painScore <= 0} onClick={() => setPainScore(Math.max(0, painScore - 1))} aria-label="−1">−</Button>
                          <Slider value={[painScore]} onValueChange={(v) => setPainScore(v[0])} min={0} max={10} step={1} className="flex-1" />
                          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" disabled={demoMode || painScore >= 10} onClick={() => setPainScore(Math.min(10, painScore + 1))} aria-label="+1">+</Button>
                        </div>
                      </DemoShield>
                    </div>
                    <div>
                      <Label className="text-xs">
                        {isPt ? "Tipo de dor (pode marcar mais de um)" : "Pain type (multi-select)"}
                      </Label>
                      {ENABLE_PAIN_MECHANISM && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {isPt
                            ? "O que você marcar aqui já entra como descritor na triagem de mecanismo abaixo (e vice-versa)."
                            : "Selections here are mirrored as descriptors in the mechanism screening below."}
                        </p>
                      )}
                      <DemoShield on={demoMode} onAutofill={() => autofill(painType, MOCK_MANUAL_CASE.painType, setPainType, "")}>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {(
                            [
                              ["local", "Local", "Local"],
                              ["radiating", "Irradiada", "Radiating"],
                              ["burning", "Queimação", "Burning"],
                              ["tingling", "Formigamento", "Tingling"],
                              ["throbbing", "Latejante", "Throbbing"],
                              ["stabbing", "Pontada", "Stabbing"],
                            ] as [string, string, string][]
                          ).map(([v, pt, en]) => {
                            const active = effectivePainTypes.includes(v);
                            return (
                              <Button
                                key={v}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className="h-8 px-2.5 text-xs"
                                disabled={demoMode}
                                onClick={() => togglePainType(v)}
                              >
                                {isPt ? pt : en}
                              </Button>
                            );
                          })}
                        </div>
                      </DemoShield>
                    </div>

                  </>
                )}

                {/* Caminho "por região" — 2+ regiões; ignora intensidade/tipo global */}
                {painRegions.length > 1 && (
                  <div className="rounded-md border border-amber-300/60 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                    {isPt
                      ? "Mais de uma região marcada — a intensidade e o tipo de dor são definidos individualmente abaixo. A IA usará apenas essas informações específicas, ignorando notas globais."
                      : "Multiple regions marked — pain intensity and type are set individually below. The AI will use only this granular data and ignore global scores."}
                  </div>
                )}

                {/* Per-region pain sliders — appear only after the user marks regions */}
                {painRegions.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      {painRegions.length > 1
                        ? (isPt ? "Nota de dor por região (0-10)" : "Pain score per region (0-10)")
                        : (isPt ? "Confirme a nota da região marcada (0-10)" : "Confirm the marked region score (0-10)")}
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
                          <div key={id} className="flex items-center gap-2">
                            <span className="text-xs text-foreground w-28 sm:w-32 shrink-0 truncate">
                              {lbl ? (isPt ? lbl.label_pt : lbl.label_en) : id}
                            </span>
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled={demoMode || v <= 0} onClick={() => setRegionPainScore(id, Math.max(0, v - 1))} aria-label="−1">−</Button>
                            <Slider
                              value={[v]}
                              onValueChange={(arr) => setRegionPainScore(id, arr[0])}
                              min={0}
                              max={10}
                              step={1}
                              className="flex-1 min-w-0"
                              disabled={demoMode}
                            />
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled={demoMode || v >= 10} onClick={() => setRegionPainScore(id, Math.min(10, v + 1))} aria-label="+1">+</Button>
                            <span className="text-xs font-bold text-primary tabular-nums w-8 text-right">{v}/10</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Per-region pain TYPE — appears only with 2+ marked regions */}
                {painRegions.length > 1 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      {isPt ? "Tipo de dor por região" : "Pain type per region"}
                    </Label>
                    <p className="text-[11px] text-muted-foreground -mt-1">
                      {isPt
                        ? "Caracterize a dor de cada região marcada. Útil para diferenciar dor mecânica de irradiação neural, queimação etc."
                        : "Characterize pain at each marked region. Helps differentiate mechanical pain from neural radiation, burning, etc."}
                    </p>
                    <div className="space-y-2 pt-1">
                      {painRegions.map((id) => {
                        const lbl = regionLabelMap[id];
                        const v = painTypesPerRegion[id] || "";
                        return (
                          <div key={id} className="flex items-center gap-3">
                            <span className="text-xs text-foreground w-32 shrink-0 truncate">
                              {lbl ? (isPt ? lbl.label_pt : lbl.label_en) : id}
                            </span>
                            <Select value={v} onValueChange={(val) => setRegionPainType(id, val)} disabled={demoMode}>
                              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="local">{isPt ? "Local" : "Local"}</SelectItem>
                                <SelectItem value="radiating">{isPt ? "Irradiada" : "Radiating"}</SelectItem>
                                <SelectItem value="burning">{isPt ? "Queimação" : "Burning"}</SelectItem>
                                <SelectItem value="tingling">{isPt ? "Formigamento" : "Tingling"}</SelectItem>
                                <SelectItem value="throbbing">{isPt ? "Latejante" : "Throbbing"}</SelectItem>
                                <SelectItem value="stabbing">{isPt ? "Pontada" : "Stabbing"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Passo B1 — triagem de mecanismo de dor (atrás de flag) */}
                {ENABLE_PAIN_MECHANISM && (
                  <PainMechanismWizard
                    value={mechanismAnswers}
                    onChange={setMechanismAnswers}
                    variant="pro"
                    language={isPt ? "pt" : "en"}
                    regionCount={painRegions.length}
                    durationWeeks={durationWeeks}
                    suggestedDistribution={suggestedDistribution}
                    previous={previousMechanismRef}
                    disabled={demoMode}
                  />
                )}
              </div>

            )}


            {/* STEP 4: OBSERVAÇÕES CLÍNICAS ADICIONAIS — texto livre que
                alimenta a IA. Etapa própria para dar espaço amplo de escrita. */}
            {step === 4 && (
              <div className="space-y-3">
                <Label className="text-xs">{isPt ? "Observações clínicas adicionais (opcional)" : "Additional clinical observations (optional)"}</Label>
                <Textarea
                  value={additionalClinicalNotes}
                  onChange={(e) => setAdditionalClinicalNotes(e.target.value)}
                  rows={14}
                  placeholder={isPt
                    ? "Registre achados relevantes que não se encaixam nos campos acima: fatores ambientais (barreiras no trabalho/casa, mobiliário, transporte), suporte familiar, fatores pessoais/comportamentais, suspeita clínica específica, compensações observadas, sinais comportamentais, fatores de adesão, hipóteses iniciais, raciocínio narrativo, etc."
                    : "Record relevant findings that don't fit the fields above: family context, specific clinical suspicion, observed compensations, behavioral signs, adherence factors, initial hypotheses, narrative reasoning, etc."}
                  className="text-sm min-h-[240px]"
                  disabled={demoMode}
                />
                <p className="text-[11px] text-muted-foreground">
                  {isPt
                    ? "Estas observações são utilizadas pela IA ao gerar a impressão clínica, o diagnóstico e a sugestão de testes funcionais."
                    : "These observations are used by the AI when generating the clinical impression, diagnosis and functional test suggestions."}
                </p>
              </div>
            )}


            {/* STEP 5: QUESTIONÁRIOS — mesmo fluxo da avaliação premium/link */}
            {step === 5 && (
              <div className="space-y-3">
                {preventive ? null : painRegions.length === 0 ? (
                  <div className="p-4 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    {isPt
                      ? "Selecione ao menos uma região com dor no mapa de dor para que os questionários aplicáveis sejam carregados automaticamente."
                      : "Select at least one pain region in the pain map step to load the applicable questionnaires."}
                  </div>
                ) : (
                  <>
                    {/* Toggle: aplicar agora ou enviar link para o paciente preencher depois */}
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
                      <Switch
                        checked={deferQuestionnaires}
                        onCheckedChange={setDeferQuestionnaires}
                        disabled={demoMode}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {isPt
                            ? "Enviar questionários para o paciente preencher depois"
                            : "Send questionnaires for the patient to complete later"}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {isPt
                            ? "Útil quando há várias regiões marcadas e a aplicação em consulta ficaria longa. Ao salvar, geramos um link único que reúne TODOS os questionários aplicáveis (e os de especialidade já agendados). As respostas voltam vinculadas a esta mesma avaliação — não cria uma reavaliação nova."
                            : "Useful when many regions are marked and applying everything in-session would take too long. On save we generate a single link that bundles ALL applicable questionnaires (plus any specialty ones already scheduled). Answers come back attached to THIS assessment — no new reassessment is created."}
                        </p>
                        {painRegions.length >= 3 && (
                          <p className="text-[11px] text-primary font-medium">
                            {isPt
                              ? "Sugerido automaticamente: você marcou 3+ regiões."
                              : "Auto-suggested: you marked 3+ regions."}
                          </p>
                        )}
                      </div>
                    </div>

                    {deferQuestionnaires ? (
                      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <ClipboardList className="h-3.5 w-3.5 text-primary" />
                          {isPt ? "Serão enviados ao paciente:" : "Will be sent to the patient:"}
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 pl-1">
                          {getApplicableQuestionnaires(painRegions).map((q) => (
                            <li key={q.id} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-primary/60" />
                              <span>{isPt ? q.fullName_pt : q.fullName_en}</span>
                            </li>
                          ))}
                          {getApplicableQuestionnaires(painRegions).length === 0 && (
                            <li className="italic">
                              {isPt
                                ? "Nenhum questionário geral aplicável às regiões marcadas."
                                : "No general questionnaire applies to the marked regions."}
                            </li>
                          )}
                        </ul>
                        <p className="text-[11px] text-muted-foreground">
                          {isPt
                            ? "O link aparecerá assim que você concluir a avaliação. Você também encontra esse link sempre que reabrir a avaliação para edição."
                            : "The link appears as soon as you finish the assessment. You can also find it whenever you reopen the assessment for editing."}
                        </p>
                      </div>
                    ) : questionnaireResults.length > 0 ? (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          <ClipboardList className="h-3.5 w-3.5" />
                          {isPt
                            ? `Questionários já respondidos${pendingCount && pendingCount.pending === 0 && pendingCount.total > 0 ? " (via link enviado ao paciente)" : ""}`
                            : `Questionnaires already answered${pendingCount && pendingCount.pending === 0 && pendingCount.total > 0 ? " (via patient link)" : ""}`}
                        </div>
                        <ul className="text-xs text-foreground/80 space-y-1 pl-1">
                          {questionnaireResults.map((r: QuestionnaireResult) => {
                            const displayScore = typeof r.percentageScore === "number"
                              ? `${r.percentageScore}%`
                              : (typeof r.totalScore === "number" ? `${r.totalScore}/${r.maxScore || "—"}` : "—");
                            const interpretation = isPt ? r.interpretation_pt : r.interpretation_en;
                            return (
                              <li key={r.questionnaireId} className="flex items-center justify-between gap-2 border-b border-emerald-200/40 last:border-0 py-1">
                                <span className="truncate">{r.questionnaireName}</span>
                                <span className="font-mono text-[11px] text-emerald-900 dark:text-emerald-200 shrink-0">
                                  {displayScore}{interpretation ? ` · ${interpretation}` : ""}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex gap-1 rounded-md bg-background/60 p-0.5 w-fit">
                          <Button type="button" size="sm" variant={showQDetails ? "ghost" : "secondary"} className="h-7 px-3 text-xs" onClick={() => setShowQDetails(false)}>
                            {isPt ? "Ver resumo" : "Summary"}
                          </Button>
                          <Button type="button" size="sm" variant={showQDetails ? "secondary" : "ghost"} className="h-7 px-3 text-xs" onClick={() => setShowQDetails(true)}>
                            {isPt ? "Ver detalhes" : "Details"}
                          </Button>
                        </div>
                        {showQDetails && (
                          <div className="space-y-4 rounded-md border bg-background p-3">
                            {questionnaireResults.map((r: QuestionnaireResult) => (
                              <div key={r.questionnaireId} className="space-y-2">
                                <p className="text-sm font-bold text-primary">{r.questionnaireName}</p>
                                <QuestionnaireAnswersView result={r} isPt={isPt} />
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {isPt
                            ? "As respostas estão salvas nesta avaliação e serão consideradas pela IA. Não é necessário reaplicar."
                            : "Answers are saved to this assessment and will be used by the AI. No need to reapply."}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          type="button"
                          onClick={() => setConfirmReapplyOpen(true)}
                        >
                          {isPt ? "Reaplicar manualmente" : "Reapply manually"}
                        </Button>
                        <AlertDialog open={confirmReapplyOpen} onOpenChange={setConfirmReapplyOpen}>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isPt ? "Apagar as respostas anteriores?" : "Erase previous answers?"}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isPt
                                  ? "Ao reaplicar, as respostas já registradas (inclusive as enviadas pelo paciente via link) serão apagadas desta avaliação e substituídas pelas novas ao salvar. Essa ação não pode ser desfeita."
                                  : "Reapplying erases the recorded answers (including those sent by the patient) and replaces them on save. This cannot be undone."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{isPt ? "Manter respostas" : "Keep answers"}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => { setShowQDetails(false); setQuestionnaireResults([]); }}
                              >
                                {isPt ? "Apagar e reaplicar" : "Erase and reapply"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <QuestionnaireStep
                        painRegions={painRegions}
                        previousAnswers={undefined}
                        demoMode={demoMode}
                        autofillAnswers={demoMode ? MOCK_MANUAL_CASE.questionnaireAnswers : undefined}
                        onComplete={(results) => {
                          setQuestionnaireResults(results);
                          setStep(nextManualStep);
                        }}
                        onBack={() => setStep(previousManualStep)}
                        onSkip={() => setStep(nextManualStep)}
                      />
                    )}
                  </>
                )}
                {false && questionnaireResults.length > 0 && (
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

            {/* STEP 6: MOBILIDADE ARTICULAR (ADM) */}
            {step === 6 && (
              <div className="space-y-4">
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
                {(() => {
                  const sr = spineRegionsFrom([...(painRegions || []), ...((purpose as any).historyRegions || [])]);
                  return (sr.cervical || sr.thoracolumbar || spineBiomechanics.region) ? (
                    <SpineBiomechanicsSection
                      value={spineBiomechanics}
                      onChange={setSpineBiomechanics}
                      cervical={sr.cervical}
                      thoracolumbar={sr.thoracolumbar}
                    />
                  ) : null;
                })()}
                <p className="text-[11px] text-muted-foreground">
                  {isPt
                    ? "Os testes funcionais e observações ficam na próxima etapa."
                    : "Functional tests and observations are on the next step."}
                </p>
              </div>
            )}

            {/* STEP 7: TESTES FUNCIONAIS */}
            {step === 7 && (
              <div className="space-y-4">
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

                  {sacroiliacDetected && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/50">
                          {isPt ? "Cluster de Laslett" : "Laslett cluster"}
                        </Badge>
                        {isPt
                          ? "Dor referida na região sacroilíaca/glútea"
                          : "Pain reported in the sacroiliac/gluteal region"}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {sacroiliacClusterHint(sijLang)}
                      </p>
                    </div>
                  )}

                  {displayedSuggestions.length === 0 && !suggestingTests && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {isPt
                        ? "A IA analisa anamnese, regiões de dor, red flags e questionários para sugerir 2-6 testes ortopédicos, de mobilidade, flexibilidade ou controle motor adicionais. Clique em uma sugestão para adicioná-la ao bloco acima."
                        : "AI analyzes anamnesis, pain regions, red flags and questionnaires to suggest 2-6 additional orthopedic, mobility, flexibility or motor control tests. Click a suggestion to add it above."}
                    </p>
                  )}

                  {displayedSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      {displayedSuggestions.map((s, i) => {
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
                                  {(s as TestSuggestion).cluster && (
                                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/50 text-amber-700 dark:text-amber-400">
                                      {isPt ? "Laslett" : "Laslett"}
                                    </Badge>
                                  )}
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

            {/* STEP 8: DINAMOMETRIA (opcional — pode ser pulada e preenchida depois no prontuário) */}
            {step === 8 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>
                    {isPt
                      ? "Etapa opcional. Registre dinamometria (força muscular em kgf) manualmente ou importe de imagem/PDF. Se não houver dados de força, pule esta etapa — a IA seguirá o raciocínio sem essa peça e você pode anexar depois no prontuário do paciente."
                      : "Optional step. Record dynamometry (muscle strength in kgf) manually or import from image/PDF. If you have no strength data, skip this step — the AI will reason without it and you can attach later in the patient record."}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStrengthTable(createInitialStrengthRows(1));
                      setStep(nextManualStep);
                    }}
                    className="shrink-0"
                  >
                    {isPt ? "Pular esta etapa" : "Skip this step"}
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
                <StrengthTable
                  value={strengthTable}
                  onChange={setStrengthTable}
                  lang={isPt ? "pt" : language === "es" ? "es" : "en"}
                  disableImport={demoMode}
                />
              </div>
            )}


            {/* STEP 9: DIAGNÓSTICO */}
            {step === 9 && (
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
                {/* Refinar antes de fechar — diferenciais só com confiança baixa/moderada. */}
                {!demoMode && !preventive && shouldOfferDifferential({ diagnosis: aiDiagnosis }) && (
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">
                      {isPt ? "Refinar antes de fechar" : "Refine before closing"}
                    </p>
                    <DifferentialDiagnosisPanel
                      diagnosis={aiDiagnosis}
                      context={{
                        anamnesisData: {
                          ...buildAnamnesisData(),
                          painRegions,
                          painScore,
                          painTypes: effectivePainTypes,
                          redFlags: redFlagsChecked,
                        },
                        painRegions,
                        painScore,
                        questionnaireResults,
                        redFlags: redFlagsChecked,
                        painMechanism: (aiDiagnosis as any)?.pain_mechanism || buildProMechanism(),
                        painExtent: preventive ? null : computePainExtent(painRegions).surfacePercent || null,
                      }}
                      isDemo={demoMode}
                      onAppendDiscriminators={(text) =>
                        setAdditionalClinicalNotes((prev) => (prev ? `${prev}\n\n${text}` : text))
                      }
                    />

                  </div>
                )}
                {(externalSource || additionalExternalInfo) && (
                  <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {isPt ? "Informações externas adicionais" : "Additional external info"}
                    </Label>
                    <Textarea
                      value={additionalExternalInfo}
                      onChange={(e) => setAdditionalExternalInfo(e.target.value)}
                      rows={4}
                      placeholder={isPt
                        ? "Tudo o que a IA encontrou no arquivo externo e não coube nos nossos campos pré-definidos. Edite à vontade."
                        : "Anything the AI found in the external file that doesn't fit our predefined fields. Edit freely."}
                      className="text-sm bg-background"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Treatment plan generation removed — it is sold separately to autonomous
                pros on the patient page and is included for clinic mode in the same
                location. Generating it from the manual flow caused raw-JSON output and
                duplicated a paid/included feature. */}
          </div>
        </div>

        <DialogFooter className="relative flex-row justify-between sm:justify-between border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 bg-background">
          <Button variant="outline" size="sm" onClick={() => setStep(previousManualStep)} disabled={step === 0}>
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
              <Button size="sm" onClick={() => setStep(nextManualStep)}>
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

    <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPt ? "Sair da avaliação?" : "Leave assessment?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPt
              ? "Seus dados ficam salvos como rascunho. Você pode retomar de onde parou ao reabrir esta avaliação."
              : "Your data stays saved as a draft. You can resume from where you left off when reopening this assessment."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {isPt ? "Continuar editando" : "Keep editing"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmExit}>
            {isPt ? "Sair" : "Leave"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Diálogo pós-save: link de questionários pendentes pronto para envio */}
    <AlertDialog
      open={pendingShareOpen}
      onOpenChange={(o) => {
        setPendingShareOpen(o);
        if (!o) {
          onOpenChange(false);
          resetForm();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            {isPt ? "Link de questionários pendentes pronto" : "Pending questionnaires link ready"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPt
              ? "Compartilhe este link com o paciente. As respostas voltam vinculadas à mesma avaliação — você pode reabrir a avaliação a qualquer momento para ver o progresso."
              : "Share this link with the patient. Answers come back attached to the same assessment — you can reopen it any time to see progress."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {pendingShareUrl && (
          <div className="space-y-2">
            <code className="text-xs bg-muted border rounded px-2 py-2 block break-all">{pendingShareUrl}</code>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => { navigator.clipboard.writeText(pendingShareUrl); toast({ title: isPt ? "Link copiado" : "Link copied" }); }}
              >
                <Copy className="h-3.5 w-3.5" /> {isPt ? "Copiar" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent((isPt ? "Olá! Por favor, responda os questionários da sua avaliação: " : "Hi! Please answer your assessment questionnaires: ") + pendingShareUrl)}`, "_blank")}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
              {pendingSavedAssessmentId && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={generatingSummaryPdf}
                  onClick={() => handleDownloadSummaryPdf(pendingSavedAssessmentId)}
                >
                  {generatingSummaryPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  {isPt ? "Baixar PDF resumo" : "Download summary PDF"}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isPt
                ? "Opcional: anexe o PDF junto com o link, ou envie apenas o link — fica a seu critério."
                : "Optional: attach the PDF along with the link, or send just the link — your choice."}
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setPendingShareOpen(false)}>
            {isPt ? "Concluir" : "Done"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>

  );
};

const ManualAssessmentModal = (props: ManualAssessmentModalProps & { continuationOfLink?: boolean }) => {
  const gated = props.open && !props.demoMode && !props.clinicId && !props.editAssessment;
  const pending = useRegistrationPending(gated);
  if (gated && pending === null) return null;
  if (gated && pending) {
    return <RegistrationRequiredDialog open onOpenChange={props.onOpenChange} feature="Criar avaliação" />;
  }
  return <ManualAssessmentModalInner {...props} />;
};

export default ManualAssessmentModal;

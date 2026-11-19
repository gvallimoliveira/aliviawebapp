import { useState, useRef, useCallback, useEffect } from "react";
import { WORK_DEMAND_IDS, workDemandLabel } from "@/lib/participationContext";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import PainMap from "./PainMap";
import AssessmentPurposeFields, { purposeCopy } from "./AssessmentPurposeFields";
import { isPreventiveAssessment, normalizeAssessmentPurpose, type PurposeData } from "@/lib/assessmentPurpose";
import { formatCpf } from "@/utils/masks";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import DraftResumeBanner from "@/components/common/DraftResumeBanner";
import { ENABLE_PAIN_MECHANISM } from "@/lib/featureFlags";
import PainMechanismWizard from "./PainMechanismWizard";
import { suggestDistribution } from "@/lib/painExtent";
import { HEALTH_CONDITION_IDS, healthConditionLabel, OTHER_ONSET_OPTIONS, OTHER_CONTROL_OPTIONS, otherOnsetLabel, otherControlLabel } from "@/lib/healthHistory";
import PainMechanismLite, {
  createEmptyLiteAnswers,
  type LiteMechanismAnswers,
} from "./PainMechanismLite";


export interface AnamnesisData extends PurposeData {
  chiefComplaint: string; // deprecated, kept for backward compat
  chiefComplaints: string[];
  customComplaint: string;
  onset: string;
  painRegions: string[];
  painTypes: string[];
  evolution: string;
  aggravatingFactors: string;
  relievingFactors: string;
  activityLevel: string;
  painScore: number;
  hasGymAccess: string;
  painDuration: string;
  sex: string;
  ageRange: string;
  hasPriorSurgery: string;
  surgeryDetails: string;
  painSubArea: string[];
  hadTwist: string;
  hadSprain: string;
  hadDislocation: string;
  ottawaPositive: string;
  hasLocalSwelling: string;
  hasScapulaPain: string;
  // Migraine screening (cervical + headache)
  hasPhotophobia?: string;
  hasVisualAura?: string;
  hasNausea?: string;
  headacheCrisisFrequency?: string;
  // Pain frequency (SINSS - Mulligan)
  painPattern?: string;
  painWeeklyFrequency?: string;
  painNightWaking?: string;
  // Per-region pain scores
  painScoreMode?: "general" | "per_region";
  painScoresPerRegion?: Record<string, number>;
  // Patient identification (pre-assessment)
  cpf?: string;
  birthDate?: string;
  /** Antecedentes de saúde essenciais (hipertensão/diabetes/cardiopatia). */
  healthConditions?: string[];
  healthConditionsOther?: string;
  healthConditionsOtherOnset?: string;
  healthConditionsOtherControl?: string;
  usesContinuousMedication?: string;
  continuousMedications?: string;
  /** CIF participação/ambiente (opcionais). */
  workDemand?: string;
  participationGoal?: string;
  /** Passos B2/B3 — triagem leiga de mecanismo de dor. */
  painMechanism?: LiteMechanismAnswers;
}


interface AnamnesisFormProps {
  mode: "basic" | "premium" | "professional";
  onComplete: (data: AnamnesisData) => void;
  onBack: () => void;
  initialPainRegions?: string[];
  initialChiefComplaints?: string[];
  initialOnset?: string;
  initialHasPriorSurgery?: string;
  initialSurgeryDetails?: string;
  initialActivityLevel?: string;
  initialHasGymAccess?: string;
  /**
   * Optional bundle of additional fields to pre-fill on reassessment links.
   * Used for stable demographics and clinical history (sex, age, birthDate,
   * cpf, traumas, headache crisis pattern, refined pain sub-area, etc.).
   * Each key is merged only if truthy/non-empty so the form falls back to
   * the user's input when nothing was stored before.
   */
  initialExtras?: Partial<AnamnesisData> & Record<string, any>;
  /** Optional stable key (e.g. token, professionalId+email) to persist draft across reloads. */
  draftScopeKey?: string | null;
  /**
   * Quando o paciente já confirmou a retomada na tela anterior, restauramos o
   * rascunho automaticamente (sem pedir uma segunda confirmação com banner).
   */
  autoRestoreDraft?: boolean;
  /**
   * Optional sub-step filter for reassessment links. When provided, only the listed
   * groups are shown to the patient. Possible values: "complaint", "painmap",
   * "surgery", "painscore", "activity". If undefined, every step is shown (default).
   */
  enabledSubs?: string[];
  /**
   * Optional previous EVA score (general). Displayed as a non-anchoring reference chip
   * on the painscore step during reassessment. Slider still starts neutral.
   */
  previousPainScore?: number;
}

const AnamnesisForm = ({ mode, onComplete, onBack, initialPainRegions, initialChiefComplaints, initialOnset, initialHasPriorSurgery, initialSurgeryDetails, initialActivityLevel, initialHasGymAccess, initialExtras, draftScopeKey, autoRestoreDraft, enabledSubs, previousPainScore }: AnamnesisFormProps) => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(0);
  // Etapa interna do wizard de mecanismo de dor (0..2). Enquanto < 2, o botão
  // externo "Próximo" fica discreto para não competir com o "Avançar" interno.
  const [mechanismStage, setMechanismStage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragRegion, setActiveDragRegion] = useState<string | null>(null);
  const vasBarRef = useRef<HTMLDivElement>(null);
  const vasBarRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [data, setData] = useState<AnamnesisData>({
    chiefComplaint: "",
    chiefComplaints: [],
    customComplaint: "",
    onset: "",
    painRegions: [],
    painTypes: [],
    evolution: "",
    aggravatingFactors: "",
    relievingFactors: "",
    activityLevel: "",
    painScore: 5,
    hasGymAccess: "",
    painDuration: "",
    sex: "",
    ageRange: "",
    hasPriorSurgery: "",
    surgeryDetails: "",
    painSubArea: [],
    hadTwist: "",
    hadSprain: "",
    hadDislocation: "",
    ottawaPositive: "",
    hasLocalSwelling: "",
    hasScapulaPain: "",
    hasPhotophobia: "",
    hasVisualAura: "",
    hasNausea: "",
    headacheCrisisFrequency: "",
    painPattern: "",
    painWeeklyFrequency: "",
    painNightWaking: "",
    painScoreMode: "general",
    painScoresPerRegion: {},
    cpf: "",
    birthDate: "",
    healthConditions: [],
    healthConditionsOther: "",
    healthConditionsOtherOnset: "",
    healthConditionsOtherControl: "",
    usesContinuousMedication: "",
    continuousMedications: "",
    painMechanism: createEmptyLiteAnswers(),
  });


  // Track which fields were pre-filled from a previous assessment so we can render
  // a subtle "from previous" badge next to their labels.
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(new Set());
  const isPrefilled = useCallback((k: string) => prefilledKeys.has(k), [prefilledKeys]);

  // Pre-fill all reassessment fields
  useEffect(() => {
    const filledNow = new Set<string>();
    setData((prev) => {
      const updates: Partial<AnamnesisData> = {};
      const mark = (k: string) => filledNow.add(k);
      if (initialPainRegions?.length) { updates.painRegions = initialPainRegions; mark("painRegions"); }
      if (initialChiefComplaints?.length) {
        updates.chiefComplaints = initialChiefComplaints;
        updates.chiefComplaint = initialChiefComplaints[0] || "";
        mark("chiefComplaints");
      }
      if (initialOnset) { updates.onset = initialOnset; mark("onset"); }
      if (initialHasPriorSurgery) { updates.hasPriorSurgery = initialHasPriorSurgery; mark("hasPriorSurgery"); }
      if (initialSurgeryDetails) { updates.surgeryDetails = initialSurgeryDetails; mark("surgeryDetails"); }
      if (initialActivityLevel) { updates.activityLevel = initialActivityLevel; mark("activityLevel"); }
      if (initialHasGymAccess) { updates.hasGymAccess = initialHasGymAccess; mark("hasGymAccess"); }
      // Merge extras (demographics + stable clinical history). Skip empty values.
      if (initialExtras) {
        for (const [k, v] of Object.entries(initialExtras)) {
          if (v === undefined || v === null) continue;
          if (typeof v === "string" && v.trim() === "") continue;
          if (Array.isArray(v) && v.length === 0) continue;
          (updates as any)[k] = v;
          mark(k);
        }
      }
      return { ...prev, ...updates };
    });
    if (filledNow.size > 0) {
      setPrefilledKeys((prev) => {
        const merged = new Set(prev);
        filledNow.forEach((k) => merged.add(k));
        return merged;
      });
    }
  }, [initialPainRegions, initialChiefComplaints, initialOnset, initialHasPriorSurgery, initialSurgeryDetails, initialActivityLevel, initialHasGymAccess, initialExtras]);

  // Subtle "from previous assessment" badge.
  const PrefilledBadge = () => (
    <span className="ml-2 inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20 whitespace-nowrap align-middle">
      {t("assessment.prefilled.badge")}
    </span>
  );

  const stepHasPrefill = (id: string): boolean => {
    const keysByStep: Record<string, string[]> = {
      complaint: ["chiefComplaints"],
      onset: ["onset"],
      surgery: ["hasPriorSurgery", "surgeryDetails"],
      health_history: ["healthConditions", "healthConditionsOther", "healthConditionsOtherOnset", "healthConditionsOtherControl", "usesContinuousMedication", "continuousMedications"],

      painmap: ["painRegions"],
      region_detail: ["painSubArea", "hadTwist", "hadSprain", "hadDislocation", "ottawaPositive"],
      migraine_screening: ["hasPhotophobia", "hasVisualAura", "hasNausea", "headacheCrisisFrequency"],
      sex_age: ["sex", "ageRange"],
      paintype: ["painType", "painTypes"],
      evolution: ["evolution"],
      factors: ["aggravatingFactors", "relievingFactors", "activityLevel"],
      duration: ["painDuration"],
      pain_frequency: ["painPattern", "painWeeklyFrequency", "painNightWaking"],
      gym: ["hasGymAccess"],
    };
    return (keysByStep[id] || []).some((k) => prefilledKeys.has(k));
  };

  const complaints = [
    "anamnesis.complaint.neck_pain",
    "anamnesis.complaint.back_pain",
    "anamnesis.complaint.shoulder_pain",
    "anamnesis.complaint.knee_pain",
    "anamnesis.complaint.hip_pain",
    "anamnesis.complaint.ankle_pain",
    "anamnesis.complaint.arm_pain",
    "anamnesis.complaint.wrist_pain",
    "anamnesis.complaint.elbow_pain",
    "anamnesis.complaint.hand_pain",
    "anamnesis.complaint.foot_pain",
    "anamnesis.complaint.headache",
  ];

  const painTypes = [
    "anamnesis.pain_type.local",
    "anamnesis.pain_type.radiating",
    "anamnesis.pain_type.burning",
    "anamnesis.pain_type.tingling",
    "anamnesis.pain_type.throbbing",
    "anamnesis.pain_type.stabbing",
  ];

  const activityLevels = [
    "anamnesis.activity.sedentary",
    "anamnesis.activity.light",
    "anamnesis.activity.regular",
    "anamnesis.activity.athlete",
  ];

  const ageRanges = [
    "anamnesis.age.under_25",
    "anamnesis.age.25_34",
    "anamnesis.age.35_44",
    "anamnesis.age.45_55",
    "anamnesis.age.over_55",
  ];

  const toggleArrayItem = (key: keyof AnamnesisData, item: string) => {
    const arr = data[key] as string[];
    if (arr.includes(item)) {
      setData({ ...data, [key]: arr.filter((i) => i !== item) });
    } else {
      setData({ ...data, [key]: [...arr, item] });
    }
  };

  const getPainScoreColor = (score: number) => {
    if (score <= 3) return "text-primary";
    if (score <= 6) return "text-yellow-600";
    return "text-destructive";
  };

  // Biomechanical groups for complaint validation
  const upperGroup = ["anamnesis.complaint.shoulder_pain", "anamnesis.complaint.arm_pain", "anamnesis.complaint.elbow_pain", "anamnesis.complaint.wrist_pain", "anamnesis.complaint.hand_pain"];
  const lowerGroup = ["anamnesis.complaint.back_pain", "anamnesis.complaint.hip_pain", "anamnesis.complaint.knee_pain", "anamnesis.complaint.ankle_pain", "anamnesis.complaint.foot_pain"];
  // Spinal + head group: cervical, costas, lombar and headache are allowed together (full spine chain + cervicogenic headache)
  const spinalHeadGroup = ["anamnesis.complaint.neck_pain", "anamnesis.complaint.back_pain", "anamnesis.complaint.headache"];
  // Cross-group exception: lombar + ombro (fascial/muscular chains in rotation sports)
  const lumbarShoulderPair = ["anamnesis.complaint.back_pain", "anamnesis.complaint.shoulder_pain"];

  const getComplaintGroup = (c: string): "upper" | "lower" | "spinal_head" | null => {
    if (spinalHeadGroup.includes(c)) return "spinal_head";
    if (upperGroup.includes(c)) return "upper";
    if (lowerGroup.includes(c)) return "lower";
    return null;
  };

  const canAddComplaint = (complaint: string, current: string[]): boolean => {
    const combined = [...current, complaint];
    const groupedItems = combined.filter(item => getComplaintGroup(item) !== null);
    if (groupedItems.length <= 1) return true;

    // All spinal_head group items can combine freely
    const isOnlySpinalHead = groupedItems.every(item => spinalHeadGroup.includes(item));
    if (isOnlySpinalHead) return true;

    // Allow lumbar + shoulder pair
    const isOnlyLumbarShoulder = groupedItems.every(item => lumbarShoulderPair.includes(item));
    if (isOnlyLumbarShoulder) return true;

    // All items must be in the same group (upper or lower)
    const groups = new Set(groupedItems.map(item => getComplaintGroup(item)));
    if (groups.size === 1) return true;

    // Allow spinal_head items combined with lower group (back_pain is in both)
    const hasSpinal = groupedItems.some(i => spinalHeadGroup.includes(i));
    const hasLower = groupedItems.some(i => lowerGroup.includes(i) && !spinalHeadGroup.includes(i));
    const hasUpper = groupedItems.some(i => upperGroup.includes(i));
    if (hasSpinal && hasLower && !hasUpper) return true;

    return false;
  };

  const [complaintConflict, setComplaintConflict] = useState(false);

  const toggleComplaint = (complaint: string) => {
    const current = data.chiefComplaints;
    if (current.includes(complaint)) {
      const updated = current.filter(c => c !== complaint);
      setData({ ...data, chiefComplaints: updated, chiefComplaint: updated[0] || "" });
      setComplaintConflict(false);
    } else {
      if (!canAddComplaint(complaint, current)) {
        setComplaintConflict(true);
        return;
      }
      setComplaintConflict(false);
      const updated = [...current, complaint];
      setData({ ...data, chiefComplaints: updated, chiefComplaint: updated[0] || "" });
    }
  };

  const isShoulderRelated = () => {
    const shoulderComplaints = ["anamnesis.complaint.shoulder_pain"];
    const shoulderRegions = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
    return data.chiefComplaints.some(c => shoulderComplaints.includes(c)) || data.painRegions.some(r => shoulderRegions.includes(r));
  };

  // Region detection for sub-questions
  const kneeRegions = ["right_knee", "left_knee", "right_knee_back", "left_knee_back", "knee_side"];
  const ankleRegions = ["right_ankle", "left_ankle", "right_ankle_back", "left_ankle_back", "ankle_side"];
  const hipRegions = ["right_hip", "left_hip", "right_hip_back", "left_hip_back", "hip_side"];
  const shoulderRegionsAll = ["right_shoulder", "left_shoulder", "right_shoulder_back", "left_shoulder_back", "shoulder_side"];
  const cervicalRegions = ["cervical", "cervical_front", "cervical_left", "cervical_right"];
  const elbowRegions = ["right_elbow", "left_elbow", "right_elbow_back", "left_elbow_back", "elbow_left", "elbow_right"];

  const getSelectedSingleRegionType = (): string | null => {
    const regions = data.painRegions;
    if (regions.length === 0) return null;
    // Check if ALL selected regions belong to ONE region type
    const checks: [string[], string][] = [
      [kneeRegions, "knee"],
      [ankleRegions, "ankle"],
      [hipRegions, "hip"],
      [shoulderRegionsAll, "shoulder"],
      [cervicalRegions, "cervical"],
      [elbowRegions, "elbow"],
    ];
    for (const [regionList, type] of checks) {
      if (regions.every(r => regionList.includes(r)) && regions.some(r => regionList.includes(r))) {
        return type;
      }
    }
    // Also check by chief complaints if any complaint matches
    const complaintMap: Record<string, string> = {
      "anamnesis.complaint.knee_pain": "knee",
      "anamnesis.complaint.ankle_pain": "ankle",
      "anamnesis.complaint.hip_pain": "hip",
      "anamnesis.complaint.shoulder_pain": "shoulder",
      "anamnesis.complaint.neck_pain": "cervical",
      "anamnesis.complaint.elbow_pain": "elbow",
    };
    for (const cc of data.chiefComplaints) {
      if (complaintMap[cc] && regions.length <= 2) {
        return complaintMap[cc];
      }
    }
    return null;
  };

  const needsRegionDetail = () => getSelectedSingleRegionType() !== null;

  const getSubAreasForRegion = (region: string): { id: string; label: string; desc: string }[] => {
    switch (region) {
      case "knee": return [
        { id: "front", label: "anamnesis.subarea.front", desc: "anamnesis.knee.front_desc" },
        { id: "lateral", label: "anamnesis.subarea.lateral", desc: "anamnesis.knee.lateral_desc" },
        { id: "medial", label: "anamnesis.subarea.medial", desc: "anamnesis.knee.medial_desc" },
        { id: "posterior", label: "anamnesis.subarea.posterior", desc: "anamnesis.knee.posterior_desc" },
      ];
      case "ankle": return [
        { id: "anterior", label: "anamnesis.subarea.front", desc: "anamnesis.ankle.anterior_desc" },
        { id: "lateral", label: "anamnesis.subarea.lateral", desc: "anamnesis.ankle.lateral_desc" },
        { id: "medial", label: "anamnesis.subarea.medial", desc: "anamnesis.ankle.medial_desc" },
        { id: "posterior", label: "anamnesis.subarea.posterior", desc: "anamnesis.ankle.posterior_desc" },
      ];
      case "hip": return [
        { id: "anterior", label: "anamnesis.subarea.front", desc: "anamnesis.hip.anterior_desc" },
        { id: "lateral", label: "anamnesis.subarea.lateral", desc: "anamnesis.hip.lateral_desc" },
        { id: "posterior", label: "anamnesis.subarea.posterior", desc: "anamnesis.hip.posterior_desc" },
        { id: "medial", label: "anamnesis.subarea.medial", desc: "anamnesis.hip.medial_desc" },
      ];
      case "shoulder": return [
        { id: "anterior", label: "anamnesis.subarea.front", desc: "anamnesis.shoulder.anterior_desc" },
        { id: "lateral", label: "anamnesis.subarea.lateral", desc: "anamnesis.shoulder.lateral_desc" },
        { id: "superior", label: "anamnesis.subarea.superior_shoulder", desc: "anamnesis.shoulder.superior_desc" },
        { id: "posterior", label: "anamnesis.subarea.posterior_shoulder", desc: "anamnesis.shoulder.posterior_desc" },
      ];
      case "elbow": return [
        { id: "medial", label: "anamnesis.subarea.medial", desc: "anamnesis.elbow.medial_desc" },
        { id: "lateral", label: "anamnesis.subarea.lateral", desc: "anamnesis.elbow.lateral_desc" },
        { id: "anterior", label: "anamnesis.subarea.front", desc: "anamnesis.elbow.anterior_desc" },
        { id: "posterior", label: "anamnesis.subarea.posterior", desc: "anamnesis.elbow.posterior_desc" },
      ];
      case "cervical": return [
        { id: "posterior", label: "anamnesis.subarea.posterior", desc: "anamnesis.cervical.posterior_desc" },
        { id: "posterolateral", label: "anamnesis.subarea.posterolateral", desc: "anamnesis.cervical.posterolateral_desc" },
        { id: "anterolateral", label: "anamnesis.subarea.anterolateral", desc: "anamnesis.cervical.anterolateral_desc" },
      ];
      default: return [];
    }
  };

  // Define step IDs for clarity
  type StepId = "purpose" | "preventive_activity" | "complaint" | "onset" | "surgery" | "health_history" | "painmap" | "region_detail" | "migraine_screening" | "sex_age" | "paintype" | "pain_mechanism" | "evolution" | "factors" | "duration" | "pain_frequency" | "gym" | "painscore";

  // Check if migraine screening should show
  const needsMigraineScreening = () => {
    return data.chiefComplaints.includes("anamnesis.complaint.headache") && data.chiefComplaints.includes("anamnesis.complaint.neck_pain");
  };

  const buildStepSequence = (): StepId[] => {
    // Map each StepId to a sub-group for reassessment filtering.
    const groupOf = (id: StepId): "complaint" | "painmap" | "surgery" | "painscore" | "painmechanism" | "activity" | "identity" => {
      switch (id) {
        case "painmap": return "painmap";
        case "pain_mechanism": return "painmechanism";
        case "surgery": return "surgery";
        case "health_history": return "identity"; // dado fundamental: sempre coletado
        case "painscore": return "painscore";
        case "gym": return "activity";
        case "sex_age": return "identity"; // identity is always kept
        default: return "complaint"; // complaint, onset, region_detail, migraine_screening, paintype, evolution, factors, duration, pain_frequency
      }
    };
    const allowGroup = (g: string): boolean => {
      if (!enabledSubs || enabledSubs.length === 0) return true; // default = full
      if (g === "identity") return true; // always keep
      return enabledSubs.includes(g);
    };

    if (isPreventiveAssessment(data)) {
      return ["purpose", "surgery", "health_history", "painmap", "sex_age", "preventive_activity", "gym"];
    }
    const base: StepId[] = ["purpose", "complaint", "onset", "surgery", "health_history", "painmap"];
    if (needsRegionDetail()) {
      base.push("region_detail");
    }
    if (needsMigraineScreening()) {
      base.push("migraine_screening");
    }
    base.push("sex_age");
    base.push("paintype");
    // Passos B2/B3 — triagem leiga de mecanismo de dor logo após o tipo de dor.
    if (ENABLE_PAIN_MECHANISM) base.push("pain_mechanism");
    base.push("evolution", "factors", "duration", "pain_frequency", "gym", "painscore");
    return base.filter((id) => id === "purpose" || allowGroup(groupOf(id)));
  };

  const stepSequence = buildStepSequence();
  const safeStep = Math.min(step, stepSequence.length - 1);
  const pendingRestoreStepRef = useRef<StepId | null>(null);

  // ── Autosave (local + nuvem) ─────────────────────────────────────────────
  const draft = useAutosaveDraft<{ step: number; stepId?: StepId; data: AnamnesisData }>({
    formKey: "anamnesis",
    scopeKey: draftScopeKey ?? null,
    state: { step, stepId: stepSequence[safeStep], data },
    enabled: !!draftScopeKey,
  });
  const handleRestoreDraft = useCallback(() => {
    const p = draft.restore();
    if (!p) return;
    setStep(0);
    pendingRestoreStepRef.current = p.stepId || null;
    if (p.data) setData((prev) => ({ ...prev, ...p.data }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.draftPayload]);

  // Retomada já confirmada pelo paciente → restaura sozinho, sem segundo clique.
  const autoRestoredRef = useRef(false);
  useEffect(() => {
    if (!autoRestoreDraft || autoRestoredRef.current) return;
    if (!draft.hasDraft || !draft.draftPayload) return;
    autoRestoredRef.current = true;
    handleRestoreDraft();
  }, [autoRestoreDraft, draft.hasDraft, draft.draftPayload, handleRestoreDraft]);


  useEffect(() => {
    const id = pendingRestoreStepRef.current;
    if (!id) return;
    pendingRestoreStepRef.current = null;
    const index = stepSequence.indexOf(id);
    setStep(index >= 0 ? index : 0);
  }, [data]);
  useEffect(() => { if (step !== safeStep) setStep(safeStep); }, [step, safeStep]);

  const renderStep = (id: StepId) => {
    switch (id) {
      case "purpose":
        return <AssessmentPurposeFields value={data} onChange={patch => setData(prev => ({ ...prev, ...patch }))} />;
      case "preventive_activity":
        return <div className="space-y-3"><Label>{purposeCopy[language].activity}</Label><div className="grid grid-cols-2 gap-2">{activityLevels.map(a => <Button key={a} type="button" variant={data.activityLevel === a ? "default" : "outline"} onClick={() => setData(prev => ({ ...prev, activityLevel: a }))}>{t(a)}</Button>)}</div></div>;
      case "complaint":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.complaint_title")}{stepHasPrefill("complaint") && <PrefilledBadge />}</h3>
            <p className="text-xs text-muted-foreground">{language === "pt" ? "Selecione uma ou mais regiões relacionadas" : "Select one or more related regions"}</p>
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                {t("anamnesis.kinetic_chain_disclaimer")}
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2">
              {complaints.map((c) => {
                const selected = data.chiefComplaints.includes(c);
                const disabled = !selected && !canAddComplaint(c, data.chiefComplaints);
                return (
                  <Button
                    key={c}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    className={`justify-start text-left h-auto py-2.5 rounded-xl gap-2 ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    onClick={() => !disabled && toggleComplaint(c)}
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary-foreground bg-primary-foreground/20" : "border-muted-foreground/30"}`}>
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    {t(c)}
                  </Button>
                );
              })}
            </div>
            {complaintConflict && (
              <p className="text-xs text-destructive font-medium">{t("anamnesis.complaint_group_conflict")}</p>
            )}
            <div className="space-y-2">
              <Label>{t("anamnesis.other_complaint")}</Label>
              <Input value={data.customComplaint} onChange={(e) => setData({ ...data, customComplaint: e.target.value.slice(0, 200) })} placeholder={t("anamnesis.other_complaint_placeholder")} maxLength={200} />
            </div>
          </div>
        );
      case "onset":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.onset_title")}{stepHasPrefill("onset") && <PrefilledBadge />}</h3>
            <div className="grid gap-3">
              {["anamnesis.onset.sudden", "anamnesis.onset.gradual", "anamnesis.onset.trauma", "anamnesis.onset.post_surgery"].map((o) => (
                <Card key={o} className={`cursor-pointer transition-all ${data.onset === o ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, onset: o })}>
                  <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(o)}</span></CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "surgery":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.surgery_title")}{stepHasPrefill("surgery") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.surgery_subtitle")}</p>
            <p className="text-xs text-muted-foreground/80 italic">{t("anamnesis.surgery_disclaimer")}</p>
            <div className="grid grid-cols-2 gap-3">
              {["anamnesis.surgery.yes", "anamnesis.surgery.no"].map((option) => (
                <Card key={option} className={`cursor-pointer transition-all ${data.hasPriorSurgery === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, hasPriorSurgery: option, ...(option.includes("no") ? { surgeryDetails: "" } : {}) })}>
                  <CardContent className="py-4 px-4 text-center">
                    <span className="text-2xl block mb-1">{option.includes("yes") ? "✅" : "❌"}</span>
                    <span className="text-sm font-medium">{t(option)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
            {data.hasPriorSurgery === "anamnesis.surgery.yes" && (
              <div className="space-y-2 mt-3">
                <Label>{t("anamnesis.surgery_details")}</Label>
                <Textarea
                  value={data.surgeryDetails}
                  onChange={(e) => setData({ ...data, surgeryDetails: e.target.value.slice(0, 500) })}
                  placeholder={t("anamnesis.surgery_details_placeholder")}
                  rows={3}
                  maxLength={500}
                />
              </div>
            )}
          </div>
        );
      case "health_history": {
        const conditions = data.healthConditions || [];
        const toggleCondition = (id: string) => {
          let next: string[];
          if (id === "none") {
            next = conditions.includes("none") ? [] : ["none"];
          } else {
            next = conditions.includes(id)
              ? conditions.filter((c) => c !== id)
              : [...conditions.filter((c) => c !== "none"), id];
          }
          setData({
            ...data,
            healthConditions: next,
            ...(next.includes("other")
              ? {}
              : { healthConditionsOther: "", healthConditionsOtherOnset: "", healthConditionsOtherControl: "" }),
          });
        };
        const isEs = language === "es";
        const isEn = language === "en";
        const txt = (pt: string, en: string, es: string) => (isEn ? en : isEs ? es : pt);
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">
              {txt("Saúde geral", "General health", "Salud general")}
              {stepHasPrefill("health_history") && <PrefilledBadge />}
            </h3>
            <p className="text-sm text-muted-foreground">
              {txt(
                "Essas informações ajudam a dosar exercícios com segurança.",
                "This information helps us dose exercise safely.",
                "Esta información ayuda a dosificar el ejercicio con seguridad.",
              )}
            </p>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {txt(
                  "Você tem alguma dessas condições?",
                  "Do you have any of these conditions?",
                  "¿Tiene alguna de estas condiciones?",
                )}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {HEALTH_CONDITION_IDS.map((id) => {
                  const selected = conditions.includes(id);
                  return (
                    <Button
                      key={id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className="justify-start text-left h-auto py-2.5 rounded-xl gap-2"
                      onClick={() => toggleCondition(id)}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary-foreground bg-primary-foreground/20" : "border-muted-foreground/30"}`}>
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm">{healthConditionLabel(id, language)}</span>
                    </Button>
                  );
                })}
              </div>
              {conditions.includes("other") && (
                <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {txt("Qual condição?", "Which condition?", "¿Cuál condición?")}
                    </Label>
                    <Input
                      value={data.healthConditionsOther || ""}
                      onChange={(e) => setData({ ...data, healthConditionsOther: e.target.value.slice(0, 200) })}
                      placeholder={txt(
                        "Ex.: asma, hipotireoidismo, artrite reumatoide",
                        "e.g. asthma, hypothyroidism, rheumatoid arthritis",
                        "Ej.: asma, hipotiroidismo, artritis reumatoide",
                      )}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {txt("Desde quando?", "Since when?", "¿Desde cuándo?")}
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OTHER_ONSET_OPTIONS.map((o) => (
                        <Button
                          key={o.id}
                          type="button"
                          size="sm"
                          variant={data.healthConditionsOtherOnset === o.id ? "default" : "outline"}
                          className="justify-start rounded-lg text-sm h-auto py-2"
                          onClick={() => setData({ ...data, healthConditionsOtherOnset: o.id })}
                        >
                          {otherOnsetLabel(o.id, language)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {txt(
                        "Como está o controle hoje?",
                        "How is it controlled today?",
                        "¿Cómo está el control hoy?",
                      )}
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OTHER_CONTROL_OPTIONS.map((o) => (
                        <Button
                          key={o.id}
                          type="button"
                          size="sm"
                          variant={data.healthConditionsOtherControl === o.id ? "default" : "outline"}
                          className="justify-start rounded-lg text-sm h-auto py-2 text-left"
                          onClick={() => setData({ ...data, healthConditionsOtherControl: o.id })}
                        >
                          {otherControlLabel(o.id, language)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {txt(
                  "Faz uso de remédios de uso contínuo?",
                  "Do you take any continuous-use medication?",
                  "¿Usa medicamentos de uso continuo?",
                )}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "yes", label: txt("Sim", "Yes", "Sí"), emoji: "💊" },
                  { v: "no", label: txt("Não", "No", "No"), emoji: "🚫" },
                ].map((opt) => (
                  <Card
                    key={opt.v}
                    className={`cursor-pointer transition-all ${data.usesContinuousMedication === opt.v ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
                    onClick={() =>
                      setData({
                        ...data,
                        usesContinuousMedication: opt.v,
                        ...(opt.v === "no" ? { continuousMedications: "" } : {}),
                      })
                    }
                  >
                    <CardContent className="py-4 px-4 text-center">
                      <span className="text-2xl block mb-1">{opt.emoji}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {data.usesContinuousMedication === "yes" && (
                <Textarea
                  value={data.continuousMedications || ""}
                  onChange={(e) => setData({ ...data, continuousMedications: e.target.value.slice(0, 500) })}
                  placeholder={txt(
                    "Quais? Ex.: Losartana 50mg, Metformina 850mg",
                    "Which ones? e.g. Losartan 50mg, Metformin 850mg",
                    "¿Cuáles? Ej.: Losartán 50mg, Metformina 850mg",
                  )}
                  rows={3}
                  maxLength={500}
                />
              )}
            </div>
          </div>
        );
      }
      case "painmap":
        return <PainMap purpose={isPreventiveAssessment(data) ? "history" : "pain"} selectedRegions={isPreventiveAssessment(data) ? data.historyRegions || [] : data.painRegions} onRegionsChange={(regions) => setData({ ...data, ...(isPreventiveAssessment(data) ? { historyRegions: regions } : { painRegions: regions }) })} />;
      case "region_detail": {
        const regionType = getSelectedSingleRegionType();
        if (!regionType) return null;
        const subAreas = getSubAreasForRegion(regionType);
        const needsTraumaQuestion = regionType === "knee" || regionType === "ankle" || regionType === "shoulder";
        const needsEdemaQuestion = regionType === "knee" || regionType === "ankle" || regionType === "wrist";
        const traumaKey = regionType === "knee" ? "hadTwist" : regionType === "ankle" ? "hadSprain" : "hadDislocation";
        const traumaQuestion = regionType === "knee" ? "anamnesis.knee_twist" : regionType === "ankle" ? "anamnesis.ankle_sprain" : "anamnesis.shoulder_dislocation";
        const traumaValue = regionType === "knee" ? data.hadTwist : regionType === "ankle" ? data.hadSprain : data.hadDislocation;
        const showOttawa = (regionType === "knee" && data.hadTwist === "anamnesis.trauma.yes") || (regionType === "ankle" && data.hadSprain === "anamnesis.trauma.yes");

        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">{t("anamnesis.region_detail_title")}{stepHasPrefill("region_detail") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.region_detail_subtitle")}</p>
            <div className="grid gap-3">
              {subAreas.map((area) => {
                const selected = data.painSubArea.includes(area.id);
                return (
                  <Card key={area.id} className={`cursor-pointer transition-all ${selected ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => toggleArrayItem("painSubArea", area.id)}>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{t(area.label)}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(area.desc)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {needsTraumaQuestion && (
              <div className="space-y-3 mt-4 p-4 bg-muted/50 rounded-xl">
                <Label className="text-sm font-medium">{t(traumaQuestion)} <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {["anamnesis.trauma.yes", "anamnesis.trauma.no"].map((opt) => (
                    <Button key={opt} variant={traumaValue === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, [traumaKey]: opt })}>
                      {t(opt)}
                    </Button>
                  ))}
                </div>
                {!traumaValue && data.painSubArea.length > 0 && (
                  <p className="text-xs text-destructive font-medium">{language === "pt" ? "⚠ Resposta obrigatória" : "⚠ Required answer"}</p>
                )}
              </div>
            )}
            {showOttawa && (
              <div className="space-y-3 mt-2 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                <Label className="text-sm font-medium">{t("anamnesis.ottawa_title")} <span className="text-destructive">*</span></Label>
                <p className="text-sm text-muted-foreground">{t(regionType === "knee" ? "anamnesis.ottawa_knee" : "anamnesis.ottawa_ankle")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {["anamnesis.trauma.yes", "anamnesis.trauma.no"].map((opt) => (
                    <Button key={opt} variant={data.ottawaPositive === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, ottawaPositive: opt })}>
                      {t(opt)}
                    </Button>
                  ))}
                </div>
                {!data.ottawaPositive && (
                  <p className="text-xs text-destructive font-medium">{language === "pt" ? "⚠ Resposta obrigatória para prosseguir" : "⚠ Required answer to proceed"}</p>
                )}
                {data.ottawaPositive === "anamnesis.trauma.no" && (
                  <p className="text-sm text-destructive font-medium">{t("anamnesis.ottawa_warning")}</p>
                )}
              </div>
            )}
            {needsEdemaQuestion && (
              <div className="space-y-3 mt-4 p-4 bg-muted/50 rounded-xl">
                <Label className="text-sm font-medium">{t("anamnesis.edema_question")}</Label>
                <p className="text-xs text-muted-foreground">{t("anamnesis.edema_subtitle")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {["anamnesis.trauma.yes", "anamnesis.trauma.no"].map((opt) => (
                    <Button key={opt} variant={data.hasLocalSwelling === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, hasLocalSwelling: opt })}>
                      {t(opt)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {data.painSubArea.includes("posterior") && regionType === "shoulder" && (
              <div className="space-y-3 mt-4 p-4 bg-muted/50 rounded-xl">
                <Label className="text-sm font-medium">{t("anamnesis.scapula_question")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["anamnesis.scapula.yes", "anamnesis.scapula.no"].map((opt) => (
                    <Button key={opt} variant={data.hasScapulaPain === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, hasScapulaPain: opt })}>
                      {t(opt)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      }
      case "migraine_screening":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">{t("anamnesis.migraine_title")}{stepHasPrefill("migraine_screening") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.migraine_subtitle")}</p>

            <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
              <Label className="text-sm font-medium">{t("anamnesis.migraine_photophobia")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {["anamnesis.trauma.yes", "anamnesis.trauma.no"].map((opt) => (
                  <Button key={opt} variant={data.hasPhotophobia === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, hasPhotophobia: opt })}>
                    {t(opt)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
              <Label className="text-sm font-medium">{t("anamnesis.migraine_aura")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {["anamnesis.trauma.yes", "anamnesis.trauma.no"].map((opt) => (
                  <Button key={opt} variant={data.hasVisualAura === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, hasVisualAura: opt })}>
                    {t(opt)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
              <Label className="text-sm font-medium">{t("anamnesis.migraine_nausea")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {["anamnesis.trauma.yes", "anamnesis.trauma.no"].map((opt) => (
                  <Button key={opt} variant={data.hasNausea === opt ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setData({ ...data, hasNausea: opt })}>
                    {t(opt)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
              <Label className="text-sm font-medium">{t("anamnesis.migraine_frequency")}</Label>
              <div className="grid gap-2">
                {["anamnesis.migraine_freq.daily", "anamnesis.migraine_freq.weekly", "anamnesis.migraine_freq.monthly", "anamnesis.migraine_freq.sporadic"].map((opt) => (
                  <Card key={opt} className={`cursor-pointer transition-all ${data.headacheCrisisFrequency === opt ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, headacheCrisisFrequency: opt })}>
                    <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(opt)}</span></CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      case "sex_age":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">{t("anamnesis.sex_age_title")}{stepHasPrefill("sex_age") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.sex_age_subtitle")}</p>
            <div className="space-y-3">
              <Label>{t("anamnesis.sex_label")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {["anamnesis.sex.male", "anamnesis.sex.female"].map((s) => (
                  <Button key={s} variant={data.sex === s ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5" onClick={() => setData({ ...data, sex: s })}>
                    {t(s)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>{t("anamnesis.age_range_label")}</Label>
              <div className="grid gap-2">
                {ageRanges.map((a) => (
                  <Card key={a} className={`cursor-pointer transition-all ${data.ageRange === a ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, ageRange: a })}>
                    <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(a)}</span></CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {mode === "professional" && (
              <>
                <div className="space-y-3">
                  <Label>{language === "pt" ? "Data de nascimento" : "Date of birth"}</Label>
                  <Input type="date" value={data.birthDate || ""} onChange={(e) => setData({ ...data, birthDate: e.target.value })} className="text-sm h-10" />
                </div>
                <div className="space-y-3">
                  <Label>CPF</Label>
                  <Input value={data.cpf || ""} onChange={(e) => setData({ ...data, cpf: formatCpf(e.target.value) })} placeholder="000.000.000-00" className="text-sm h-10" maxLength={14} />
                </div>
              </>
            )}
          </div>
        );
      case "paintype":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_type_title")}{stepHasPrefill("paintype") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.pain_type_subtitle")}</p>
            <div className="grid grid-cols-2 gap-2">
              {painTypes.map((pt) => (
                <Button key={pt} variant={data.painTypes.includes(pt) ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5" onClick={() => toggleArrayItem("painTypes", pt)}>
                  {t(pt)}
                </Button>
              ))}
            </div>
          </div>
        );
      case "pain_mechanism":
        return mode === "premium" || mode === "professional" ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {language === "pt"
                  ? "Como sua dor se comporta"
                  : language === "es"
                    ? "Cómo se comporta su dolor"
                    : "How your pain behaves"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "pt"
                  ? "Essas respostas ajudam a entender o tipo de dor, não só onde ela dói."
                  : language === "es"
                    ? "Estas respuestas ayudan a entender el tipo de dolor, no solo dónde duele."
                    : "These answers help us understand the type of pain, not just where it hurts."}
              </p>
            </div>
            <PainMechanismWizard
              value={data.painMechanism ?? createEmptyLiteAnswers()}
              onChange={(next) =>
                setData({
                  ...data,
                  painMechanism: {
                    ...(data.painMechanism ?? createEmptyLiteAnswers()),
                    ...next,
                  },
                })
              }
              variant="patient"
              language={language}
              regionCount={data.painRegions?.length ?? 0}
              suggestedDistribution={suggestDistribution(data.painRegions ?? [])}
              onStageChange={setMechanismStage}
            />
          </div>
        ) : (
          <PainMechanismLite
            value={data.painMechanism ?? createEmptyLiteAnswers()}
            onChange={(next) => setData({ ...data, painMechanism: next })}
            painRegions={data.painRegions}
            painTypes={data.painTypes}
            variant="basic"
            language={language}
          />
        );
      case "evolution":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.evolution_title")}{stepHasPrefill("evolution") && <PrefilledBadge />}</h3>
            <div className="grid gap-3">
              {["anamnesis.evolution.improving", "anamnesis.evolution.stable", "anamnesis.evolution.fluctuating", "anamnesis.evolution.worsening"].map((e) => (
                <Card key={e} className={`cursor-pointer transition-all ${data.evolution === e ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, evolution: e })}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <span className={`text-lg ${e.includes("improving") ? "text-primary" : e.includes("worsening") ? "text-destructive" : "text-muted-foreground"}`}>
                      {e.includes("improving") ? "📈" : e.includes("worsening") ? "📉" : "➡️"}
                    </span>
                    <span className="text-sm font-medium">{t(e)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "factors":
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>{t("anamnesis.aggravating")}{isPrefilled("aggravatingFactors") && <PrefilledBadge />}</Label>
              <Textarea value={data.aggravatingFactors} onChange={(e) => setData({ ...data, aggravatingFactors: e.target.value.slice(0, 500) })} placeholder={t("anamnesis.aggravating_placeholder")} rows={2} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>{t("anamnesis.relieving")}{isPrefilled("relievingFactors") && <PrefilledBadge />}</Label>
              <Textarea value={data.relievingFactors} onChange={(e) => setData({ ...data, relievingFactors: e.target.value.slice(0, 500) })} placeholder={t("anamnesis.relieving_placeholder")} rows={2} maxLength={500} />
            </div>
            <div className="space-y-3">
              <Label>{t("anamnesis.activity_level")}{isPrefilled("activityLevel") && <PrefilledBadge />}</Label>
              <div className="grid grid-cols-2 gap-2">
                {activityLevels.map((a) => (
                  <Button key={a} variant={data.activityLevel === a ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5" onClick={() => setData({ ...data, activityLevel: a })}>
                    {t(a)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>{language === "en" ? "Your work routine (optional)" : language === "es" ? "Tu rutina de trabajo (opcional)" : "Sua rotina de trabalho (opcional)"}</Label>
              <div className="grid grid-cols-2 gap-2">
                {WORK_DEMAND_IDS.map((id) => (
                  <Button key={id} type="button" variant={data.workDemand === id ? "default" : "outline"} size="sm" className="rounded-xl h-auto py-2.5 whitespace-normal" onClick={() => setData({ ...data, workDemand: data.workDemand === id ? "" : id })}>
                    {workDemandLabel(id, language)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "en" ? "Which activity do you miss most today? (optional)" : language === "es" ? "¿Qué actividad más extrañas hoy? (opcional)" : "Qual atividade mais faz falta hoje? (opcional)"}</Label>
              <Input value={data.participationGoal || ""} onChange={(e) => setData({ ...data, participationGoal: e.target.value.slice(0, 200) })} maxLength={200} placeholder={language === "en" ? "E.g. work without pain, run, play with my kids" : language === "es" ? "Ej.: trabajar sin dolor, correr, jugar con mis hijos" : "Ex.: trabalhar sem dor, correr, brincar com meu filho"} />
            </div>
          </div>
        );
      case "duration":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_duration_title")}{stepHasPrefill("duration") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.pain_duration_subtitle")}</p>
            <div className="grid gap-3">
              {["anamnesis.duration.less_week", "anamnesis.duration.one_month", "anamnesis.duration.three_six_months", "anamnesis.duration.one_year_plus"].map((option) => (
                <Card key={option} className={`cursor-pointer transition-all ${data.painDuration === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, painDuration: option })}>
                  <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(option)}</span></CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "pain_frequency":
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_frequency_title")}{stepHasPrefill("pain_frequency") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.pain_frequency_subtitle")}</p>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("anamnesis.pain_pattern_label")}</Label>
              <div className="grid grid-cols-2 gap-3">
                {["anamnesis.pain_pattern.continuous", "anamnesis.pain_pattern.intermittent"].map((opt) => (
                  <Card key={opt} className={`cursor-pointer transition-all ${data.painPattern === opt ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, painPattern: opt, ...(opt.includes("continuous") ? { painWeeklyFrequency: "" } : {}) })}>
                    <CardContent className="py-4 px-4 text-center">
                      <span className="text-2xl block mb-1">{opt.includes("continuous") ? "🔄" : "⚡"}</span>
                      <span className="text-sm font-medium">{t(opt)}</span>
                      <p className="text-xs text-muted-foreground mt-1">{t(`${opt}_desc`)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {data.painPattern === "anamnesis.pain_pattern.intermittent" && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                <Label className="text-sm font-medium">{t("anamnesis.weekly_frequency_label")}</Label>
                <div className="grid gap-2">
                  {["anamnesis.weekly_freq.daily", "anamnesis.weekly_freq.4_6", "anamnesis.weekly_freq.2_3", "anamnesis.weekly_freq.1_or_less"].map((opt) => (
                    <Card key={opt} className={`cursor-pointer transition-all ${data.painWeeklyFrequency === opt ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, painWeeklyFrequency: opt })}>
                      <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(opt)}</span></CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
              <Label className="text-sm font-medium">{t("anamnesis.night_waking_label")}</Label>
              <p className="text-xs text-muted-foreground">{t("anamnesis.night_waking_subtitle")}</p>
              <div className="grid gap-2">
                {["anamnesis.night_waking.frequent", "anamnesis.night_waking.sometimes", "anamnesis.night_waking.no"].map((opt) => (
                  <Card key={opt} className={`cursor-pointer transition-all ${data.painNightWaking === opt ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, painNightWaking: opt })}>
                    <CardContent className="py-3 px-4"><span className="text-sm font-medium">{t(opt)}</span></CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      case "gym":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("anamnesis.gym_access_title")}{stepHasPrefill("gym") && <PrefilledBadge />}</h3>
            <p className="text-sm text-muted-foreground">{t("anamnesis.gym_access_subtitle")}</p>
            <div className="grid gap-3">
              {["anamnesis.gym.yes", "anamnesis.gym.no"].map((option) => (
                <Card key={option} className={`cursor-pointer transition-all ${data.hasGymAccess === option ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`} onClick={() => setData({ ...data, hasGymAccess: option })}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <span className="text-lg">{option.includes("yes") ? "🏋️" : "🏠"}</span>
                    <div>
                      <span className="text-sm font-medium">{t(option)}</span>
                      <p className="text-xs text-muted-foreground">{t(`${option}_desc`)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "painscore": {
        const faces = ["😊", "🙂", "😐", "😟", "😣", "😖", "😫", "😩", "🤯", "😵", "😱"];
        const gradientColors = [
          "hsl(150, 60%, 45%)",
          "hsl(130, 55%, 45%)",
          "hsl(100, 50%, 48%)",
          "hsl(70, 55%, 48%)",
          "hsl(50, 65%, 50%)",
          "hsl(40, 70%, 50%)",
          "hsl(30, 75%, 48%)",
          "hsl(20, 80%, 48%)",
          "hsl(10, 80%, 48%)",
          "hsl(0, 75%, 48%)",
          "hsl(0, 85%, 40%)",
        ];
        const regionColors = [
          "hsl(200, 70%, 50%)", "hsl(30, 80%, 50%)", "hsl(280, 60%, 50%)",
          "hsl(340, 70%, 50%)", "hsl(160, 60%, 45%)", "hsl(60, 70%, 45%)",
        ];
        const hasMultipleRegions = data.chiefComplaints.length > 1;
        const regionLabels = data.chiefComplaints.map(c => t(c));

        const renderVasBar = (score: number, onScoreChange: (s: number) => void, refKey?: string) => (
          <div className="px-2 space-y-3">
            <div
              ref={refKey ? (el) => { vasBarRefs.current[refKey] = el; } : vasBarRef}
              className="relative h-5 rounded-full overflow-visible border border-border/60 shadow-inner cursor-pointer touch-none select-none"
              style={{ background: `linear-gradient(to right, ${gradientColors.join(", ")})`, borderRadius: "9999px" }}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setIsDragging(true);
                if (refKey) setActiveDragRegion(refKey);
                const rect = e.currentTarget.getBoundingClientRect();
                const s = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 10);
                onScoreChange(s);
              }}
              onPointerMove={(e) => {
                if (!isDragging) return;
                if (refKey && activeDragRegion !== refKey) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const s = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 10);
                onScoreChange(s);
              }}
              onPointerUp={() => { setIsDragging(false); setActiveDragRegion(null); }}
              onPointerCancel={() => { setIsDragging(false); setActiveDragRegion(null); }}
            >
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-[3px] shadow-lg z-10 pointer-events-none"
                style={{ borderColor: gradientColors[score] }}
                animate={{ left: `calc(${(score / 10) * 100}% - 12px)` }}
                transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 25 }}
              />
            </div>
            <div className="flex justify-between">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} type="button" onClick={() => onScoreChange(i)} className="flex flex-col items-center cursor-pointer">
                  <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200"
                    style={{ backgroundColor: score === i ? gradientColors[i] : "transparent", color: score === i ? "white" : "hsl(var(--muted-foreground))" }}
                  >{i}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("anamnesis.no_pain")}</span>
              <span>{t("anamnesis.worst_pain")}</span>
            </div>
          </div>
        );

        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">{t("anamnesis.pain_score_title")}</h3>
            {typeof previousPainScore === "number" && (
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary/90">
                <span>📊</span>
                <span>{t("assessment.prefilled.lastPainScore").replace("{{value}}", String(previousPainScore))}</span>
              </div>
            )}


            {/* Mode selector for multiple regions */}
            {hasMultipleRegions && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("anamnesis.pain_score_mode_question")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={data.painScoreMode === "general" ? "default" : "outline"}
                    size="sm" className="rounded-xl h-auto py-2.5"
                    onClick={() => setData({ ...data, painScoreMode: "general" })}
                  >
                    {t("anamnesis.pain_score_mode_general")}
                  </Button>
                  <Button
                    variant={data.painScoreMode === "per_region" ? "default" : "outline"}
                    size="sm" className="rounded-xl h-auto py-2.5"
                    onClick={() => {
                      const initial: Record<string, number> = {};
                      data.chiefComplaints.forEach(c => { if (!data.painScoresPerRegion?.[c]) initial[c] = 5; });
                      setData({ ...data, painScoreMode: "per_region", painScoresPerRegion: { ...initial, ...data.painScoresPerRegion } });
                    }}
                  >
                    {t("anamnesis.pain_score_mode_per_region")}
                  </Button>
                </div>
              </div>
            )}

            {/* General mode or single region */}
            {(data.painScoreMode === "general" || !hasMultipleRegions) && (
              <>
                <div className="text-center space-y-1">
                  <motion.span key={data.painScore} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl inline-block">
                    {faces[data.painScore]}
                  </motion.span>
                  <div className="text-5xl font-black tabular-nums transition-colors duration-300" style={{ color: gradientColors[data.painScore] }}>
                    {data.painScore}
                  </div>
                  <p className="text-sm text-muted-foreground">{t("anamnesis.pain_score_desc")}</p>
                </div>
                {renderVasBar(data.painScore, (s) => setData(prev => ({ ...prev, painScore: s })))}
              </>
            )}

            {/* Per-region mode */}
            {data.painScoreMode === "per_region" && hasMultipleRegions && (
              <div className="space-y-6">
                {data.chiefComplaints.map((complaint, idx) => {
                  const score = data.painScoresPerRegion?.[complaint] ?? 5;
                  const color = regionColors[idx % regionColors.length];
                  return (
                    <div key={complaint} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold">{t(complaint)}</span>
                        <span className="text-lg font-black ml-auto" style={{ color: gradientColors[score] }}>{score}</span>
                        <span className="text-xl">{faces[score]}</span>
                      </div>
                      {renderVasBar(score, (s) => {
                        const updated = { ...data.painScoresPerRegion, [complaint]: s };
                        const avg = Math.round(Object.values(updated).reduce((a, b) => a + b, 0) / Object.values(updated).length);
                        setData(prev => ({ ...prev, painScoresPerRegion: updated, painScore: avg }));
                      }, complaint)}
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-xl">
                  {data.chiefComplaints.map((c, idx) => (
                    <div key={c} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: regionColors[idx % regionColors.length] }} />
                      <span>{t(c)}: <strong>{data.painScoresPerRegion?.[c] ?? 5}</strong></span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                    <span>{t("anamnesis.pain_score_average")}: <strong>{data.painScore}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  const isStepValid = (id: StepId): boolean => {
    switch (id) {
      case "purpose": return !isPreventiveAssessment(data) || !!data.preventionGoals?.length || !!data.preventionGoalDetails?.trim();
      case "preventive_activity": return data.activityLevel !== "";
      case "complaint": return data.chiefComplaints.length > 0 || data.customComplaint.trim() !== "";
      case "onset": return data.onset !== "";
      case "surgery": return data.hasPriorSurgery !== "";
      case "health_history": {
        const conds = data.healthConditions || [];
        if (conds.length === 0) return false;
        if (conds.includes("other")) {
          if (!(data.healthConditionsOther || "").trim()) return false;
          if (!data.healthConditionsOtherOnset) return false;
          if (!data.healthConditionsOtherControl) return false;
        }
        if (!data.usesContinuousMedication) return false;
        if (data.usesContinuousMedication === "yes" && !(data.continuousMedications || "").trim()) return false;
        return true;
      }
      case "painmap": return isPreventiveAssessment(data) || data.painRegions.length > 0;
      case "region_detail": {
        if (data.painSubArea.length === 0) return false;
        const regionType = getSelectedSingleRegionType();
        const needsTrauma = regionType === "knee" || regionType === "ankle" || regionType === "shoulder";
        if (needsTrauma) {
          const traumaVal = regionType === "knee" ? data.hadTwist : regionType === "ankle" ? data.hadSprain : data.hadDislocation;
          if (!traumaVal) return false;
          const needsOttawa = (regionType === "knee" && data.hadTwist === "anamnesis.trauma.yes") || (regionType === "ankle" && data.hadSprain === "anamnesis.trauma.yes");
          if (needsOttawa && !data.ottawaPositive) return false;
        }
        return true;
      }
      case "migraine_screening": return !!data.hasPhotophobia && !!data.hasNausea && !!data.headacheCrisisFrequency;
      case "sex_age": return data.sex !== "" && data.ageRange !== "";
      case "paintype": return data.painTypes.length > 0;
      case "pain_mechanism":
        // Triagem de mecanismo de dor é opcional: o paciente pode preencher
        // parcialmente ou pular sem travar o fluxo.
        return true;

      case "evolution": return data.evolution !== "";
      case "factors": return data.activityLevel !== "";
      case "duration": return data.painDuration !== "";
      case "pain_frequency": return !!data.painPattern && !!data.painNightWaking && (data.painPattern !== "anamnesis.pain_pattern.intermittent" || !!data.painWeeklyFrequency);
      case "gym": return data.hasGymAccess !== "";
      case "painscore": return true;
    }
  };

  const totalSteps = stepSequence.length;
  const canGoNext = () => isStepValid(stepSequence[safeStep]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void draft.discard();
      onComplete(normalizeAssessmentPurpose(data));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {!autoRestoreDraft && draft.hasDraft && draft.draftMeta && (
        <DraftResumeBanner
          updatedAt={draft.draftMeta.updatedAt}
          source={draft.draftMeta.source}
          onRestore={handleRestoreDraft}
          onDiscard={() => void draft.discard()}
        />
      )}
      {prefilledKeys.size > 0 && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs text-foreground/80 leading-relaxed">
            {t("assessment.prefilled.banner")}
          </AlertDescription>
        </Alert>
      )}
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("anamnesis.step")} {step + 1}/{totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderStep(stepSequence[safeStep])}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={step === 0 ? onBack : () => { setStep(step - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="gap-2 rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("anamnesis.back")}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canGoNext()}
          variant={
            stepSequence[step] === "pain_mechanism" &&
            mode !== "basic" &&
            mechanismStage < 2
              ? "outline"
              : "default"
          }
          className={`gap-2 rounded-xl ${
            stepSequence[step] === "pain_mechanism" &&
            mode !== "basic" &&
            mechanismStage < 2
              ? "text-muted-foreground"
              : ""
          }`}
        >
          {step === totalSteps - 1 ? t("anamnesis.finish") : t("anamnesis.next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default AnamnesisForm;

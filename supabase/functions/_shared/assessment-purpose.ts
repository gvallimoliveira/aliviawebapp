/** Explicit opt-in only. Legacy or unknown values retain the symptomatic flow. */
export interface PurposeData {
  assessmentPurpose?: "symptomatic" | "prevention";
  preventionGoals?: string[];
  preventionGoalDetails?: string;
  historyRegions?: string[];
}

export const isPreventiveAssessment = (data: unknown): boolean =>
  !!data && typeof data === "object" && "assessmentPurpose" in data && data.assessmentPurpose === "prevention";

/** Never let hidden symptom defaults or historical sites become current pain. */
export function normalizeAssessmentPurpose<T extends PurposeData & Record<string, any>>(data: T): T {
  if (!isPreventiveAssessment(data)) return data;
  return {
    ...data,
    chiefComplaint: "", chiefComplaints: [], customComplaint: "",
    painRegions: [], painScore: null, painScoreMode: "general", painScoresPerRegion: {},
    painType: "", painTypes: [], painTypesPerRegion: {}, painRegionRefinements: {},
    painMechanism: undefined, mechanismAnswers: undefined,
    onset: "", duration: "", painDuration: "", evolution: "",
    aggravatingFactors: "", relievingFactors: "", painPattern: "",
    painWeeklyFrequency: "", painNightWaking: "", painSubArea: [],
    hadTwist: "", hadSprain: "", hadDislocation: "", ottawaPositive: "",
    hasLocalSwelling: "", hasScapulaPain: "", hasPhotophobia: "",
    hasVisualAura: "", hasNausea: "", headacheCrisisFrequency: "",
  };
}

export const shouldCollectPainQuestionnaires = (data: unknown, enabled = true): boolean =>
  enabled && !isPreventiveAssessment(data);

export const shouldCollectPainSelfTests = (data: unknown, enabled = true): boolean =>
  enabled && !isPreventiveAssessment(data);

export function preventiveReasoningContext(data: PurposeData): string {
  if (!isPreventiveAssessment(data)) return "";
  return `PREVENTIVE ASSESSMENT — patient explicitly reports NO CURRENT PAIN. Goals: ${(data.preventionGoals || []).join(", ")}. Details: ${data.preventionGoalDetails || "not provided"}. Historical injury / attention sites (NOT painful sites): ${(data.historyRegions || []).join(", ") || "none specified"}.
Do not invent pain, a pain mechanism, disability, pathology or restrictions from history/posture alone. Hidden EVA is NOT measured; null means not collected, never a measured zero. Prior symptomatic assessments and old hypotheses are historical, not proof of current pain. Describe the preventive/functional assessment based on actual findings, including negative findings and explicitly requested questionnaires such as SRS-22r. When no supported pathology exists use a preventive follow-up description instead of a disease diagnosis. Safety/red flags still take precedence. Select functional/preventive objectives (mobility, motor control, strengthening, gradual load exposure), never pain control/modulation for this mode.`;
}

export const manualPurposeSteps = (data: unknown): number[] =>
  isPreventiveAssessment(data) ? [0, 1, 2, 4, 5, 6, 7, 8, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
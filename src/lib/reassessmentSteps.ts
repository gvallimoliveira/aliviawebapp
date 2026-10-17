import { normalizeAssessmentPurpose, isPreventiveAssessment } from "./assessmentPurpose";

// Granular steps that can be enabled/disabled inside a reassessment link.
// Top-level "anamnesis" is implicit: present if any of the anamnesis sub-steps is enabled.

export type ReassessStepId =
  | "redflags"
  | "complaint" // queixa principal + caracterização (onset, paintype, evolution, factors, duração, frequência)
  | "painmap"
  | "surgery"
  | "painscore" // EVA
  | "painmechanism" // triagem de mecanismo de dor (opcional)
  | "activity" // nível de atividade + acesso a academia
  | "questionnaire"
  | "functionaltests" // testes funcionais autoaplicados (opcional)
  | "psychosocial" // FABQ (yellow flags)
  | "spine"; // SRS-22r (escoliose / coluna torácica) — opcional e obrigatório no link quando marcado


export const ALL_REASSESS_STEPS: ReassessStepId[] = [
  "redflags",
  "complaint",
  "painmap",
  "surgery",
  "painscore",
  "painmechanism",
  "activity",
  "questionnaire",
  "functionaltests",
  "psychosocial",
  "spine",
];


export const ANAMNESIS_SUB_IDS: ReassessStepId[] = [
  "complaint",
  "painmap",
  "surgery",
  "painscore",
  "painmechanism",
  "activity",
];

// Default selection when the professional opens the configuration modal for the first time.
// Mirrors today's behaviour (everything except red flags, which the reassessment flow already skips).
export const DEFAULT_REASSESS_STEPS: ReassessStepId[] = [
  "complaint",
  "painmap",
  "surgery",
  "painscore",
  "painmechanism",
  "activity",
  "questionnaire",
];

export const parseStepsParam = (raw: string | null | undefined): Set<ReassessStepId> | null => {
  if (!raw) return null; // null = full flow (back-compat with old links)
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean) as ReassessStepId[];
  const filtered = parts.filter((p) => (ALL_REASSESS_STEPS as string[]).includes(p));
  return new Set(filtered);
};

export const stepsToParam = (ids: ReassessStepId[]): string => ids.join(",");

export const hasAnyAnamnesisSub = (enabled: Set<ReassessStepId> | null): boolean => {
  if (!enabled) return true;
  return ANAMNESIS_SUB_IDS.some((id) => enabled.has(id));
};

export const isStepEnabled = (
  enabled: Set<ReassessStepId> | null,
  id: ReassessStepId,
): boolean => {
  if (!enabled) return true; // no param -> everything enabled
  return enabled.has(id);
};

/**
 * Merge missing anamnesis sub-sections from the original assessment.
 * For each disabled sub-step, copies the corresponding fields from `original.anamnesis_data`
 * (and `original.pain_regions`) into the new data so the report/PDF stays complete.
 */
export const mergeAnamnesisWithOriginal = (
  data: any,
  original: { anamnesis_data?: any; pain_regions?: string[] | null } | null,
  enabled: Set<ReassessStepId> | null,
): any => {
  if (isPreventiveAssessment(data)) {
    const orig = original?.anamnesis_data || {};
    const merged = { ...orig, ...data };
    if (enabled && !enabled.has("surgery")) {
      merged.hasPriorSurgery = orig.hasPriorSurgery;
      merged.surgeryDetails = orig.surgeryDetails;
    }
    if (enabled && !enabled.has("activity")) {
      merged.activityLevel = orig.activityLevel;
      merged.hasGymAccess = orig.hasGymAccess;
    }
    return normalizeAssessmentPurpose(merged);
  }
  if (!original || !enabled) return data;
  const orig = (original.anamnesis_data || {}) as any;
  const merged: any = { ...data };

  if (!enabled.has("complaint")) {
    if (orig.chiefComplaints?.length) {
      merged.chiefComplaints = orig.chiefComplaints;
      merged.chiefComplaint = orig.chiefComplaints[0] || merged.chiefComplaint || "";
    } else if (orig.chiefComplaint) {
      merged.chiefComplaint = orig.chiefComplaint;
      if (!merged.chiefComplaints?.length) merged.chiefComplaints = [orig.chiefComplaint];
    }
    if (orig.customComplaint != null) merged.customComplaint = orig.customComplaint;
    if (orig.onset) merged.onset = orig.onset;
    if (orig.painTypes?.length) merged.painTypes = orig.painTypes;
    if (orig.evolution) merged.evolution = orig.evolution;
    if (orig.aggravatingFactors) merged.aggravatingFactors = orig.aggravatingFactors;
    if (orig.relievingFactors) merged.relievingFactors = orig.relievingFactors;
    if (orig.painDuration) merged.painDuration = orig.painDuration;
    if (orig.painPattern) merged.painPattern = orig.painPattern;
    if (orig.painWeeklyFrequency) merged.painWeeklyFrequency = orig.painWeeklyFrequency;
    if (orig.painNightWaking) merged.painNightWaking = orig.painNightWaking;
    if (orig.painSubArea) merged.painSubArea = orig.painSubArea;
    if (orig.hadTwist) merged.hadTwist = orig.hadTwist;
    if (orig.hadSprain) merged.hadSprain = orig.hadSprain;
    if (orig.hadDislocation) merged.hadDislocation = orig.hadDislocation;
    if (orig.ottawaPositive) merged.ottawaPositive = orig.ottawaPositive;
    if (orig.hasLocalSwelling) merged.hasLocalSwelling = orig.hasLocalSwelling;
    if (orig.hasScapulaPain) merged.hasScapulaPain = orig.hasScapulaPain;
    if (orig.hasPhotophobia) merged.hasPhotophobia = orig.hasPhotophobia;
    if (orig.hasVisualAura) merged.hasVisualAura = orig.hasVisualAura;
    if (orig.hasNausea) merged.hasNausea = orig.hasNausea;
    if (orig.headacheCrisisFrequency) merged.headacheCrisisFrequency = orig.headacheCrisisFrequency;
  }

  if (!enabled.has("painmap")) {
    const origRegions = orig.painRegions || original.pain_regions || [];
    if (origRegions?.length) merged.painRegions = origRegions;
  }

  if (!enabled.has("surgery")) {
    if (orig.hasPriorSurgery) merged.hasPriorSurgery = orig.hasPriorSurgery;
    if (orig.surgeryDetails != null) merged.surgeryDetails = orig.surgeryDetails;
  }

  if (!enabled.has("painscore")) {
    if (orig.painScore != null) merged.painScore = orig.painScore;
    if (orig.painScoreMode) merged.painScoreMode = orig.painScoreMode;
    if (orig.painScoresPerRegion) merged.painScoresPerRegion = orig.painScoresPerRegion;
  }

  if (!enabled.has("painmechanism")) {
    if (orig.painMechanism) merged.painMechanism = orig.painMechanism;
  }

  if (!enabled.has("activity")) {
    if (orig.activityLevel) merged.activityLevel = orig.activityLevel;
    if (orig.hasGymAccess) merged.hasGymAccess = orig.hasGymAccess;
  }

  return merged;
};

/**
 * Builds a synthetic AnamnesisData entirely from the original assessment when no sub-step
 * is enabled (the patient will skip the anamnesis screen completely).
 */
export const buildAnamnesisFromOriginal = (original: {
  anamnesis_data?: any;
  pain_regions?: string[] | null;
  pain_score?: number | null;
} | null): any => {
  const orig = (original?.anamnesis_data || {}) as any;
  return normalizeAssessmentPurpose({
    assessmentPurpose: orig.assessmentPurpose,
    preventionGoals: orig.preventionGoals,
    preventionGoalDetails: orig.preventionGoalDetails,
    historyRegions: orig.historyRegions,
    ...orig,
    chiefComplaint: orig.chiefComplaint || "",
    chiefComplaints: orig.chiefComplaints || (orig.chiefComplaint ? [orig.chiefComplaint] : []),
    customComplaint: orig.customComplaint || "",
    onset: orig.onset || "",
    painRegions: orig.painRegions || original?.pain_regions || [],
    painTypes: orig.painTypes || [],
    evolution: orig.evolution || "",
    aggravatingFactors: orig.aggravatingFactors || "",
    relievingFactors: orig.relievingFactors || "",
    activityLevel: orig.activityLevel || "",
    painScore: orig.painScore ?? original?.pain_score ?? 5,
    hasGymAccess: orig.hasGymAccess || "",
    painDuration: orig.painDuration || "",
    sex: orig.sex || "",
    ageRange: orig.ageRange || "",
    hasPriorSurgery: orig.hasPriorSurgery || "",
    surgeryDetails: orig.surgeryDetails || "",
    painSubArea: orig.painSubArea || [],
    hadTwist: orig.hadTwist || "",
    hadSprain: orig.hadSprain || "",
    hadDislocation: orig.hadDislocation || "",
    ottawaPositive: orig.ottawaPositive || "",
    hasLocalSwelling: orig.hasLocalSwelling || "",
    hasScapulaPain: orig.hasScapulaPain || "",
    hasPhotophobia: orig.hasPhotophobia,
    hasVisualAura: orig.hasVisualAura,
    hasNausea: orig.hasNausea,
    headacheCrisisFrequency: orig.headacheCrisisFrequency,
    painPattern: orig.painPattern,
    painWeeklyFrequency: orig.painWeeklyFrequency,
    painNightWaking: orig.painNightWaking,
    painScoreMode: orig.painScoreMode || "general",
    painScoresPerRegion: orig.painScoresPerRegion || {},
    painMechanism: orig.painMechanism,
  });
};

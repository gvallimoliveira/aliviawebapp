/**
 * Anamnesis & assessment compatibility layer.
 *
 * Older manual assessments saved their anamnesis fields in snake_case
 * (chief_complaint, aggravating_factors, etc.). The rest of the app
 * (AssessmentView, PDF generator, edge functions, dashboards, clinical
 * impression) reads camelCase keys. This helper normalizes any anamnesis
 * object into the canonical camelCase shape so legacy rows are still
 * fully readable in the UI.
 *
 * It also normalizes test_results — older rows stored an object
 * `{ questionnaires: [...], functional_tests: "..." }` while the rest
 * of the app expects a flat array of questionnaire results.
 */

const SNAKE_TO_CAMEL_MAP: Record<string, string> = {
  chief_complaint: "chiefComplaint",
  custom_complaint: "customComplaint",
  pain_type: "painType",
  pain_types: "painTypes",
  pain_duration: "painDuration",
  pain_score_mode: "painScoreMode",
  pain_scores_per_region: "painScoresPerRegion",
  pain_pattern: "painPattern",
  pain_weekly_frequency: "painWeeklyFrequency",
  pain_night_waking: "painNightWaking",
  aggravating_factors: "aggravatingFactors",
  relieving_factors: "relievingFactors",
  previous_surgeries: "previousSurgeries",
  previous_treatments: "previousTreatments",
  activity_level: "activityLevel",
  has_gym_access: "hasGymAccess",
  has_edema: "hasEdema",
  had_twist: "hadTwist",
  has_photophobia: "hasPhotophobia",
  has_visual_aura: "hasVisualAura",
  has_nausea: "hasNausea",
  headache_crisis_frequency: "headacheCrisisFrequency",
  functional_tests: "functionalTests",
  patient_name: "patientName",
  patient_email: "patientEmail",
  manual_entry: "manualEntry",
  chief_complaints: "chiefComplaints",
};

export function normalizeAnamnesis<T = any>(raw: T | null | undefined): any {
  if (!raw || typeof raw !== "object") return raw;
  const src = raw as Record<string, any>;
  const out: Record<string, any> = { ...src };
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL_MAP)) {
    if (src[snake] !== undefined && src[snake] !== null && out[camel] === undefined) {
      out[camel] = src[snake];
    }
  }
  // Backfill array form of complaints
  if (!out.chiefComplaints && out.chiefComplaint) {
    out.chiefComplaints = [out.chiefComplaint];
  }
  if (!out.painTypes && out.painType) {
    out.painTypes = [out.painType];
  }
  return out;
}

/**
 * Normalize test_results into the canonical array of questionnaire results
 * the rest of the app expects.
 */
export function normalizeTestResults(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (Array.isArray(raw.questionnaires)) return raw.questionnaires;
    if (Array.isArray(raw.results)) return raw.results;
  }
  return [];
}

/**
 * Pull free-text functional test observations from any of the legacy
 * locations they might have been saved to.
 */
export function extractFunctionalTestsText(assessment: any): string {
  if (!assessment) return "";
  const a = assessment.anamnesis_data || {};
  return (
    a.functionalTests ||
    a.functional_tests ||
    assessment.test_results?.functional_tests ||
    assessment.test_results?.functionalTests ||
    ""
  );
}

/**
 * Apply all normalizations to an assessment row in one call.
 * Returns a new object — does not mutate the input.
 */
export function normalizeAssessment<T extends Record<string, any>>(assessment: T | null | undefined): T | null {
  if (!assessment) return null as any;
  return {
    ...assessment,
    anamnesis_data: normalizeAnamnesis(assessment.anamnesis_data),
    test_results: normalizeTestResults(assessment.test_results),
    _functionalTestsText: extractFunctionalTestsText(assessment),
  } as any;
}

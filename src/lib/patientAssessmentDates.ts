export interface DatedAssessment {
  created_at?: string | null;
  anamnesis_data?: Record<string, unknown> | null;
  diagnosis?: unknown;
  treatment_plan?: unknown;
  pain_score?: number | null;
  pain_regions?: unknown[] | null;
  test_results?: unknown;
  questionnaire_results?: unknown;
}

// Legacy placeholders with actual clinical content remain reachable.
export function isPlaceholderAssessment(a: DatedAssessment) {
  const ad = a?.anamnesis_data;
  if (!ad || typeof ad !== "object" || !(ad.externalPatient || ad.quickEvolutionOnly || ad.placeholder)) return false;
  return !(a.diagnosis || a.treatment_plan || a.pain_score != null || a.pain_regions?.length ||
    (Array.isArray(ad.strengthTable) && ad.strengthTable.length > 0) || a.test_results || a.questionnaire_results);
}

export function lastRealAssessmentDate(assessments: DatedAssessment[]) {
  let latest: string | null = null;
  for (const a of assessments) {
    if (isPlaceholderAssessment(a) || !a.created_at || !Number.isFinite(Date.parse(a.created_at))) continue;
    if (!latest || Date.parse(a.created_at) > Date.parse(latest)) latest = a.created_at;
  }
  return latest;
}
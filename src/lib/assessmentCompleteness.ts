/**
 * Completeness helpers for assessments.
 *
 * A record is only "clinically complete" when it has BOTH:
 *  - clinical reasoning (AI hypothesis or professional final hypothesis)
 *  - a minimum anamnesis core (complaint / pain / history)
 *
 * Generating only a clinical impression (which writes into `diagnosis`)
 * must NOT make an assessment look complete.
 */

import { isPreventiveAssessment } from "./assessmentPurpose";

export function hasAnamnesisCore(assessment: any): boolean {
  const ad: any = assessment?.anamnesis_data || {};
  if (isPreventiveAssessment(ad)) return !!ad.preventionGoals?.length || !!ad.preventionGoalDetails?.trim();
  return !!(
    ad.chiefComplaint ||
    (Array.isArray(ad.chiefComplaints) && ad.chiefComplaints.length > 0) ||
    ad.customComplaint ||
    ad.painDuration ||
    ad.onset ||
    ad.evolution ||
    (Array.isArray(assessment?.pain_regions) && assessment.pain_regions.length > 0) ||
    assessment?.pain_score != null
  );
}

export function hasClinicalReasoning(assessment: any): boolean {
  const dx: any = assessment?.diagnosis || {};
  return !!(assessment?.final_hypothesis?.trim?.() || dx.hypothesis || dx.title);
}

export function hasOnlyClinicalImpression(assessment: any): boolean {
  const dx: any = assessment?.diagnosis || {};
  return !!dx.clinicalImpression && !hasClinicalReasoning(assessment);
}

export function isAssessmentIncomplete(assessment: any): boolean {
  if (!assessment) return false;
  return !hasClinicalReasoning(assessment) || !hasAnamnesisCore(assessment);
}

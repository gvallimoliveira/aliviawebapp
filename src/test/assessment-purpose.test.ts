import { describe, expect, it } from "vitest";
import { normalizeAssessmentPurpose, isPreventiveAssessment, manualPurposeSteps, shouldCollectPainQuestionnaires } from "@/lib/assessmentPurpose";
import { buildAnamnesisFromOriginal, mergeAnamnesisWithOriginal } from "@/lib/reassessmentSteps";
import { hasAnamnesisCore } from "@/lib/assessmentCompleteness";

describe("explicit preventive assessment isolation", () => {
  it("recognizes preventive objectives as anamnesis without requiring pain", () => {
    expect(hasAnamnesisCore({ anamnesis_data: { assessmentPurpose: "prevention", preventionGoals: ["posture"] }, pain_score: null, pain_regions: [] })).toBe(true);
    expect(hasAnamnesisCore({ anamnesis_data: { assessmentPurpose: "prevention" }, pain_score: null, pain_regions: [] })).toBe(false);
  });
  it("retains legacy symptomatic data unchanged", () => {
    const data = { painScore: 5, painRegions: ["shoulder_left"], chiefComplaint: "Dor" };
    expect(normalizeAssessmentPurpose(data)).toBe(data);
    expect(isPreventiveAssessment(data)).toBe(false);
    expect(manualPurposeSteps(data)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it("records no measured pain score or painful sites in prevention", () => {
    const data = normalizeAssessmentPurpose({ assessmentPurpose: "prevention" as const, painScore: 5, painRegions: ["shoulder_left"], historyRegions: ["shoulder_left"], painMechanism: { mechanism: "nociceptive" } });
    expect(data.painScore).toBeNull();
    expect(data.painRegions).toEqual([]);
    expect(data.historyRegions).toEqual(["shoulder_left"]);
    expect(data.painMechanism).toBeUndefined();
  });
  it("retains safety and all manual functional steps but hides pain intensity", () => {
    expect(manualPurposeSteps({ assessmentPurpose: "prevention" })).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9]);
  });
  it("does not suggest pain questionnaires from historical areas", () => {
    expect(shouldCollectPainQuestionnaires({ assessmentPurpose: "prevention", historyRegions: ["thoracic"] })).toBe(false);
    expect(shouldCollectPainQuestionnaires({ painRegions: ["thoracic"] })).toBe(true);
  });
  it("preserves explicitly answered complementary questionnaires and safety data", () => {
    const specialtyResults = [{ questionnaireId: "srs22r", score: { total: 4 } }];
    const result = normalizeAssessmentPurpose({ assessmentPurpose: "prevention" as const, specialtyResults, redFlags: ["screened"], healthConditions: ["none"], preventionGoals: ["posture"] });
    expect(result.specialtyResults).toEqual(specialtyResults);
    expect(result.redFlags).toEqual(["screened"]);
    expect(result.healthConditions).toEqual(["none"]);
    expect(result.preventionGoals).toEqual(["posture"]);
  });
  it("does not resurrect prior pain when reassessing prevention", () => {
    const result = mergeAnamnesisWithOriginal({ assessmentPurpose: "prevention" }, { pain_regions: ["shoulder_left"], anamnesis_data: { painScore: 7 } }, new Set(["activity"]));
    expect(result.painScore).toBeNull();
    expect(result.painRegions).toEqual([]);
    const original = buildAnamnesisFromOriginal({ anamnesis_data: { assessmentPurpose: "prevention", historyRegions: ["thoracic"] }, pain_score: null });
    expect(original.painScore).toBeNull();
    expect(original.historyRegions).toEqual(["thoracic"]);
  });
  it("retains omitted surgical history and explicit questionnaire results in prevention", () => {
    const specialtyResults = [{ questionnaireId: "srs22r", score: { total: 4.2 } }];
    const result = mergeAnamnesisWithOriginal({ assessmentPurpose: "prevention", hasPriorSurgery: "", activityLevel: "" }, { anamnesis_data: { hasPriorSurgery: "yes", surgeryDetails: "Cirurgia anterior documentada", activityLevel: "athlete", specialtyResults, painScore: 7 } }, new Set(["painmap"]));
    expect(result.hasPriorSurgery).toBe("yes");
    expect(result.surgeryDetails).toBe("Cirurgia anterior documentada");
    expect(result.activityLevel).toBe("athlete");
    expect(result.specialtyResults).toEqual(specialtyResults);
    expect(result.painScore).toBeNull();
  });
});
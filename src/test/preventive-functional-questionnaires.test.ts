import { describe, it, expect } from "vitest";
import { getFunctionalQuestionnaires, getApplicableQuestionnaires } from "@/data/questionnaireData";
import { shouldCollectFunctionalQuestionnaires, shouldCollectPainQuestionnaires } from "@/lib/assessmentPurpose";

describe("preventive functional questionnaires", () => {
  it("shoulder attention region gets SPADI without pain items", () => {
    const qs = getFunctionalQuestionnaires(["shoulder_left", "shoulder_right", "ombro_esquerdo", "left_shoulder"]);
    const spadi = qs.find((q) => q.id === "spadi");
    expect(spadi).toBeTruthy();
    expect(spadi!.questions.some((q) => q.subscale === "pain")).toBe(false);
    expect(spadi!.questions.length).toBe(8);
  });
  it("never applies pain-framed ODI or NDI", () => {
    const all = getApplicableQuestionnaires(["lumbar", "lower_back", "cervical", "neck"]).map((q) => q.id);
    const fn = getFunctionalQuestionnaires(["lumbar", "lower_back", "cervical", "neck"]).map((q) => q.id);
    expect(fn).not.toContain("odi");
    expect(fn).not.toContain("ndi");
    expect(all.length).toBeGreaterThanOrEqual(fn.length);
  });
  it("collects only when preventive with history regions", () => {
    expect(shouldCollectFunctionalQuestionnaires({ assessmentPurpose: "prevention", historyRegions: ["x"] })).toBe(true);
    expect(shouldCollectFunctionalQuestionnaires({ assessmentPurpose: "prevention", historyRegions: [] })).toBe(false);
    expect(shouldCollectFunctionalQuestionnaires({ assessmentPurpose: "symptomatic", historyRegions: ["x"] })).toBe(false);
    expect(shouldCollectPainQuestionnaires({ assessmentPurpose: "symptomatic" })).toBe(true);
  });
});

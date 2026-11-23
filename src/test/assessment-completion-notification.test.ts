import { describe, expect, it } from "vitest";
import { isNewAssessmentCompletion } from "@/lib/assessmentCompletionNotification";

describe("assessment completion notifications", () => {
  const row = { id: "assessment", status: "completed" };
  it("does not announce impression edits on completed assessments", () => {
    expect(isNewAssessmentCompletion(row, "completed")).toBe(false);
  });
  it("announces a real in-progress to completed transition", () => {
    expect(isNewAssessmentCompletion(row, "in_progress")).toBe(true);
  });
  it("fails closed when neither old status nor baseline is known", () => {
    expect(isNewAssessmentCompletion(row, undefined)).toBe(false);
  });
  it("ignores non-completion updates", () => {
    expect(isNewAssessmentCompletion({ ...row, status: "in_progress" }, "in_progress")).toBe(false);
  });
  it.each(["externalPatient", "quickEvolutionOnly", "placeholder"])("ignores %s scaffolding", (flag) => {
    expect(isNewAssessmentCompletion({ ...row, anamnesis_data: { [flag]: true } }, "in_progress")).toBe(false);
  });
});
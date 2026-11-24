import { describe, expect, it } from "vitest";
import { isPlaceholderAssessment, lastRealAssessmentDate } from "@/lib/patientAssessmentDates";

describe("real assessment dates", () => {
  it("never uses patient registration as an assessment", () => {
    expect(lastRealAssessmentDate([])).toBeNull();
  });
  it("uses the latest actual assessment regardless of input order", () => {
    expect(lastRealAssessmentDate([
      { created_at: "2026-11-01T10:00:00Z" },
      { created_at: "2026-11-20T10:00:00Z" },
      { created_at: "2026-11-10T10:00:00Z" },
    ])).toBe("2026-11-20T10:00:00Z");
  });
  it.each(["externalPatient", "quickEvolutionOnly", "placeholder"])("does not date an empty %s placeholder", (flag) => {
    expect(lastRealAssessmentDate([{ created_at: "2026-11-24", anamnesis_data: { [flag]: true } }])).toBeNull();
  });
  it("preserves a legacy placeholder with real clinical content, including zero pain", () => {
    const assessment = { created_at: "2026-11-20", pain_score: 0, anamnesis_data: { placeholder: true } };
    expect(isPlaceholderAssessment(assessment)).toBe(false);
    expect(lastRealAssessmentDate([assessment])).toBe("2026-11-20");
  });
  it("ignores invalid or absent dates without losing valid history", () => {
    expect(lastRealAssessmentDate([{ created_at: "invalid" }, {}, { created_at: "2026-11-20" }])).toBe("2026-11-20");
    expect(lastRealAssessmentDate([{ created_at: "invalid" }])).toBeNull();
  });
});
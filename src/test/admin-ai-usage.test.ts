import { describe, it, expect } from "vitest";
import { usageWindowBounds, brazilUsageDay, usageAssessmentId, assessmentUsageSource } from "../../supabase/functions/_shared/adminUsageWindow";

describe("Admin usage windows and attribution", () => {
  it("Hoje starts at São Paulo midnight, including after UTC midnight", () => {
    expect(usageWindowBounds("today", new Date("2026-11-02T01:05:00Z"))).toEqual({ since: "2026-11-01T03:00:00.000Z", until: "2026-11-02T01:05:00.000Z", days: 1 });
    expect(brazilUsageDay(new Date("2026-11-02T01:05:00Z"))).toBe("2026-11-01");
  });
  it("Últimas 24h is precisely rolling 24 hours", () => {
    expect(usageWindowBounds("24h", new Date("2026-11-01T22:05:00Z")).since).toBe("2026-10-31T22:05:00.000Z");
  });
  it("never guesses an assessment for an old anonymous record", () => {
    expect(usageAssessmentId({ anonymous: true })).toBeNull();
    expect(usageAssessmentId({ assessment_id: "invalid" })).toBeNull();
    expect(usageAssessmentId({ assessment_id: "ed6cd8c9-ff96-4313-a89c-467a75ac3373" })).toBe("ed6cd8c9-ff96-4313-a89c-467a75ac3373");
  });
  it("an institutional anonymous visit is not a basic public assessment", () => {
    expect(assessmentUsageSource({ type: "professional", clinic_id: "clinic" })).toBe("clinic_link");
    expect(assessmentUsageSource({ type: "basic" })).toBe("public_basic");
  });
});
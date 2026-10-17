import { describe, expect, it } from "vitest";
import { buildProfessionalContext } from "../../supabase/functions/_shared/professional-context";

describe("professional context for AI", () => {
  const ctx = buildProfessionalContext({
    additionalClinicalNotes: "Escoliose assintomática",
    functionalTests: "Adams: sem gibosidade significativa",
    specialtyResults: [{ questionnaireId: "srs22r", questionnaireName: "SRS-22r", score: 4.2 }],
  }).join("\n");

  it("includes professional observations", () => expect(ctx).toContain("Escoliose assintomática"));
  it("includes written test findings", () => expect(ctx).toContain("sem gibosidade significativa"));
  it("includes SRS-22r", () => expect(ctx).toContain("SRS-22r | score 4.2"));
  it("returns nothing without professional data", () => expect(buildProfessionalContext({})).toEqual([]));
});

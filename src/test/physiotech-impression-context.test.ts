import { describe, it, expect } from "vitest";
import { buildPhysioTechBlock } from "../../supabase/functions/generate-clinical-impression/physiotechContext";

describe("PhysioTech context in clinical impression", () => {
  it("adds nothing when there are no reports", () => {
    expect(buildPhysioTechBlock(undefined)).toBe("");
    expect(buildPhysioTechBlock([])).toBe("");
    expect(buildPhysioTechBlock("bad")).toBe("");
    expect(buildPhysioTechBlock([{ exam_type: "ultrassom", conclusion: "", metrics: {} }])).toBe("");
  });
  it("includes conclusion and metrics when present", () => {
    const b = buildPhysioTechBlock([{ exam_type: "termografia", exam_date: "2026-11-01T00:00:00Z", conclusion: "Hiperradiação joelho D", metrics: { deltaT: 1.2 } }]);
    expect(b).toContain("Thermography");
    expect(b).toContain("2026-11-01");
    expect(b).toContain("Hiperradiação joelho D");
    expect(b).toContain("deltaT");
  });
});

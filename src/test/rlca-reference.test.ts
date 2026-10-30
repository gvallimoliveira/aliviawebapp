import { describe, it, expect } from "vitest";
import { buildRlcaReference, isRlcaRelevant } from "../../supabase/functions/_shared/rlca-reference";

describe("R-LCA reference relevance", () => {
  it.each([
    "Pós-operatório de R-LCA", "Reconstrução do ligamento cruzado anterior",
    "ACL reconstruction", "ACLR rehab", { previousSurgeries: "R LCA e sutura meniscal" },
    ["Como progredir?", { surgical_history: "reconstrução LCA" }],
  ])("recognizes explicit ACL context %j", (context) => {
    expect(isRlcaRelevant(context)).toBe(true);
    expect(buildRlcaReference(context).length).toBeGreaterThan(1000);
  });
  it.each([undefined, null, {}, "dor no joelho", "lombalgia", "aclamado", "calcaneo"])
    ("does not introduce ACL care into unrelated context %j", (context) => {
      expect(buildRlcaReference(context)).toBe("");
    });
  it("supports historical preventive discussion without deciding surgery status", () => {
    expect(isRlcaRelevant({ assessmentPurpose: "preventive", previousSurgeries: "LCA 2018, assintomático" })).toBe(true);
    // Reference selection is boolean only: no phase, score, or clearance outcome.
    expect(typeof isRlcaRelevant("LCA 2018")).toBe("boolean");
  });
});
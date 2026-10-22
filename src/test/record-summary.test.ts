import { describe, expect, it } from "vitest";
import { effectiveHypothesis, latestByCreated, latestEvolution } from "@/lib/recordSummary";

describe("record summary rules", () => {
  it("professional override wins over AI hypothesis", () => {
    expect(effectiveHypothesis({ final_hypothesis: "Tendinopatia patelar", diagnosis: { hypothesis: "Condromalácia" } })).toBe("Tendinopatia patelar");
  });
  it("falls back to AI hypothesis when override is blank", () => {
    expect(effectiveHypothesis({ final_hypothesis: "  ", diagnosis: { hypothesis: "Condromalácia" } })).toBe("Condromalácia");
  });
  it("latest evolution is the most recent dated non-empty note", () => {
    const n = latestEvolution([
      { session_date: "2026-10-20", content: "B" },
      { session_date: "2026-10-21", content: "" },
      { session_date: "2026-10-01", content: "A" },
    ]);
    expect(n?.content).toBe("B");
  });
  it("latest program is the newest created", () => {
    expect(latestByCreated([{ created_at: "2026-09-01", id: 1 }, { created_at: "2026-10-01", id: 2 }])?.id).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { effectiveHypothesis, latestByCreated, latestEvolution, summaryClinicalAlerts, summaryHealthRecord, summaryImpression } from "@/lib/recordSummary";

describe("record summary rules", () => {
  it("reads structured saved impressions without regenerating or failing", () => {
    expect(summaryImpression({ overview: "Quadro em melhora", therapeuticObjectives: ["Retorno funcional"] })).toBe("Quadro em melhora");
    expect(summaryImpression("Impressão manual")).toBe("Impressão manual");
    expect(summaryImpression({})).toBeNull();
  });
  it("keeps an older active clinical alert when the latest assessment has none", () => {
    expect(summaryClinicalAlerts([{ id: "new", red_flags: { detected: [] } }, { id: "old", red_flags: { detected: ["redflags.fever"] } }])[0]?.items).toEqual(["redflags.fever"]);
  });
  it("preserves dismissal and justification rather than showing a dismissed alert as active", () => {
    const a = summaryClinicalAlerts([{ red_flags: { detected: ["redflags.cancer"] }, red_flags_dismissed_at: "2026-10-22", red_flags_dismissed_reason: "Acompanhamento médico registrado" }])[0];
    expect(a?.dismissedAt).toBe("2026-10-22");
    expect(a?.reason).toBe("Acompanhamento médico registrado");
  });
  it("shows recorded hypertension and continuous medication", () => {
    const health = summaryHealthRecord([{ created_at: "2026-10-21", anamnesis_data: { healthConditions: ["hypertension"], continuousMedications: "Losartana 50 mg" } }], []);
    expect(health?.data.healthConditions).toEqual(["hypertension"]);
    expect(health?.data.continuousMedications).toBe("Losartana 50 mg");
  });
  it("prefers the professional health record on the same day, including an explicit negative answer", () => {
    const health = summaryHealthRecord([{ created_at: "2026-10-22T18:00:00", anamnesis_data: { healthConditions: ["hypertension"] } }], [{ recorded_at: "2026-10-22", health_conditions: ["none"], uses_continuous_medication: "no" }]);
    expect(health?.source).toBe("manual");
    expect(health?.data.healthConditions).toEqual(["none"]);
  });
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

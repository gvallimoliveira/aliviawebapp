import { describe, expect, it } from "vitest";
import { currentStepsPhase, effectiveHypothesis, latestByCreated, latestEvolution, summaryClinicalAlerts, summaryHealthRecord, summaryImpression, summaryPainfulTests } from "@/lib/recordSummary";

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
  it("STEPS phase uses the professional mark, never an inferred one", () => {
    expect(currentStepsPhase([
      { level: "macro", name: "Cicatrização tecidual", goal: "Controle de dor", sort_order: 0 },
      { level: "macro", name: "Hipertrofia e força", goal: "Tolerância à carga", sort_order: 1, is_current: true },
    ])?.name).toBe("Hipertrofia e força");
  });
  it("STEPS phase is null without macro cycles", () => {
    expect(currentStepsPhase([])).toBeNull();
    expect(currentStepsPhase([{ level: "micro", name: "Semana 1" }])).toBeNull();
  });
  it("discharge overrides the last macro phase after insight completion clears current marks", () => {
    expect(currentStepsPhase([
      { level: "macro", name: "Cicatrização tecidual", sort_order: 0, is_current: false },
      { level: "macro", name: "Hipertrofia e força", sort_order: 1, is_current: false },
    ], { status: "completed" })?.name).toBe("Alta");
  });
  it("completed plans retain discharge even without macro cycles", () => {
    expect(currentStepsPhase([], { status: "completed" })?.name).toBe("Alta");
    expect(currentStepsPhase([], { status: "active" })).toBeNull();
  });
  it("painful tests come only from recorded answers, never invented", () => {
    expect(summaryPainfulTests({ test_results: [
      { testId: "cervical_rotation", painful: true },
      { testId: "upper_trap_stretch", painful: false },
      { questionnaireId: "odi", percentageScore: 56 },
    ] })).toEqual(["cervical_rotation"]);
    expect(summaryPainfulTests({ test_results: null })).toEqual([]);
  });
});

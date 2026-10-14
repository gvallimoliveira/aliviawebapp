import { describe, expect, it } from "vitest";
import { analyzePeriod, cardioReportSections } from "@/lib/cardioAnalysis";
import { hrCeiling } from "@/lib/cardioSafety";

describe("cardiovascular report priorities", () => {
  const period = (profile: "athletic" | "healthy" | "cardiac", entries = [{ id: "a", session_date: "2026-10-13", track: "cardio", duration_min: 40, rpe: 6, hr_max: 180, hr_recovery_1min: 174, spo2_min: 90 }]) =>
    analyzePeriod({ entries, checkins: [], ctx: { profile, betaBlocker: false, ceiling: hrCeiling({ profile, age: 31 }) }, weeks: 4, today: "2026-10-13" });
  it.each(["athletic", "healthy"] as const)("prioritizes response and recovery for %s while retaining WHO", (profile) => {
    const p = period(profile);
    const report = cardioReportSections(p, profile, false);
    expect(report.performance).toBe(true);
    expect(report.response.join(" ")).not.toContain("OMS");
    expect(report.response.join(" ")).toContain("TRIMP não calculado");
    expect(report.recovery.join(" ")).toContain("6 bpm");
    expect(report.review.join(" ")).toContain("oxigenação");
    expect(report.review.join(" ")).toContain("não é obrigação");
    expect(report.who.join(" ")).toContain("OMS");
    expect(report.who.join(" ")).toContain("0/4");
  });
  it("does not change the clinical-profile priority", () => {
    expect(cardioReportSections(period("cardiac"), "cardiac", false).performance).toBe(false);
  });
  it("preserves review alerts in the patient version", () => {
    const s = cardioReportSections(period("athletic"), "athletic", true);
    expect(s.review.join(" ")).toContain("oxigenação");
    expect(s.review.join(" ")).toContain("não ajuste");
    expect(s.recovery.join(" ")).not.toContain("melhorou");
  });
  it("does not invent recovery when records are absent", () => {
    const s = cardioReportSections(period("athletic", []), "athletic", true);
    expect(s.response.join(" ")).toContain("Sem sessões");
    expect(s.recovery.join(" ")).toContain("não registrada");
  });
});
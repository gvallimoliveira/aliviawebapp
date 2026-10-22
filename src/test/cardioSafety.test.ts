import { describe, it, expect } from "vitest";
import { hrCeiling, checkinSafetyFlags, estimatedMaxHr, cardioHealthHint } from "@/lib/cardioSafety";
import { summaryHealthRecord } from "@/lib/recordSummary";
describe("cardioSafety", () => {
  it("reads Francisco's assessment hypertension even without a birthdate, without inventing control or bpm", () => {
    const health = summaryHealthRecord([{ created_at: "2026-10-13T19:48:26Z", anamnesis_data: { healthConditions: ["hypertension"] } }], []);
    expect(health?.data.healthConditions).toEqual(["hypertension"]);
    expect(cardioHealthHint(health?.data)).not.toBeNull();
    expect(health?.data.healthConditionsControl?.hypertension).toBeUndefined();
    expect(hrCeiling({ age: null }).ceiling).toBeNull();
  });
  it("reads patient-ID manual health records and respects an explicit newer negative answer", () => {
    const assessment = [{ created_at: "2026-10-13", anamnesis_data: { healthConditions: ["hypertension"] } }];
    const manual = [{ patient_id: "francisco", recorded_at: "2026-10-22", health_conditions: ["hypertension"], health_conditions_control: { hypertension: "controlled" } }];
    expect(summaryHealthRecord(assessment, manual)?.data.healthConditionsControl?.hypertension).toBe("controlled");
    expect(cardioHealthHint(summaryHealthRecord(assessment, [{ ...manual[0], health_conditions: ["none"] }])?.data)).toBeNull();
  });
  it("preserves the professional's manual ceiling even without birthdate and with hypertension", () => {
    expect(cardioHealthHint({ health_conditions: ["hypertension"] })).not.toBeNull();
    expect(hrCeiling({ age: null, profile: "cardiac", override: 110 })).toMatchObject({ ceiling: 110, profile: "cardiac", source: "manual" });
  });
  it("Gellish + perfil", () => {
    expect(estimatedMaxHr(50)).toBe(172);
    expect(hrCeiling({ profile: "hypertensive", age: 50 }).ceiling).toBe(120);
    expect(hrCeiling({ profile: "cardiac", age: 50, override: 110 }).ceiling).toBe(110);
    expect(hrCeiling({ profile: "athletic", age: 50 }).ceiling).toBe(155);
    expect(hrCeiling({ profile: "healthy", age: 50 }).ceiling).toBe(146);
    expect(hrCeiling({ profile: "pulmonary", age: 50 }).ceiling).toBe(120);
  });
  it("flags", () => {
    expect(checkinSafetyFlags({ peak_hr: 130, spo2: 90 }, 120)).toEqual(["hr_above_ceiling", "spo2_low"]);
  });
});
import { cardioMatrix } from "@/lib/cardioSafety";
describe("cardioMatrix", () => {
  it("régua por perfil", () => {
    expect(cardioMatrix(1.35, 0, "hypertensive").quadrant).toBe("msk_spike");
    expect(cardioMatrix(1.35, 0, "athletic").quadrant).toBe("msk_spike");
    expect(cardioMatrix(1.1, 0, "athletic").quadrant).toBe("optimal");
    expect(cardioMatrix(1.6, 8, "healthy").quadrant).toBe("overreaching");
    expect(cardioMatrix(0.6, 6, "cardiac").quadrant).toBe("extra_stress");
  });
});

import { recoverySignal } from "@/lib/periodization";
describe("recoverySignal", () => {
  const ck = (d: string, readiness: number, extra: Record<string, number> = {}) => ({ checkin_date: d, readiness, sleep: readiness, ...extra });
  it("usa a prontidão quando não há FC matinal", () => {
    const s = recoverySignal([ck("2026-10-01", 8), ck("2026-10-02", 8), ck("2026-10-03", 8), ck("2026-10-04", 2)]);
    expect(s.source).toBe("readiness");
    expect(s.strained).toBe(true);
  });
  it("FC matinal elevada prevalece mesmo com prontidão boa", () => {
    const rows = [55, 56, 55, 64].map((hr, i) => ck(`2026-10-0${i + 1}`, 8, { resting_hr: hr }));
    const s = recoverySignal(rows);
    expect(s.source).toBe("both");
    expect(s.level).toBe("danger");
  });
  it("matriz usa prontidão como fallback", () => {
    expect(cardioMatrix(1.6, null, "healthy", true).quadrant).toBe("overreaching");
    expect(cardioMatrix(1.6, null, "healthy", false).quadrant).toBe("msk_spike");
  });
});

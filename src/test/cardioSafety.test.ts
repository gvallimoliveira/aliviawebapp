import { describe, it, expect } from "vitest";
import { hrCeiling, checkinSafetyFlags, estimatedMaxHr } from "@/lib/cardioSafety";
describe("cardioSafety", () => {
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

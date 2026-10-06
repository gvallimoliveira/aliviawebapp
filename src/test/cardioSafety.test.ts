import { describe, it, expect } from "vitest";
import { hrCeiling, checkinSafetyFlags, estimatedMaxHr } from "@/lib/cardioSafety";
describe("cardioSafety", () => {
  it("Gellish + perfil", () => {
    expect(estimatedMaxHr(50)).toBe(172);
    expect(hrCeiling({ profile: "hypertensive", age: 50 }).ceiling).toBe(120);
    expect(hrCeiling({ profile: "cardiac", age: 50, override: 110 }).ceiling).toBe(110);
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

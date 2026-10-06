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

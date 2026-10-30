import { describe, it, expect } from "vitest";
import { computePostOpStatus } from "@/lib/postOpTrajectory";

describe("postOpTrajectory", () => {
  it("week 2 without criteria stays in protection", () => {
    const s = computePostOpStatus({ surgery_date: "2026-10-20" }, "2026-10-30");
    expect(s.week).toBe(2);
    expect(s.phase.id).toBe("protection");
    expect(s.behindSchedule).toBe(false);
  });
  it("time alone never advances phase: week 20 without criteria flags behind schedule", () => {
    const s = computePostOpStatus({ surgery_date: "2026-06-01" }, "2026-10-19");
    expect(s.phase.id).toBe("protection");
    expect(s.behindSchedule).toBe(true);
  });
  it("criteria met early do not skip time-based protection", () => {
    const all = { full_extension: true, effusion_low: true, slr_no_lag: true, gait_normal: true };
    const s = computePostOpStatus({ surgery_date: "2026-10-20", criteria: all }, "2026-10-30");
    expect(s.phase.id).toBe("protection");
  });
  it("meniscal repair adds caveat", () => {
    const s = computePostOpStatus({ surgery_date: "2026-10-20", meniscal_repair: true }, "2026-10-30");
    expect(s.caveats.length).toBe(1);
  });
});

import { autoCriteriaFromMeasurements, effectiveCriteria } from "@/lib/postOpTrajectory";
describe("auto criteria", () => {
  const a = (date: string, rom: any[], str: any[]) => ({ created_at: date + "T10:00:00Z", anamnesis_data: { romTable: rom, strengthTable: str } });
  it("quad 68% fails 80, 85% passes 80 not 90; latest wins; pre-surgery ignored", () => {
    const list = [
      a("2026-09-01", [], [{ movement: "Extensão de joelho", leftValue: "50", rightValue: "50" }]),
      a("2026-10-10", [], [{ movement: "Extensão de joelho", leftValue: "34", rightValue: "50" }]),
      a("2026-10-25", [{ joint: "Joelho extensão", leftValue: "-5", rightValue: "0" }], [{ movement: "Quadríceps", leftValue: "42.5", rightValue: "50" }]),
    ];
    const r = autoCriteriaFromMeasurements(list, "2026-10-01");
    expect(r.quad_lsi_80.value).toBe(true);
    expect(r.quad_lsi_90.value).toBe(false);
    expect(r.full_extension.value).toBe(false);
  });
  it("manual mark overrides measurement", () => {
    expect(effectiveCriteria({ quad_lsi_80: false }, { quad_lsi_80: { value: true, source: "", date: "" } }).quad_lsi_80).toBe(false);
  });
});

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

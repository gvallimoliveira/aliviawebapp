import { describe, it, expect } from "vitest";
import { findOverlaps } from "@/lib/appointmentConflicts";

describe("findOverlaps", () => {
  it("16-17h existing vs 15:30-16:30 request overlaps 30 min", () => {
    const r = findOverlaps("15:30", 60, [{ appointment_time: "16:00:00", duration_minutes: 60 }]);
    expect(r).toHaveLength(1);
    expect(r[0].overlapMin).toBe(30);
  });
  it("back-to-back slots do not conflict", () => {
    expect(findOverlaps("15:00", 60, [{ appointment_time: "16:00", duration_minutes: 60 }])).toHaveLength(0);
  });
  it("ignores cancelled and no-show", () => {
    expect(findOverlaps("16:00", 60, [
      { appointment_time: "16:00", duration_minutes: 60, status: "cancelled" },
      { appointment_time: "16:00", duration_minutes: 60, status: "no_show" },
    ])).toHaveLength(0);
  });
  it("missing duration uses 50 min", () => {
    expect(findOverlaps("16:45", 30, [{ appointment_time: "16:00", duration_minutes: null }])[0].overlapMin).toBe(5);
  });
});

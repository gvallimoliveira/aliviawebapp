import { describe, it, expect } from "vitest";
import { endTimeFrom, durationBetween, assignLanes } from "@/lib/appointmentTime";

describe("appointment time", () => {
  it("08:00 + 540 min ends at 17:00", () => expect(endTimeFrom("08:00", 540)).toBe("17:00"));
  it("08:00–17:00 lasts 540 min", () => expect(durationBetween("08:00", "17:00")).toBe(540));
  it("rejects end before start", () => expect(durationBetween("17:00", "08:00")).toBeNull());
  it("overlapping items go side by side", () => {
    const l = assignLanes([
      { id: "curso", start: 480, end: 1020 },
      { id: "pac", start: 600, end: 650 },
      { id: "late", start: 1100, end: 1150 },
    ]);
    expect(l.get("curso")!.lanes).toBe(2);
    expect(l.get("pac")!.lane).toBe(1);
    expect(l.get("late")!.lanes).toBe(1);
  });
});
